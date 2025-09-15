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
3. Run `deno run -A scripts/set-webhook.ts` (or `deno task set:webhook`) to register the new
   webhook URL and secret.

## Mini App initData validation

Mini App sessions must be verified server-side. The `verify-initdata` function
computes the HMAC-SHA256 signature as described in the Telegram spec and rejects
invalid payloads with `401`. Rotate the bot token or secret if verification
fails consistently.

## OpenAI Webhook

The `openai-webhook` function receives event callbacks from OpenAI. Every
request includes an `OpenAI-Signature` header containing an HMAC-SHA256 digest
of the raw body signed with `OPENAI_WEBHOOK_SECRET`. Requests with missing or
invalid signatures are rejected with `401`.

Register the webhook in the OpenAI dashboard using your Supabase Functions URL:

```
${SUPABASE_URL}/functions/v1/openai-webhook
```

Replace `SUPABASE_URL` with your project's base URL; OpenAI will POST events to
this endpoint.

### Rotating the secret

1. Update `OPENAI_WEBHOOK_SECRET` in the environment.
2. Re-deploy the function (`supabase functions deploy openai-webhook`).
3. Update the webhook endpoint in the OpenAI dashboard with the same secret.

