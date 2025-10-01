# Dynamic Capital Extended Integration Playbook

This playbook extends the core Dynamic Capital architecture with a
Supabase-first automation pipeline. It documents how trading platforms, storage
layers, GPU hosts, and presentation surfaces combine into a closed-loop system
that can capture market data, retrain AI models, and publish investor-ready
outputs. Each section is written as a step-by-step guide so the team can
implement, optimize, and refine the workflow without guesswork.

## 1. Data Sources & Storage

### OneDrive — Long-Term Data Lake

- Store canonical datasets (CSV/JSON exports, historical market data, trading
  journals, screenshots, brand assets).
- Use `rclone` or Supabase Storage sync jobs to mirror datasets between OneDrive
  and Supabase Storage for redundancy.
- Version each snapshot so retraining jobs can reproduce the exact dataset that
  produced a model release.

### MetaTrader 5 (MT5) — Trade Telemetry

- Stream executions, account statistics, and tick data into the Supabase
  `trading_data` table via webhooks.
- Add triggers that package closed-trade features (entry, exit, P/L, context
  tags) and push copies into OneDrive/Supabase Storage for offline analytics.
- Maintain webhook retries and logging so every trade is captured before
  retraining or performance reporting runs.
- Emit database webhooks on insert/update so Supabase Edge Functions can respond
  instantly with enrichment logic.

### TradingView — Signal Capture

- Forward strategy alerts and chart snapshots into the Supabase `tv_signals`
  table.
- Append outcome labels (win/loss, regime, notes) asynchronously to grow
  supervised learning data without slowing down the signal path.
- Store rendered chart images or Pine Script exports in OneDrive/Supabase
  Storage to preserve visual context for analysts and models.
- Tag rows with strategy identifiers so downstream training jobs can segment
  performance and run targeted refinements.

## 2. Code & Versioning

- Host Supabase Edge Functions, FastAPI trainers, and Pine Script strategies in
  GitHub.
- Wire GitHub Actions to deploy Edge Functions to Supabase and push model
  artifacts to inference servers.
- Tag model releases (for example, `v0.1.0`, `v0.2.0`) and sync those versions
  with a Supabase `models` table for traceability across the stack.

## 3. Training & GPU Hosting

- Provision GPU-capable infrastructure on DigitalOcean, Modal, or RunPod to run
  the FastAPI-based trainer.
- Accept `/train` triggers from Supabase Functions; download the latest dataset
  snapshot from OneDrive or Supabase Storage.
- After training, upload model weights and metadata back to Storage, and
  register the run in Supabase for observability.
- Keep trainer endpoints stateless—pull configuration from Supabase so
  re-deployments and scale-out hosts stay consistent.

## 4. Deployment & Inference

### Vercel — Investor Dashboards

- Surface model runs (`model_runs`), metrics, and trade telemetry pulled from
  Supabase.
- Embed TradingView charts to visualize live and historical signals alongside
  inference outputs.
- Provide operators with "Retrain Model" or "Sync Dataset" controls that call
  the Supabase `/train` function.

### Lovable.dev — Rapid Bot & Portal Builds

- Ship Telegram bots and VIP dashboards that leverage Supabase Auth for secure
  data access.
- Offer investors curated ROI views, trade breakdowns, and model status without
  exposing internal tooling.
- Use Lovable workflows to preview and QA each release before promoting
  dashboards to production investors.

### Edge Function Gateways

- Create a Supabase Edge Function for `/infer` that validates payloads, enriches
  context from Supabase tables, and proxies the request to the external model
  host.
- Add lightweight rate limiting and audit logging so inference calls stay
  observable.
- For latency-sensitive flows, take advantage of Supabase's built-in AI API
  (text generation/embeddings) and skip external round-trips when workloads
  allow it.

## 5. Step-by-Step Supabase ↔ AI Workflow

1. **Data capture** – MT5 and TradingView send webhooks to Supabase Edge
   Functions which validate, normalize, and insert rows into `trading_data` and
   `tv_signals`.
2. **Database webhook fan-out** – Supabase database webhooks publish insert
   events to an automation queue; downstream handlers label trades, attach
   strategy metadata, and persist enriched payloads in Storage.
3. **Dataset assembly** – A scheduled Edge Function aggregates the latest
   labeled trades/signals, writes a versioned dataset snapshot to
   OneDrive/Supabase Storage, and records the snapshot ID in a `datasets` table.
4. **Training trigger** – The same Edge Function (or a GitHub Action) posts to
   the GPU trainer's `/train` endpoint with dataset identifiers, model
   hyperparameters, and target release tags.
5. **Model training** – The GPU service downloads data, runs fine-tuning,
   captures metrics, and uploads weights, tokenizers, and configuration files
   back to Storage.
6. **Release registration** – Upon completion, the GPU service calls a Supabase
   `/webhook` Edge Function that inserts a `model_runs` record, links artifacts,
   and flips feature flags for the latest stable release.
7. **Inference serving** – `/infer` requests from TradingView alerts, MT5 bots,
   or dashboards hit the Edge Function gateway, which calls the external
   inference endpoint (Hugging Face, llama.cpp, etc.) and writes responses plus
   metadata to Supabase for traceability.
8. **Application surface** – Vercel dashboards and Lovable apps read from
   Supabase views to show investors new trades, model deltas, and performance
   summaries.

> **Tip:** Keep each step idempotent by keying operations to dataset/model IDs.
> This allows you to replay automations when upstream data is corrected without
> duplicating records.

## 6. Optimization & Continuous Refinement

- **Back-to-back evaluations** – After every training run, schedule an immediate
  shadow deployment where the new model runs alongside the previous champion on
  a rolling window of live signals. Compare win rate, drawdown, and latency
  before promoting to production.
- **Feature feedback loop** – Store inference explanations or misclassification
  notes in Supabase; nightly jobs can merge this qualitative feedback into the
  next dataset snapshot.
- **Prompt/profile tuning** – For prompt-based strategies, keep prompt templates
  in Supabase. Edge Functions fetch the latest prompt at request time, enabling
  quick edits without redeploying inference services.
- **Automated regression checks** – Maintain a suite of canonical trade
  scenarios in Supabase. Each `/train` completion triggers tests that replay the
  scenarios against the new model to catch degradations before investors see
  them.
- **Cost observation** – Track GPU utilization, inference API spend, and data
  egress in Supabase tables. Vercel dashboards can then forecast burn rate per
  strategy and help optimize hosting choices.

## 7. Platform Responsibilities

- **OneDrive** – Durable archive for datasets and model artifacts shared with
  Supabase Storage.
- **Supabase** – System orchestrator handling data ingestion, triggers, function
  execution, and storage replication.
- **MT5 & TradingView** – Real-time trade execution and signal streaming
  sources.
- **GitHub** – Source control with CI/CD for code, Supabase Functions, and
  inference deployments.
- **DigitalOcean / Modal / RunPod** – GPU trainers executing model fine-tuning
  and inference packaging.
- **Vercel** – Public dashboards and investor-facing analytics surfaces.
- **Lovable.dev** – Lightweight portals, bots, and VIP experiences consuming
  Supabase APIs.
- **External Model Hosts** – Services like Hugging Face or custom FastAPI
  deployments that expose inference endpoints consumed by Supabase Edge
  Functions.

## 8. Architecture Diagram

```mermaid
flowchart LR
    subgraph Sources
        MT5[MT5 Webhooks]
        TV[TradingView Alerts]
    end
    subgraph Orchestration
        SB[(Supabase)]
        EF[Supabase Edge Functions]
    end
    subgraph Storage
        OD[OneDrive]
        SS[Supabase Storage]
    end
    subgraph Training
        GPU[GPU Trainer (DigitalOcean/Modal/RunPod)]
    end
    subgraph Inference
        Host[External Model Host]
        Infer[/Infer API/]
    end
    subgraph Delivery
        Vercel[Vercel Dashboards]
        Lovable[Lovable.dev Apps/Bots]
    end

    MT5 --> SB
    TV --> SB
    SB <--> SS
    SS <--> OD
    SB --> EF
    EF --> GPU
    GPU --> SS
    GPU --> SB
    EF --> Host
    Host --> Infer
    SB --> Infer
    Infer --> MT5
    Infer --> TV
    SB --> Vercel
    SB --> Lovable
    Lovable --> Investors
    Vercel --> Investors
```

## 9. Operational Best Practices

- Instrument every webhook and function with logging so failed deliveries or
  training runs can be replayed.
- Mirror critical tables (signals, trades, model_runs) to analytics schemas for
  BI tooling without impacting transactional workloads.
- Keep secrets centralized in Supabase project settings; never commit API keys
  or service credentials to Git.
- Document dataset and model lineage in Supabase so auditors can trace which
  data snapshot powered each release.
- Version prompts, datasets, and model artifacts together—tie every `model_runs`
  row to the dataset snapshot, prompt revision, and inference config used during
  evaluation.
- Use Supabase Row Level Security (RLS) to partition investor-facing views from
  operator controls, minimizing risk if API keys are compromised.

## 10. Next Steps Checklist

- [ ] Stand up Supabase tables (`trading_data`, `tv_signals`, `model_runs`,
      `models`).
- [ ] Configure MT5 and TradingView webhooks that write to Supabase Edge
      Functions.
- [ ] Automate dataset synchronization between Supabase Storage and OneDrive.
- [ ] Register database webhooks that call Edge Functions for enrichment and
      training triggers.
- [ ] Deploy GPU trainer endpoints and register `/train` + `/infer` handlers.
- [ ] Publish dashboards/bots that consume Supabase APIs and broadcast model
      updates to stakeholders.
- [ ] Implement regression checks and shadow evaluations so every new model run
      is validated before investor exposure.

This integrated blueprint keeps data, models, and investor touchpoints
synchronized so Dynamic Capital can operate a continuously learning, audit-ready
trading program.
