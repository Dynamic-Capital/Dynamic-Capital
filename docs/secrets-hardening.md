# Secrets Hardening Playbook

This playbook describes concrete steps to patch and prevent sensitive
configuration leaks across the Dynamic Capital stack. Follow it whenever a
credential is rotated, a new integration is added, or an incident response is
required.

## 1. Contain & Rotate
1. **Identify affected services** using the inventories in `.env.example` and
   `env/env.map.json`.
2. **Invalidate exposed keys immediately** (revoke tokens, rotate API keys,
   regenerate webhook secrets).
3. **Update upstream providers** (Supabase, Telegram, Binance Pay, OpenAI,
   DigitalOcean, GitHub, etc.) with newly generated credentials.
4. **Record rotation details** (timestamp, owner, scope) in the internal
   security log or ticketing system.

## 2. Propagate Securely
1. **Load new values into secrets managers** only—Vercel project settings,
   Supabase Edge Function secrets, DigitalOcean App Platform, GitHub Actions,
   or infrastructure parameter stores.
2. **Avoid `.env` distribution via chat or email**; share through the
   approved secret manager or password vault.
3. **Trigger redeployments** so new values reach every runtime (Next.js apps,
   Edge Functions, MT5 bridge workers).

## 3. Validate Deployment
1. **Run smoke tests** for affected features (authentication, Telegram bot,
   payments, AI tooling) after redeploying.
2. **Confirm monitoring signals** (Sentry, PostHog, Supabase logs) show healthy
   status.
3. **Remove temporary debug logging** or emergency switches added during the
   rotation.

## 4. Prevent Recurrence
1. **Automate detection** with repository secret scanning (e.g. GitHub Advanced
   Security) and CI checks.
2. **Enforce least privilege**—scope API keys to the minimal required
   permissions and environments.
3. **Review access regularly**; revoke credentials for inactive team members.
4. **Document new integrations** in `docs/secrets-checklist.md` and update the
   inventory whenever variables move between services.

## 5. Incident Review
1. **Capture a post-incident report** detailing root cause, mitigation steps,
   and outstanding actions.
2. **Update runbooks and onboarding docs** with lessons learned.
3. **Schedule follow-up audits** to ensure recommendations were implemented.

Following this playbook keeps sensitive configuration out of source control,
reduces response time during incidents, and ensures every runtime receives the
correctly rotated credentials.
