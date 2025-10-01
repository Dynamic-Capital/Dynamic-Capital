# DAI, DAGI, and DAGS Connectivity Implementation Checklist

Use this runbook when you stand up or refresh the Dynamic AI (DAI), Dynamic AGI
(DAGI), and Dynamic AGS (DAGS) domains. It captures the concrete actions
required to wire Supabase database assets, connect the mirrored OneDrive
datasets (`EvLuMLqTtFRPpRS6OIWWvioBcFAJdDAXHZqN8bYy3JUyyg`), and enable
telemetry so operators can audit the deployment.

## 1. Prepare Supabase foundation

- [ ] Target the correct Supabase project (e.g., export `SUPABASE_URL` and
      `SUPABASE_SERVICE_ROLE_KEY`).
- [ ] Apply all migrations that define the shared Supabase → OneDrive wrapper
      and the domain tables:
  - Run `supabase migration up --db-url "$SUPABASE_DB_URL"` to install the
    `enable_s3_wrapper` migration and related artefacts.
  - Re-run domain catalogue migrations to ensure the DAI/DAGI/DAGS tables and
    Edge Functions are registered.
- [ ] Reconcile edge functions via `supabase functions deploy <name>` for:
  - `analysis-ingest`, `analytics-collector`, `lorentzian-eval`,
    `web-app-analytics` (DAI)
  - `ops-health`, `system-health`, `linkage-audit`, `intent` (DAGI)

## 2. Configure dataset mirroring

- [ ] Confirm the S3-compatible credentials documented in the wrappers guide are
      available to the deployment automation.
- [ ] Execute the wrapper bootstrap script so the `one_drive_assets` foreign
      table can read the `EvLuMLq…` manifest from the mirrored OneDrive share.
- [ ] Populate DAI, DAGI, and DAGS dataset prefixes by pushing at least one
      manifest entry for each domain (for example `dai/prompts/*`,
      `dagi/orchestration/*`, and `dags/governance/*`).
- [ ] Verify the DAGS governance mirror appears in `public.one_drive_assets` and
      document the prefix used for downstream operators.

## 3. Enable telemetry and logging

- [ ] Ensure the Supabase log export or observability sink is enabled for Edge
      Function traffic (DAI/DAGI) and database triggers (DAGS).
- [ ] Verify the AGS governance tables (`tasks`, `task_steps`, `approvals`,
      `artifacts`, `events`) emit structured audit entries inside Supabase.
- [ ] Capture retention settings for analytics/event tables so historical
      investigations can replay DAI/DAGI traffic.

## 4. Verification gates

Run the following probes before handing the environment to operators:

- [ ] **Schema probe** – execute the `to_regclass` query from the connectivity
      reference to ensure the tables are present.
- [ ] **Edge Function inventory** – list deployed functions and confirm all
      eight DAI/DAGI handlers are active.
- [ ] **OneDrive manifest check** – query `public.one_drive_assets` to confirm
      mirrored artefacts exist for DAI, DAGI, and DAGS. Investigate immediately
      if any domain returns zero rows.
- [ ] **DAGS health smoke test** – invoke
      `supabase functions invoke
      dags-domain-health --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt`
      (or curl the deployed endpoint) and confirm the response includes a
      healthy `onedrive:mirror` entry plus a `metadata.sample` manifest object.
      This validates end-to-end connectivity from the health surface to the
      mirrored OneDrive
      share.【F:supabase/functions/dags-domain-health/index.ts†L40-L78】【F:supabase/functions/_shared/domain-health.ts†L101-L167】

## 5. Handover notes

Provide the following evidence in the deployment record:

- [ ] SQL output (or screenshot) demonstrating the schema probe succeeded.
- [ ] CLI output from `supabase functions list` showing the expected handlers.
- [ ] Sample rows from the OneDrive manifest query.
- [ ] Evidence that the DAGS governance mirror is populated (SQL output or
      manifest excerpt).

## Acceptance summary

Use this matrix to capture the status per domain before closing the task:

| Domain | Supabase tables | Edge Functions | OneDrive mirror | Logging & audits |
| ------ | --------------- | -------------- | --------------- | ---------------- |
| DAI    | [ ] Confirmed   | [ ] Confirmed  | [ ] Confirmed   | [ ] Confirmed    |
| DAGI   | [ ] Confirmed   | [ ] Confirmed  | [ ] Confirmed   | [ ] Confirmed    |
| DAGS   | [ ] Confirmed   | N/A (triggers) | [ ] Confirmed   | [ ] Confirmed    |

> **Note:** Keep the DAGS OneDrive column in sync with the connectivity
> reference by attaching manifest evidence for each deployment.
