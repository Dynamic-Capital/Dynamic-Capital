# DAI, DAGI, and DAGS Connectivity Implementation Checklist

Use this runbook when you stand up or refresh the Dynamic AI (DAI), Dynamic AGI (DAGI),
and Dynamic AGS (DAGS) domains. It captures the concrete actions required to
wire Supabase database assets, connect the mirrored OneDrive datasets
(`EvLuMLqTtFRPpRS6OIWWvioBcFAJdDAXHZqN8bYy3JUyyg`), and enable telemetry so
operators can audit the deployment.

## 1. Prepare Supabase foundation

- [ ] Target the correct Supabase project (e.g., export `SUPABASE_URL` and
      `SUPABASE_SERVICE_ROLE_KEY`).
- [ ] Apply all migrations that define the shared Supabase → OneDrive wrapper and
      the domain tables:
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
- [ ] Populate DAI and DAGI dataset prefixes by pushing at least one manifest
      entry for each domain (for example `dai/prompts/*` and
      `dagi/orchestration/*`).
- [ ] Record that DAGS remains pending for OneDrive ingestion; flag the
      integration backlog item if a mirror is required for the environment you
      are setting up.

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
      mirrored artefacts exist for DAI and DAGI. Treat non-empty DAGS results as
      a signal that the backlog item has landed and the documentation must be
      updated.

## 5. Handover notes

Provide the following evidence in the deployment record:

- [ ] SQL output (or screenshot) demonstrating the schema probe succeeded.
- [ ] CLI output from `supabase functions list` showing the expected handlers.
- [ ] Sample rows from the OneDrive manifest query.
- [ ] Confirmation that the AGS mirror remains pending (or, if available, the
      steps used to enable it so the playbook can be amended).

## Acceptance summary

Use this matrix to capture the status per domain before closing the task:

| Domain | Supabase tables | Edge Functions | OneDrive mirror | Logging & audits |
| ------ | ---------------- | -------------- | --------------- | ---------------- |
| DAI    | [ ] Confirmed    | [ ] Confirmed  | [ ] Confirmed   | [ ] Confirmed    |
| DAGI   | [ ] Confirmed    | [ ] Confirmed  | [ ] Confirmed   | [ ] Confirmed    |
| DAGS   | [ ] Confirmed    | N/A (triggers) | Pending         | [ ] Confirmed    |

> **Note:** Update the DAGS OneDrive column once the mirror backlog item is
> completed and refresh the connectivity reference at the same time.
