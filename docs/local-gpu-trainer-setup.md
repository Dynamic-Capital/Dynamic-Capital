# Local GPU Trainer Setup (RTX 4060)

Use this playbook to run Dynamic Capital's training stack on a local workstation
equipped with an RTX 4060 (6 GB VRAM), 40 GB of RAM, and an Intel i7-12700H CPU.

## 1. Hardware Capabilities

### GPU (RTX 4060, 6 GB VRAM)

- Suited for medium-scale models, including LoRA fine-tunes, compact language
  models (≈1–2B parameters), CNNs/RNNs, and transformer-based classifiers such
  as FinBERT.
- Prioritize parameter-efficient approaches (LoRA/PEFT) to stay within VRAM
  limits.
- Expect optimal batch sizes between 8 and 32; start small and scale up while
  monitoring GPU memory.

### System RAM (40 GB)

- Large enough to preprocess MT5 and TradingView datasets in-memory without
  hitting swap.
- Ideal for feature engineering, data cleansing, and aggregations before moving
  tensors to the GPU.

### CPU (Intel i7-12700H, 14 cores)

- Handles ETL pipelines and feature extraction while the GPU focuses on model
  training.
- Parallelize preprocessing workloads to feed the GPU efficiently.

## 2. Environment Setup

1. Create and activate the Python environment:
   ```bash
   conda create -n trainer python=3.10 -y
   conda activate trainer
   ```
2. Install server dependencies and machine learning frameworks:
   ```bash
   pip install fastapi uvicorn[standard] requests
   pip install torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cu118
   pip install transformers datasets scikit-learn
   ```

## 3. Run the Local Trainer API

Launch the FastAPI training server so Supabase Functions can trigger jobs:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

The endpoint will be available at `http://localhost:8000/train`.

## 4. Connect Supabase Functions

- Update the `TRAINER_URL` in your Supabase `/train` function to point at the
  local server, e.g. `http://<local-ip>:8000` or
  `http://host.docker.internal:8000` when running inside Docker.
- To expose the trainer to Supabase Cloud, tunnel the port with ngrok or
  Cloudflare Tunnel. For ngrok you can either run the binary directly or
  leverage the project script:
  ```bash
  npm run tunnel:functions -- --port=8000
  # or run ngrok manually if you prefer
  ngrok http 8000
  ```
  Use the issued HTTPS URL as the remote `TRAINER_URL`.

## 5. Model Training Guidelines

### Tabular & Classical Models

- XGBoost, scikit-learn ensembles, and regression models fit easily and benefit
  from the CPU's cores.

### Transformer Workloads

- Enable mixed precision (`fp16=True`) to maximize memory efficiency.
- Use gradient accumulation when batch sizes would otherwise be too small.
- Favor compact checkpoints (FinBERT, DistilBERT, RoBERTa-base) and LoRA/PEFT
  adapters for economical fine-tuning.

### Trading-Focused Architectures

- LSTM/GRU models on MT5 OHLCV data remain lightweight and fast.
- Transformer-based sentiment and signal classifiers perform well with the
  memory strategies above.

## 6. Recommended Workflow

1. Ingest MT5 and TradingView exports into Supabase.
2. Pull dataset snapshots to the local machine (via signed URLs or syncing
   tools).
3. Launch training through the FastAPI endpoint using the RTX 4060 for
   experimentation and backtesting.
4. Persist trained artifacts to Supabase Storage or OneDrive for portability.
5. Deploy inference endpoints either from the local machine during development
   or from remote GPU instances for continuous availability.

## 7. Hybrid Strategy

- Use the RTX 4060 workstation for rapid iteration, prototyping, and smaller
  fine-tunes.
- Reserve cloud GPUs (DigitalOcean, Modal, etc.) for large-scale datasets, high
  batch sizes, or production retraining schedules.
- This split keeps experimentation agile while ensuring production workloads
  have the capacity they need.

## 8. Same-Day Rollout Playbook

Move through these back-to-back blocks to bring the workstation online without
idle gaps:

1. **09:00 – 09:20 | Preflight Audit**
   - Run `nvidia-smi` and `nvcc --version` to confirm the CUDA toolchain matches
     the PyTorch build.
   - While diagnostics run, refresh the `trainer` Conda environment and upgrade
     pip: `python -m pip install --upgrade pip`.
   - Verify GPU visibility with
     `python -c "import torch; print(torch.cuda.is_available())"`.
2. **09:20 – 10:10 | Repo & Secrets Sync**
   - Pull the latest Dynamic Capital training repos and merge any local branches
     needed for the day.
   - Use the Supabase CLI or password manager to refresh `.env` secrets; test
     credentials with a quick `supabase functions list`.
   - Kick off dataset downloads to `~/datasets/<date>` so they finish while the
     next block begins.
3. **10:10 – 11:00 | Data Conditioning Pipeline**
   - Start preprocessing scripts (feature engineering, normalization) against
     the newly synced data.
   - Profile CPU utilization; pin heavy jobs with `taskset` if you need to keep
     cores free for the API server.
   - Materialize intermediate Parquet/Arrow files for rapid re-runs.
4. **11:00 – 11:40 | API Bring-Up & Health Checks**
   - Launch the FastAPI service:
     `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`.
   - Hit `/health` and `/train` with sample payloads using `httpie` or `curl`
     and monitor `uvicorn` logs for latency spikes.
   - Capture baseline metrics (GPU memory, response time) in your tracking
     sheet.
5. **11:40 – 13:00 | Supabase Handshake**
   - Point `TRAINER_URL` to the local endpoint, deploy the function, and confirm
     logs reflect the new target.
   - Fire a smoke-training job (tiny batch, 3–5 epochs) to validate
     serialization, artifact upload, and callbacks.
   - Note tuning levers that will need attention in the afternoon (e.g.,
     gradient accumulation, scheduler choice).
6. **14:00 – 16:30 | Iteration Sprints**
   - Cycle through experiment templates: adjust learning rate/batch size, push
     runs, and record metrics in Supabase or Weights & Biases.
   - Keep the GPU queue full by staging the next run while the current job
     backtests.
   - Snapshot best-performing checkpoints to Supabase Storage or OneDrive
     immediately after each run.
7. **16:30 – 17:00 | Wrap & Handoff**
   - Generate a summary report (config + metrics + artifact locations) and file
     it in the project notebook.
   - Archive raw logs, clean temporary data, and schedule the next cloud-scale
     job if additional horsepower is needed.
   - Leave the FastAPI service running only if active jobs remain; otherwise
     stop it and commit config updates.
