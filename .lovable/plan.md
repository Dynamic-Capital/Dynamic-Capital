# Fix: Telegram bot "Failed to submit receipt" (401)

## Root cause

The Telegram bot calls the `receipt-submit` edge function with the service-role key as a Bearer token:

```ts
// supabase/functions/telegram-bot/index.ts (~L2543)
await fetch(`${SUPABASE_URL}/functions/v1/receipt-submit`, {
  headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  ...
});
```

`receipt-submit` is **not** listed in `supabase/config.toml`, so it deploys with the default `verify_jwt = true`. The project has migrated to the new Supabase JWT signing-keys system (note the `SUPABASE_SECRET_KEYS` and `SUPABASE_JWKS` secrets alongside the legacy `SUPABASE_SERVICE_ROLE_KEY`). The legacy service-role JWT bundled into the bot's edge env no longer validates against the new JWKS at the platform gateway — so every bot → `receipt-submit` call is rejected with **401 before the function body even runs**. That's why no logs appear for `receipt-submit` and the bot surfaces "Failed to submit receipt".

The function itself already authenticates callers in code via Telegram `initData` or an explicit `telegram_id` fallback, so platform JWT verification is redundant for this path.

## Plan

### 1. Disable platform JWT verification on receipt-related functions
Add to `supabase/config.toml`:
```toml
[functions.receipt-submit]
  verify_jwt = false

[functions.receipt-upload-url]
  verify_jwt = false

[functions.receipt]
  verify_jwt = false
```
This unblocks the bot immediately. The function still validates the caller via `initData` / Supabase session / `telegram_id`.

### 2. Harden the `telegram_id` fallback path
The current code trusts `telegram_id` from the body when no auth is present. With `verify_jwt=false` this becomes spoofable. Add a shared-secret check: when the request comes from the bot, require an `X-Telegram-Bot-Secret` header that matches a new secret (`TELEGRAM_BOT_INTERNAL_SECRET` or reuse `TELEGRAM_WEBHOOK_SECRET`). Update both:
- `supabase/functions/telegram-bot/index.ts` — send the header on the internal fetch
- `supabase/functions/receipt-submit/index.ts` — only honor the `telegram_id` fallback when the header matches; otherwise require valid `initData` or a Supabase session

### 3. Verify the fix
- Redeploy `receipt-submit` and `telegram-bot`
- Send a test receipt through the Telegram bot
- Check edge logs for `receipt-submit` — should see a 200 with the submission persisted in `receipts` and `payments`

### 4. (Recommended follow-up, not in this fix)
Rotate the bot's `SUPABASE_SERVICE_ROLE_KEY` env to the current signing-keys-issued service role key so other internal calls that still use Bearer auth keep working. Out of scope for the 401 fix but worth flagging.

## Files touched
- `supabase/config.toml` — add 3 `[functions.*]` blocks
- `supabase/functions/receipt-submit/index.ts` — internal-secret check on `telegram_id` fallback
- `supabase/functions/telegram-bot/index.ts` — send internal-secret header on the receipt-submit fetch
