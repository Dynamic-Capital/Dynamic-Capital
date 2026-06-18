# OneDrive + Supabase Training Workflow

This playbook outlines the recommended way to connect Microsoft OneDrive storage
to Dynamic Capital's Supabase-centric data platform so the Dynamic AI (DAI)
training agents can consume curated datasets reliably. Follow the phased
checklists below in sequence—each phase produces the artefacts needed by the
next, guiding you from OneDrive sync to production retraining.

## Step-by-Step Implementation Overview

1. **Harden access:** create an Azure AD application and build a token helper so
   you can authenticate Graph API calls non-interactively.
2. **Organise storage:** standardise OneDrive folders so datasets, checkpoints,
   and ETL staging assets are predictable and versioned.
3. **Ingest & transform:** automate Graph API syncs into Supabase staging tables
   using a manifest-driven ETL script.
4. **Materialise curated data:** promote validated datasets into Supabase
   schemas optimised for training and embeddings.
5. **Train from Supabase:** update trainers to fetch curated tables, not raw
   files, and push checkpoints back to OneDrive for collaboration.
6. **Track experiments:** pair Supabase data with DVC or MLflow metadata to keep
   reproducibility high as models evolve.
7. **Monitor & secure:** wrap the integration with observability and security
   guardrails so the sync never silently drifts or leaks data.

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

## 6. Versioning and Experiment Tracking

- [ ] Configure DVC remotes pointing to the OneDrive `datasets/` folder so
      dataset snapshots can be promoted or rolled back.
- [ ] Mirror MLflow or Weights & Biases artifact stores into
      `model-checkpoints/` so experiment metadata sits beside weights.
- [ ] Capture Supabase dataset fingerprints (hash + version + schema) in your
      experiment tracker for reproducibility audits.

## 7. Observability and Governance

- [ ] Log each ETL run (records processed, failures) to Supabase's `etl_runs` table and expose alerts through the existing observability stack.
- [ ] Validate dataset schemas with Great Expectations or Supabase triggers before promoting to curated tables.
- [ ] Include OneDrive sync health in the weekly data quality review—check API rate limits, storage quotas, and stale cursors.

## 8. Security Checklist

- [ ] Rotate the Azure AD client secret quarterly and update CI secrets promptly.
- [ ] Encrypt sensitive intermediate files at rest if they reside outside Supabase (for example local staging directories).
- [ ] Restrict OneDrive folder sharing to service accounts and essential stakeholders only.

Following these steps keeps OneDrive responsible for collaboration and archival
storage while Supabase remains the authoritative training datastore for Dynamic
AI.
