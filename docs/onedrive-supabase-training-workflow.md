# OneDrive + Supabase Training Workflow

This playbook outlines the recommended way to connect Microsoft OneDrive storage
to Dynamic Capital's Supabase-centric data platform so the Dynamic AI (DAI)
training agents can consume curated datasets reliably.

## 1. Prepare Microsoft Graph Access

- [ ] Register an Azure AD application with delegated permissions for `Files.Read.All` and `offline_access`.
- [ ] Capture the client ID, tenant ID, and client secret in your local secrets store (never commit these values; add placeholders to `.env.example` if needed).
- [ ] Implement a short-lived token acquisition helper (MSAL is recommended) that refreshes silently when the access token expires.

## 2. Standardize the OneDrive Layout

- [ ] Create a top-level `/DynamicCapital/ai-training` folder with subdirectories for `datasets`, `model-checkpoints`, `etl-staging`, and `reports`.
- [ ] Version datasets by date or semantic version (for example `datasets/market/2024-06-01`). Store raw CSV/JSON files plus a `README.md` describing schema and provenance.
- [ ] Maintain checkpoint metadata (framework, commit hash, hyperparameters) alongside weight files under `model-checkpoints/<model>/<run-id>/`.

## 3. Build the ETL Ingest Layer

- [ ] Create a `tools/onedrive_sync.ts` script that:
  - [ ] Queries the Graph API for new or updated files since the last sync
        cursor.
  - [ ] Downloads files into `/tmp/onedrive-staging`.
  - [ ] Emits a manifest JSON describing each artifact.
- [ ] Load the manifest into Supabase storage or a dedicated `onedrive_ingest` table via the Supabase REST API.
- [ ] Transform raw files into training-ready tables:
  - [ ] CSV → `COPY` into `ai_raw_csv` staging tables.
  - [ ] JSON → parse into `jsonb` columns.
  - [ ] Large parquet files → stream through a temporary object store bucket
        before invoking `COPY`.
- [ ] Schedule the script using the existing `queue` or Supabase cron triggers so it runs hourly.

## 4. Materialize Training Datasets in Supabase

- [ ] Define SQL views that join staging tables with governance metadata (source, schema version, retention policy).
- [ ] Publish curated tables in the `ai_curated` schema. Include pgvector columns when storing embeddings.
- [ ] Leverage Supabase Row Level Security (RLS) to ensure only the Dynamic AI training service role can read sensitive datasets.

## 5. Integrate with the Training Pipeline

- [ ] Update the Dynamic AI trainer to pull curated datasets via Supabase client libraries instead of raw OneDrive files.
- [ ] Cache dataset fingerprints (hash + version) so that retraining triggers only when underlying data changes.
- [ ] Push model checkpoints and experiment artifacts back to `model-checkpoints/` after each training run.

## 6. Observability and Governance

- [ ] Log each ETL run (records processed, failures) to Supabase's `etl_runs` table and expose alerts through the existing observability stack.
- [ ] Validate dataset schemas with Great Expectations or Supabase triggers before promoting to curated tables.
- [ ] Include OneDrive sync health in the weekly data quality review—check API rate limits, storage quotas, and stale cursors.

## 7. Security Checklist

- [ ] Rotate the Azure AD client secret quarterly and update CI secrets promptly.
- [ ] Encrypt sensitive intermediate files at rest if they reside outside Supabase (for example local staging directories).
- [ ] Restrict OneDrive folder sharing to service accounts and essential stakeholders only.

Following these steps keeps OneDrive responsible for collaboration and archival
storage while Supabase remains the authoritative training datastore for Dynamic
AI.
