# DAI, DAGI, and DAGS Connectivity Reference

This note summarises how the Dynamic AI (DAI), Dynamic AGI (DAGI), and Dynamic
AGS (DAGS) domains plug into the platform data plane, focusing on three pillars:

1. **Database connectivity** through Supabase tables and Edge Functions
2. **Dataset coverage** through the mirrored OneDrive share
   (`EvLuMLqTtFRPpRS6OIWWvioBcFAJdDAXHZqN8bYy3JUyyg`)
3. **Logging surfaces** that record operational telemetry

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
  - **OneDrive datasets**: ⚠️ No documented binding yet—AGS runbooks still need
    a dataset mirror or wrapper hookup before OneDrive assets are accessible.
  - **Logging & telemetry**: Runbooks emphasise Supabase-based audit trails,
    structured logs, and metrics but stop short of registering OneDrive feeds.

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
- Unlike DAI and DAGI, no documentation currently links DAGS pipelines to the
  OneDrive mirror or S3 wrapper, leaving dataset ingestion as a future
  integration item.【F:docs/dynamic-ags-playbook.md†L36-L177】
- Logging remains Supabase-native (structured JSON logs, metrics, and audit
  tables), so adding OneDrive-backed archives will require an explicit extension
  to the current runbooks.【F:docs/dynamic-ags-playbook.md†L156-L173】

## Integration Gaps and Follow-ups

- **DAGS OneDrive adoption** – The governance runbooks capture audit logging but
  never mention the S3 wrapper or OneDrive mirrors. Confirm whether AGS needs
  read-only access to existing datasets or a bespoke mirror before wiring it
  into the shared foreign table.【F:docs/dynamic-ags-playbook.md†L36-L177】
- **Cross-domain dataset catalogue** – DAI and DAGI leverage the same mirrored
  share; consider publishing a catalogue or schema registry so future domains
  (including DAGS) can discover the datasets already curated in
  OneDrive.【F:docs/dynamic-capital-extended-integration-playbook.md†L7-L60】
