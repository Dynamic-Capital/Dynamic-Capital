# Secret Rotation Playbook

This guide outlines the immediate response when a credential leaks publicly.
Follow the quick-reference table first, then work through the detailed
procedures for each secret.

## Quick reference

| Secret                                                  | Where it lives                                                                           | Rotate via                                                                                        | Post-rotation verification                                                                      |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Telegram bot token (`TELEGRAM_BOT_TOKEN`)               | Telegram BotFather, deployment secrets, Supabase Edge Function env vars                  | BotFather `/revoke` + `/token`; update secret managers; redeploy webhook                          | `supabase functions logs telegram-webhook` shows successful auth; mini-app responds to `/start` |
| Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`) | Supabase project API settings, Supabase CLI secret store, infrastructure secret managers | Supabase dashboard → **Reset service_role key**; rotate stored values; redeploy affected services | `supabase secrets list` shows new timestamp; server logs free of auth failures                  |

---

## 2025-05-08 incident summary

- **Trigger**: GitHub secret scanning reported a leaked Telegram bot token and a
  Supabase service-role key stored under `external/…` paths.
- **Immediate actions**:
  - Revoked the exposed Telegram token via BotFather and issued a replacement.
  - Reset the Supabase service-role key from the project dashboard and updated
    managed secret stores.
  - Purged the leaked values from the repository and added automated guards to
    prevent similar patterns from re-entering version control.
- **Follow-up tasks**:
  - Redeploy Supabase Edge Functions using the refreshed secrets.
  - Run `supabase functions logs telegram-webhook --since 10m` to confirm 200
    responses.
  - Capture any remaining references by running
    `git log -S"<revoked-fragment>" --stat` and force-pushing cleansed branches
    if necessary.

Use the rotation runbooks below whenever a new leak is reported.

## Telegram bot token rotation

### When to trigger

- The token appears in logs, screenshots, commits, or third-party scanners.
- BotFather reports that a token has been revoked unexpectedly.

### Step-by-step

1. **Invalidate the leaked token**
   - DM [BotFather](https://t.me/BotFather) and run `/revoke` against the
     impacted bot.
   - Immediately request a replacement with `/token`; copy the new token into a
     secure clipboard manager.
2. **Propagate the new token**
   - Update shared secret storage (e.g., 1Password vault entry or platform
     secret store).
   - Run `scripts/setup-telegram-webhook.sh` locally with the new token to
     refresh the Supabase Edge Function configuration.
   - Execute `supabase functions deploy telegram-webhook` to publish the updated
     secret to production.
3. **Validate**
   - Call `supabase functions logs telegram-webhook --since 10m` and confirm
     `401` responses stop.
   - From a staging chat, run `/start` and verify that the bot responds without
     error.

### Clean-up

- Purge the revoked token from chat transcripts and ticket descriptions.
- Replace example values in documentation with neutral placeholders (see
  `.env.example`).

---

## Supabase service role key rotation

### When to trigger

- Supabase dashboard flags suspicious activity or you observe unexpected
  row-level access.
- The key is exposed in telemetry, CI logs, or static configuration files.

### Step-by-step

1. **Reset the key**
   - Navigate to **Project Settings → API** inside the Supabase dashboard.
   - Click **Reset service_role key** and confirm the action; download the newly
     generated key once.
2. **Update dependent systems**
   - Store the key in your central secret manager and update
     `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SERVICE_ROLE` entries.
   - Refresh local development environments by copying the new value into
     `.env.local` (do **not** commit it).
   - Push the secret to Supabase Edge Functions with
     `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...`.
   - Trigger redeployments for services that embed the key (e.g.,
     `supabase functions deploy --all`).
3. **Validate**
   - Run `supabase secrets list` and confirm the `Updated` timestamp matches the
     rotation time.
   - Monitor application logs for failed Supabase requests; retry any jobs that
     may have run during the rotation.

### Clean-up

- Use `git log -S "<leaked-key-fragment>"` to identify commits that referenced
  the leaked key and scrub them.
- If the key entered Git history, follow the
  [GitHub credential scanning remediation](https://docs.github.com/en/code-security/secret-scanning/troubleshooting/removing-sensitive-data-from-a-repository)
  guide to rewrite history.

---

## Incident communications

- File an incident report summarizing the leak, the rotation timestamps, and
  monitoring checkpoints.
- Notify on-call engineers and relevant product owners so they can watch for
  residual errors.
- Schedule a post-incident review to capture lessons learned and preventive
  controls.

---

## Post-rotation checklist

- [ ] New secrets stored in password manager / secret store.
- [ ] Supabase Edge Functions redeployed.
- [ ] Webhook endpoints tested successfully.
- [ ] Repository scrubbed of leaked values.
- [ ] Stakeholders informed and follow-up actions tracked.

Keeping this checklist handy shortens response times and helps avoid repeated
credential exposure incidents.
