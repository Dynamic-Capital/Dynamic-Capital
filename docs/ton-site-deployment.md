# TON Site Deployment Runbook

This playbook documents how to build, validate, and deploy the Dynamic Capital
TON Site bundle that powers `dynamiccapital.ton`. Follow it whenever the origin
infrastructure (DigitalOcean App Platform) is refreshed or when cutovers between
gateways occur.

## Prerequisites

- Access to the DigitalOcean App Platform app
  `dynamic-capital-qazf2.ondigitalocean.app`.
- Permissions to trigger GitHub workflows on `main`.
- Supabase credentials capable of writing to the `tx_logs` table and invoking
  edge functions.
- Node.js 20+, npm 11+, and the repository checked out locally.

## Build and preflight checks

1. Install dependencies and produce a fresh Next.js build for the web app:

   ```bash
   npm install
   npm run build:web
   ```

2. Run the automated pre-deployment verifier to ensure the TON Site route is
   compiled, required assets exist under `apps/web/public/ton-static`, and the
   upstream origin is ready to serve HTTP 200:

   ```bash
   npm run ton:predeploy-verify
   ```

   The script reads `dns/dynamiccapital.ton.json` for the upstream origin and
   exits non-zero if any preflight fails.

   > **Tip:** After running `npm run build:web`, you can launch the production
   > bundle locally via `npm run start:do` and confirm
   > `http://127.0.0.1:3000/dynamiccapital.ton` returns `HTTP 200` before
   > pushing the update to DigitalOcean.

3. Capture the verification output and attach it to the deployment ticket or
   incident for traceability.

## Deployment workflow

1. **Primary path – GitHub integration.** Push the approved changes to `main`.
   The DigitalOcean App Platform GitHub integration automatically triggers a new
   deployment. Confirm the app logs show the commit SHA and that the build
   completed successfully.
2. **Fallback – Manual redeploy.** If the automatic trigger fails, open the
   DigitalOcean dashboard, select the `dynamic-capital-qazf2` app, and start a
   manual deploy from the latest container image. Keep the automatic trigger
   enabled once the incident ends.
3. **Notifications.** Configure DigitalOcean deployment alerts (email/Slack) so
   the operations team receives confirmation when the app publishes. Document
   the notification recipients in the operations playbook.

## Post-deployment validation

1. Re-run `npm run ton:site-status -- --domain dynamiccapital.ton` to verify the
   gateways and origin report HTTP 200.
2. Capture screenshots of the live site via both the primary and fallback
   gateways.
3. Insert a record into Supabase `tx_logs` describing the deployment, including
   the commit hash, deployment actor, and health-check summary.

## Emergency restoration runbook

1. If the GitHub Action or Supabase alerts indicate downtime, execute
   `npm run ton:predeploy-verify -- --origin https://dynamic-capital-qazf2.ondigitalocean.app`
   locally to validate the bundle status.
2. If the origin responds with a failure, rebuild (`npm run build:web`) and use
   the DigitalOcean dashboard to redeploy the static bundle.
3. Once the origin is healthy, validate the gateways with
   `npm run ton:site-status -- --domain dynamiccapital.ton`.
4. Update `dns/dynamiccapital.ton.json`,
   `dns/https-gateway-verification-2025-10-08.md`, and
   `dns/ton-dns-operations-log.md` with the new status.
5. Log the incident and remediation steps in the operations playbook and in
   Supabase `tx_logs`.

## Monitoring linkage

- `.github/workflows/ton-site-status.yml` performs scheduled health checks.
- Supabase edge functions should forward failed probes to the alerts channel.
- Maintain a rolling 30-day uptime calculation inside `tx_logs` to back any
  public status communication.

Following this runbook keeps the TON gateways aligned with the DigitalOcean
origin and ensures the on-chain resolver always reflects a healthy bundle.
