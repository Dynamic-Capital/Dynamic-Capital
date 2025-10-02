# Go-Live Validation Playbook

Use this guide to walk through the outstanding launch blockers that remain on
the [Dynamic Capital checklist](./dynamic-capital-checklist.md). Each section is
structured as a mini-runbook so operators can collect evidence, unblock missing
prerequisites, and record results alongside their PR or release notes.

## Prerequisites

1. **Supabase project access** – You need a project ref with the Dynamic Capital
   schema deployed and the following secrets set:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`
   - `ADMIN_API_SECRET` (for privileged admin commands)
2. **Telegram bot ownership** – Ensure you can DM the production bot as both a
   normal user and an admin (the admin account must appear in `bot_admins`).
3. **CLI tooling** – Install Deno (for scripts) and the Supabase CLI. Export any
   secrets in your shell before running the commands below.
4. **Mini app content** – Verify `MINI_APP_URL` _or_ `MINI_APP_SHORT_NAME` is
   set so `/start` can present the launch button during manual checks.

> [!TIP]
> When network access is unavailable, capture API responses in JSON fixtures and
> point scripts at them with helper variables such as
> `TELEGRAM_WEBHOOK_INFO_PATH`. When `scripts/check-webhook.ts` runs inside the
> repository and no token is available, it automatically falls back to the
> bundled `fixtures/telegram-webhook-info.json` sample so the checklist can
> progress offline.

> [!NOTE]
> The `scripts/check-webhook.ts` helper also pings the `/version` liveness
> endpoint using `TELEGRAM_WEBHOOK_HEALTH_URL`, `TELEGRAM_WEBHOOK_URL`, or the
> webhook URL reported by Telegram. Override the derived URL by exporting
> `TELEGRAM_WEBHOOK_HEALTH_URL`.

## 1. Telegram webhook health

1. Export `TELEGRAM_BOT_TOKEN` and run the webhook checker:
   ```bash
   deno run -A scripts/check-webhook.ts
   ```
   Expected output: the deployed Functions URL, `pending_update_count`, and the
   absence of `last_error_message`.
2. If direct Telegram access is blocked, capture the result of
   `https://api.telegram.org/bot<token>/getWebhookInfo` to a file and re-run the
   checker with:
   ```bash
   TELEGRAM_WEBHOOK_INFO_PATH=fixtures/telegram-webhook-info.json \
     deno run -A scripts/check-webhook.ts
   ```
3. Hit the lightweight health probe to confirm Supabase is serving the
   `telegram-webhook` function:
   ```bash
   curl -s https://<PROJECT_REF>.functions.supabase.co/telegram-webhook/version
   ```
   Expect `200 OK` with the function name and timestamp.

Record the webhook URL and any Telegram errors in the release notes.

## 2. Bank approvals – happy path

Goal: submitting a clean receipt should mark the user as VIP.

1. Create or reuse a test user inside Telegram and make sure they can launch the
   mini app (Telegram menu → Dynamic Capital).
2. From the mini app or via API, create a checkout session:
   ```bash
   curl -s "https://<PROJECT>.functions.supabase.co/checkout-init" \
     -H "Content-Type: application/json" \
     -d '{"plan_id":"<PLAN_UUID>","method":"bank_transfer","initData":"<INIT_DATA>"}'
   ```
   Capture the returned `payment_id`.
3. Request an upload URL and push a sample receipt (PNG/JPEG). The helper script
   in `docs/PHASE_03_CHECKOUT.md` shows the expected payload. Upload the file to
   the presigned URL returned in the previous step.
4. Submit the receipt for review:
   ```bash
   curl -s "https://<PROJECT>.functions.supabase.co/receipt-submit" \
     -H "Content-Type: application/json" \
     -d '{"payment_id":"<PAYMENT_ID>","file_path":"<SIGNED_PATH>","initData":"<INIT_DATA>"}'
   ```
5. Run the auto-review job (if not scheduled) to approve clean receipts:
   ```bash
   curl -s "https://<PROJECT>.functions.supabase.co/payments-auto-review" \
     -H "X-Admin-Secret: $ADMIN_API_SECRET" -d '{}'
   ```
6. Inspect `current_vip` for the Telegram ID:
   ```sql
   select is_vip, subscription_expires_at
   from current_vip
   where telegram_id = '<TELEGRAM_ID>';
   ```

Attach the SQL output proving `is_vip = true` for audit logs.

## 3. Bank approvals – near miss

Goal: an out-of-band receipt lands in `manual_review` with a clear reason.

1. Repeat the checkout flow above but submit a mismatched amount. A simple
   method is to edit the `expected_amount` in Supabase (or upload a receipt with
   a different total) before invoking `payments-auto-review`.
2. After the review job runs, confirm the payment intent moved to
   `manual_review`:
   ```sql
   select payment_status, manual_review_reason
   from user_subscriptions
   where telegram_user_id = '<TELEGRAM_ID>';
   ```
3. Document the reason (for example `amount_mismatch`) and confirm the VIP view
   still reports `is_vip = false`.

## 4. Duplicate receipt safeguard

Goal: a second upload for the same payment ID is rejected.

1. Reuse the happy-path payment intent from §2 (or create a new one) and submit
   the first receipt using the `/receipt-submit` endpoint. Capture the returned
   payload or the log output confirming the receipt was accepted.
2. Attempt a second submission for the same `payment_id` with a different file
   path:
   ```bash
   curl -s "https://<PROJECT>.functions.supabase.co/receipt-submit" \
     -H "Content-Type: application/json" \
     -d '{"payment_id":"<PAYMENT_ID>","file_path":"<DUPLICATE_PATH>","initData":"<INIT_DATA>"}'
   ```
3. Expect an error response (HTTP `409` with `duplicate_receipt` in the body).
   If the API returns a success payload, inspect the function logs and Supabase
   storage bucket to confirm only the original upload exists, then file a bug.

Record the rejection response so auditors can see the safeguard working.

## 5. Crypto TXID confirmations (if enabled)

Goal: pending crypto deposits stay blocked until confirmations arrive.

1. Create a crypto payment intent:
   ```bash
   curl -s "https://<PROJECT>.functions.supabase.co/intent" \
     -H "Content-Type: application/json" \
     -d '{"initData":"<INIT_DATA>","type":"crypto"}'
   ```
   Note the returned `pay_code` or deposit address.
2. Submit a placeholder TXID:
   ```bash
   curl -s "https://<PROJECT>.functions.supabase.co/crypto-txid" \
     -H "Content-Type: application/json" \
     -d '{"txid":"<PENDING_TXID>","initData":"<INIT_DATA>"}'
   ```
3. Verify the payment remains `pending` in Supabase until the blockchain
   confirms the TXID (or you mark it approved manually for testing). Record the
   transition to `approved` with timestamps once confirmations arrive.

## 6. Admin command smoke test

Goal: privileged commands respond for operations staff.

1. From an admin Telegram account, send the following commands to the bot and
   verify the responses:
   - `/ping` – returns `{ "pong": true }`.
   - `/version` – includes the deployed bot version string.
   - `/env` – lists required environment settings (redacted where necessary).
   - `/reviewlist` – enumerates pending manual reviews.
   - `/admin` – returns the dashboard deep link with a signed token.
2. Optional but recommended:
   - `/webhookinfo` to mirror the scripted webhook check.
   - `/vipsync <telegram_id>` to trigger a single-user VIP recomputation.
   - `/flags` to confirm the feature flag manager loads.
3. Capture screenshots or chat exports demonstrating successful responses.

Checking off this section ensures the Telegram runtime is wired for operations
handover.

---

After completing each section, update
[`docs/GO_LIVE_CHECKLIST.md`](./GO_LIVE_CHECKLIST.md) and link evidence in the
release or PR description so auditors can trace every validation step.
