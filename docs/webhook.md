# Telegram Webhook Runbook

## JWT verification

The `telegram-webhook` edge function runs with `verify_jwt = false` in
`supabase/config.toml`. Telegram does not sign requests with Supabase JWTs, so
JWT checks would reject legitimate webhook deliveries. Instead, Telegram includes
our shared secret in the `X-Telegram-Bot-Api-Secret-Token` header
([docs](https://core.telegram.org/bots/api#setwebhook)). The function validates
this header for every request, so disabling JWT verification is safe.

## Rotating the secret

1. Update the `TELEGRAM_WEBHOOK_SECRET` in the environment or database.
2. Re-deploy the function (`supabase functions deploy telegram-webhook --no-verify-jwt`).
3. Run `npx tsx scripts/set-telegram-webhook.ts` to register the new webhook URL and
   secret.

## Mini App initData validation

Mini App sessions must be verified server-side. The `verify-initdata` function
computes the HMAC-SHA256 signature as described in the Telegram spec and rejects
invalid payloads with `401`. Rotate the bot token or secret if verification
fails consistently.

