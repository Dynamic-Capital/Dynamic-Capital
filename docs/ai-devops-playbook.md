# Dynamic AI DevOps Playbook

This guide documents the automated training and deployment loop that keeps the
Dynamic AI stack aligned with live market data while shipping updates through
Supabase and DigitalOcean.

## Repository Layout

```
/ml
  lorentzian_train.py
  fusion_train.py
  backtest.py
/models
  .gitkeep
/supabase/functions
  /lorentzian-eval
  /fusion
  /policy-eval
.github/workflows/train-deploy.yml
```

- `ml/` holds lightweight trainers and utilities that run inside CI pipelines or
  on a dedicated runner.
- `models/` captures the latest exported weights/configs before they are
  uploaded to Supabase storage.
- Supabase Edge Functions (`lorentzian-eval`, `fusion`, `policy-eval`) consume
  those artifacts and expose the runtime APIs.
- `train-deploy.yml` orchestrates the CI/CD path from training to deployment.

## Supabase CLI Setup

1. Install and authenticate:
   ```bash
   npm install --global supabase
   supabase login
   supabase link --project-ref <PROJECT_REF>
   ```
2. Develop functions locally:
   ```bash
   supabase functions serve
   ```
3. Deploy schema and functions:
   ```bash
   supabase db push
   supabase functions deploy lorentzian-eval
   supabase functions deploy fusion
   supabase functions deploy policy-eval
   ```

## Training Workflow

1. Triggered via `git push` to `main` or manual dispatch.
2. GitHub Actions job `train-ai`:
   - Installs Python dependencies.
   - Runs `ml/lorentzian_train.py` and `ml/fusion_train.py` producing JSON
     artifacts under `models/`.
   - Optionally executes `ml/backtest.py` for quick validation and stores
     metrics as build logs.
   - Uploads artifacts to the Supabase storage bucket `ai-models/`.
3. `deploy-api` job runs after training succeeds and redeploys the Supabase Edge
   Functions so they immediately serve the latest models.

## Model Consumption at Runtime

- Edge Functions call `loadJsonModel` which pulls the newest JSON from Supabase
  storage and caches it for five minutes.
- `lorentzian-eval` converts market inputs into a Lorentzian distance, emits an
  action (`BUY`, `SELL`, `HOLD`) and returns confidence plus diagnostics.
- `fusion` aggregates lobe-level inputs (e.g., Lorentzian, trend, sentiment)
  using the trained weight map to output a fused trade recommendation.
- `policy-eval` enforces treasury and exposure guardrails, falling back to
  sensible defaults when the policy model is missing.

## Rolling Back

- Use Supabase storage version history or re-upload a previous artifact to
  revert a bad model.
- Re-run `supabase functions deploy <name>` to force Edge Functions to pick up
  the reverted model.

## Observability Hooks

- Extend GitHub Actions to upload backtest metrics as workflow artifacts for
  historical analysis.
- Add structured logging inside the Edge Functions (e.g., `console.log`) so
  Supabase log drains capture model version + request identifiers.

## Security Considerations

- Store Supabase access tokens and project references inside GitHub Actions
  secrets.
- Avoid committing trained weights—let CI upload to storage and keep only
  metadata or `.gitkeep` locally.
- Audit storage bucket permissions (`ai-models`) to ensure only service-role
  clients can write while Edge Functions read with least privilege.
