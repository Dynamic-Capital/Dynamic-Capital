# DAI, DAGI, and DAGS Connectivity Reference

This note summarises how the Dynamic AI (DAI), Dynamic AGI (DAGI), and Dynamic
AGS (DAGS) domains plug into the platform data plane, focusing on three pillars:

- Database connectivity through Supabase tables and Edge Functions
- Dataset coverage through the mirrored OneDrive share
  ([`EvLuMLqTtFRPpRS6OIWWvioBcFAJdDAXHZqN8bYy3JUyyg`](https://1drv.ms/f/c/2ff0428a2f57c7a4/EvLuMLqTtFRPpRS6OIWWvioBcFAJdDAXHZqN8bYy3JUyyg?e=jT5qg0))
- Logging surfaces that record operational telemetry

| Domain   | Supabase coverage                       | OneDrive mirror                                 | Logging footprint                      |
| -------- | --------------------------------------- | ----------------------------------------------- | -------------------------------------- |
| **DAI**  | ✅ Tables and Edge Functions catalogued | ✅ Uses mirrored share via `one_drive_assets`   | ✅ Edge Function analytics feeds       |
| **DAGI** | ✅ Tables and Edge Functions catalogued | ✅ Reuses mirrored share via `one_drive_assets` | ✅ Orchestration health telemetry      |
| **DAGS** | ✅ Governance tables defined            | ✅ Mirror live via `one_drive_assets` manifest  | ✅ Structured audit trails in Supabase |

> Continue to audit the DAGS mirror during environment reviews so governance
> artefacts remain available through the shared manifest.

For the end-to-end tasks required to stand up these integrations, consult the
[DAI, DAGI, and DAGS Connectivity Implementation Checklist](./dai-dagi-dags-implementation-checklist.md).

## Connectivity Snapshot

- **DAI**
  - **Supabase footprint**: Tables `routine_prompts`, `analyst_insights`, and
    `user_analytics`; Edge Functions `analysis-ingest`, `analytics-collector`,
    `lorentzian-eval`, and `web-app-analytics` keep prompts, insights, and
    telemetry in Supabase.
  - **OneDrive datasets**: ✅ Supabase’s shared S3 wrapper exposes mirrored
    OneDrive manifests so DAI workflows can query the `EvLuMLq…` share directly
    from Postgres.
  - **Logging & telemetry**: Edge Functions capture research payloads,
    engagement analytics, Lorentzian evaluations, and product telemetry for
    replay and audits.
- **DAGI**
  - **Supabase footprint**: Tables `infrastructure_jobs`, `node_configs`, and
    `mentor_feedback`; Edge Functions `ops-health`, `system-health`,
    `linkage-audit`, and `intent` ensure orchestration data lands in the
    database.
  - **OneDrive datasets**: ✅ Reuses the Supabase ↔ OneDrive sync so AGI
    infrastructure jobs can pull or archive artefacts alongside DAI.
  - **Logging & telemetry**: Health and intent functions persist operational and
    intent envelopes to Supabase for oversight.
- **DAGS**
  - **Supabase footprint**: Playbook mandates tables for `tasks`, `task_steps`,
    `approvals`, `artifacts`, `events`, and related audit stores within
    Supabase.
- **OneDrive datasets**: ✅ Governance artefacts sync to the
  `EvLuMLqTtFRPpRS6OIWWvioBcFAJdDAXHZqN8bYy3JUyyg` share through the shared
  `one_drive_assets` manifest, keeping the DAGS mirror aligned with Supabase
  Storage. The `dags-domain-health` function now surfaces a sample manifest
  object so smoke tests can confirm connectivity from the Edge Function to the
  mirrored
  share.【F:supabase/functions/dags-domain-health/index.ts†L40-L78】【F:supabase/migrations/20251104090000_enable_s3_wrapper.sql†L1-L97】
- **Logging & telemetry**: Runbooks emphasise Supabase-based audit trails,
  structured logs, and metrics with mirrored artefacts preserved in OneDrive for
  redundancy.【F:docs/dynamic-ags-playbook.md†L145-L173】【F:supabase/functions/dags-domain-health/index.ts†L66-L78】

## Knowledge Base Health Snapshot — November 2025 refresh

| Domain | Coverage status | Accuracy sample | Telemetry freshness |
| ------ | --------------- | --------------- | ------------------- |
| **DAI** | 60 / 60 catalogue objects present (100%) | 97 / 100 artefacts passing review (97%) | Last probe 6h ago; 0 failed checks |
| **DAGI** | 55 / 56 objects present (98.2%) | 90 / 96 artefacts passing review (93.8%) | Last probe 9h ago; 0 failed checks |
| **DAGS** | 53 / 55 objects present (96.4%) | 88 / 92 artefacts passing review (95.7%) | Last probe 8h ago; 0 failed checks |

These figures reflect the latest merged benchmark payload and demonstrate that
the recent curation pass closed the remaining coverage gaps for DAI while
raising DAGI and DAGS accuracy into the target `B+` band. Regenerate the
letter-grade view after future updates by running `python
scripts/run_knowledge_base_benchmark.py --config benchmarks/dai-dagi-dags.json`
so operators can track remediation progress alongside the connectivity probes.
【F:benchmarks/dai-dagi-dags.json†L1-L18】【F:scripts/run_knowledge_base_benchmark.py†L1-L104】

## Domain Notes

### Dynamic AI (DAI)

- The domain catalogue registers the `routine_prompts`, `analyst_insights`, and
  `user_analytics` tables together with the `analysis-ingest`,
  `analytics-collector`, `lorentzian-eval`, and `web-app-analytics` Edge
  Functions, keeping prompts, analyst narratives, and user telemetry inside
  Supabase.【F:dynamic_supabase/domain_catalogue.py†L70-L126】
- Supabase provisions an S3 wrapper and `one_drive_assets` foreign table,
  letting DAI jobs query mirrored OneDrive datasets (including the
  `EvLuMLqTtFRPpRS6OIWWvioBcFAJdDAXHZqN8bYy3JUyyg` share) directly from
  Postgres.【F:supabase/migrations/20251104090000_enable_s3_wrapper.sql†L1-L80】【F:docs/onedrive-shares/evlumlqt-folder.md†L1-L33】
- The extended integration playbook reiterates that dataset snapshots are
  mirrored between Supabase Storage and OneDrive and logged alongside inference
  artefacts, reinforcing the telemetry-first posture for DAI
  signals.【F:docs/dynamic-capital-extended-integration-playbook.md†L7-L60】【F:docs/dynamic-capital-extended-integration-playbook.md†L129-L140】

### Dynamic AGI (DAGI)

- DAGI’s domain entry defines Supabase tables for infrastructure jobs, node
  configurations, and mentor feedback plus the health and intent Edge Functions
  so orchestration data lands in the database by
  default.【F:dynamic_supabase/domain_catalogue.py†L128-L176】
- Because the Supabase ↔ OneDrive sync (and S3 wrapper manifest) is a shared
  platform capability, DAGI workloads can reuse the same mirrored datasets that
  DAI consumes for cross-domain coordination or archival
  needs.【F:supabase/migrations/20251104090000_enable_s3_wrapper.sql†L1-L80】【F:docs/dynamic-capital-extended-integration-playbook.md†L7-L60】
- The health-focused Edge Functions provide the logging hooks—`ops-health`,
  `system-health`, `linkage-audit`, and `intent`—needed to capture operational
  telemetry and intent envelopes inside Supabase for
  audits.【F:dynamic_supabase/domain_catalogue.py†L156-L176】

### Dynamic AGS (DAGS)

- The governance playbook prescribes Supabase for Auth/DB/Storage, outlines
  task/step/approval/artifact/audit tables, and ties workflows to
  Supabase-centric memory, observability, and sync
  patterns.【F:docs/dynamic-ags-playbook.md†L36-L177】
- The shared memory guidance now codifies the OneDrive mirror alongside Supabase
  Storage, making the `EvLuMLqTtFRPpRS6OIWWvioBcFAJdDAXHZqN8bYy3JUyyg` share
  part of the governance backup
  posture.【F:docs/dynamic-ags-playbook.md†L104-L173】
- Logging remains Supabase-native (structured JSON logs, metrics, and audit
  tables) with mirrored artefacts captured for long-term recall across both
  storage
  surfaces.【F:docs/dynamic-ags-playbook.md†L145-L173】【F:supabase/functions/dags-domain-health/index.ts†L66-L78】

## Connection Verification Checklist

Use the following steps to confirm the database, dataset, and telemetry wiring
for each domain whenever you promote a new environment or audit the shared
infrastructure.

### 1. Supabase schema

Run a quick `psql` probe to ensure the baseline tables for every domain have
been created. Successful output echoes each relation name; `NULL` signals a
missing migration that needs to be applied.

```sql
select
  to_regclass('public.routine_prompts')   as dai_routine_prompts,
  to_regclass('public.analyst_insights')  as dai_analyst_insights,
  to_regclass('public.infrastructure_jobs') as dagi_infrastructure_jobs,
  to_regclass('public.node_configs')        as dagi_node_configs,
  to_regclass('public.tasks')               as dags_tasks,
  to_regclass('public.task_steps')          as dags_task_steps;
```

DAI and DAGI rely on the catalogued Supabase blueprints, while the DAGS playbook
defines the governance tables referenced above, so all entries should resolve to
their `public.*` names in a healthy
deployment.【F:dynamic_supabase/domain_catalogue.py†L70-L140】【F:dynamic_supabase/domain_catalogue.py†L142-L176】【F:docs/dynamic-ags-playbook.md†L145-L169】

### 2. Edge Function coverage

List the deployed Supabase Edge Functions and verify the domain-specific
handlers are active:

```bash
supabase functions list | grep -E 'analysis-ingest|analytics-collector|lorentzian-eval|web-app-analytics|ops-health|system-health|linkage-audit|intent'
```

You should see the four DAI collectors and the four DAGI orchestration endpoints
registered; AGS currently leans on database triggers and will gain an explicit
Edge Function set once the mirror integration
lands.【F:dynamic_supabase/domain_catalogue.py†L82-L138】【F:dynamic_supabase/domain_catalogue.py†L142-L176】【F:docs/dynamic-ags-playbook.md†L156-L173】

### 3. OneDrive mirror availability

Confirm the S3 wrapper can surface the mirrored OneDrive manifest and check for
domain artefacts:

```sql
select object_key, last_modified
from public.one_drive_assets
order by object_key
limit 10;
```

Expect entries aligned with each domain's dataset prefix; scope the query with
`ILIKE 'dai/%'`, `ILIKE 'dagi/%'`, or `ILIKE 'dags/%'` if prefixes are
standardised. Treat an empty DAGS result as an incident requiring investigation
into the OneDrive sync or governance manifest health so the mirror stays
authoritative.【F:supabase/migrations/20251104090000_enable_s3_wrapper.sql†L60-L97】【F:apps/web/integrations/wrappers/index.ts†L44-L115】【F:supabase/functions/dags-domain-health/index.ts†L40-L78】

If the SQL probe fails (e.g., missing foreign table), rerun the wrapper
migration and double-check the S3-compatible credentials documented in the
wrappers integration guide before retrying the manifest
query.【F:docs/WRAPPERS_INTEGRATION.md†L1-L78】

### 4. DAGS health smoke test

Exercise the `dags-domain-health` Edge Function to ensure the deployed endpoint
can query the mirrored OneDrive share end-to-end:

```bash
supabase functions invoke dags-domain-health \
  --project-ref "$SUPABASE_PROJECT_REF" \
  --no-verify-jwt
```

Inspect the JSON response for an `onedrive:mirror` entry with `status` set to
`healthy` (or `error` if the manifest is empty) and a `metadata.sample`
containing an `object_key`/`last_modified` pair. That payload confirms the smoke
test successfully reached the mirrored DAGS artefacts through
Supabase.【F:supabase/functions/dags-domain-health/index.ts†L40-L78】【F:supabase/functions/_shared/domain-health.ts†L101-L167】

## Integration Gaps and Follow-ups

- **Cross-domain dataset catalogue** – DAI and DAGI leverage the same mirrored
  share; consider publishing a catalogue or schema registry so future domains
  (including DAGS) can discover the datasets already curated in
  OneDrive.【F:docs/dynamic-capital-extended-integration-playbook.md†L7-L60】
- **Mirror health automation** – Extend health checks so DAI, DAGI, and DAGS
  mirrors remain observable and alert when manifest queries return empty
  results.【F:supabase/functions/dai-domain-health/index.ts†L40-L63】【F:supabase/functions/dagi-domain-health/index.ts†L40-L63】【F:supabase/functions/dags-domain-health/index.ts†L40-L78】
