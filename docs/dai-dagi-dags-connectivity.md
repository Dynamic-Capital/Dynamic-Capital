# DAI, DAGI, and DAGS Connectivity Reference

This note summarises how the Dynamic AI (DAI), Dynamic AGI (DAGI), and Dynamic AGS (DAGS) domains plug into the platform data plane, focusing on database coverage, OneDrive-linked datasets, and logging surfaces.

## Connectivity Matrix

| Domain | Supabase footprint | OneDrive / dataset access | Logging & telemetry |
| --- | --- | --- | --- |
| **DAI** | Tables: `routine_prompts`, `analyst_insights`, `user_analytics`. Functions: `analysis-ingest`, `analytics-collector`, `lorentzian-eval`, `web-app-analytics`. | Supabase exposes a foreign table over the OneDrive manifest so DAI workflows can read mirrored datasets from the same bucket that houses the shared `EvLuMLq…` folder. | Edge Functions capture research payloads, engagement analytics, Lorentzian evaluations, and product telemetry for replay and audits. |
| **DAGI** | Tables: `infrastructure_jobs`, `node_configs`, `mentor_feedback`. Functions: `ops-health`, `system-health`, `linkage-audit`, `intent`. | Shares the Supabase ↔ OneDrive sync pipeline, enabling AGI infrastructure jobs to pull or archive artefacts alongside DAI. | Health and intent functions persist operational logs to Supabase for oversight. |
| **DAGS** | Playbook mandates Supabase tables for `tasks`, `task_steps`, `approvals`, `artifacts`, `events`, and related audit stores. | No explicit OneDrive binding yet—AGS runbooks still need a dataset mirror or wrapper hookup. | Runbooks emphasise Supabase-based audit trails, structured logs, and metrics but stop short of registering OneDrive feeds. |

## Domain Notes

### Dynamic AI (DAI)
- The domain catalogue registers the `routine_prompts`, `analyst_insights`, and `user_analytics` tables together with the `analysis-ingest`, `analytics-collector`, `lorentzian-eval`, and `web-app-analytics` Edge Functions, keeping prompts, analyst narratives, and user telemetry inside Supabase.【F:dynamic_supabase/domain_catalogue.py†L70-L126】
- Supabase provisions an S3 wrapper and `one_drive_assets` foreign table, letting DAI jobs query mirrored OneDrive datasets (including the `EvLuMLqTtFRPpRS6OIWWvioBcFAJdDAXHZqN8bYy3JUyyg` share) directly from Postgres.【F:supabase/migrations/20251104090000_enable_s3_wrapper.sql†L1-L80】【F:docs/onedrive-shares/evlumlqt-folder.md†L1-L33】
- The extended integration playbook reiterates that dataset snapshots are mirrored between Supabase Storage and OneDrive and logged alongside inference artefacts, reinforcing the telemetry-first posture for DAI signals.【F:docs/dynamic-capital-extended-integration-playbook.md†L7-L60】【F:docs/dynamic-capital-extended-integration-playbook.md†L129-L140】

### Dynamic AGI (DAGI)
- DAGI’s domain entry defines Supabase tables for infrastructure jobs, node configurations, and mentor feedback plus the health and intent Edge Functions so orchestration data lands in the database by default.【F:dynamic_supabase/domain_catalogue.py†L128-L176】
- Because the Supabase ↔ OneDrive sync (and S3 wrapper manifest) is a shared platform capability, DAGI workloads can reuse the same mirrored datasets that DAI consumes for cross-domain coordination or archival needs.【F:supabase/migrations/20251104090000_enable_s3_wrapper.sql†L1-L80】【F:docs/dynamic-capital-extended-integration-playbook.md†L7-L60】
- The health-focused Edge Functions provide the logging hooks—`ops-health`, `system-health`, `linkage-audit`, and `intent`—needed to capture operational telemetry and intent envelopes inside Supabase for audits.【F:dynamic_supabase/domain_catalogue.py†L156-L176】

### Dynamic AGS (DAGS)
- The governance playbook prescribes Supabase for Auth/DB/Storage, outlines task/step/approval/artifact/audit tables, and ties workflows to Supabase-centric memory, observability, and sync patterns.【F:docs/dynamic-ags-playbook.md†L36-L177】
- Unlike DAI and DAGI, no documentation currently links DAGS pipelines to the OneDrive mirror or S3 wrapper, leaving dataset ingestion as a future integration item.【F:docs/dynamic-ags-playbook.md†L36-L177】
- Logging remains Supabase-native (structured JSON logs, metrics, and audit tables), so adding OneDrive-backed archives will require an explicit extension to the current runbooks.【F:docs/dynamic-ags-playbook.md†L156-L173】
