# Local GPU Trainer Setup (RTX 4060)

Use this playbook to run Dynamic Capital's training stack on a local workstation equipped with an RTX 4060 (6 GB VRAM), 40 GB of RAM, and an Intel i7-12700H CPU.

## 1. Hardware Capabilities

### GPU (RTX 4060, 6 GB VRAM)
- Suited for medium-scale models, including LoRA fine-tunes, compact language models (≈1–2B parameters), CNNs/RNNs, and transformer-based classifiers such as FinBERT.
- Prioritize parameter-efficient approaches (LoRA/PEFT) to stay within VRAM limits.
- Expect optimal batch sizes between 8 and 32; start small and scale up while monitoring GPU memory.

### System RAM (40 GB)
- Large enough to preprocess MT5 and TradingView datasets in-memory without hitting swap.
- Ideal for feature engineering, data cleansing, and aggregations before moving tensors to the GPU.

### CPU (Intel i7-12700H, 14 cores)
- Handles ETL pipelines and feature extraction while the GPU focuses on model training.
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

- Update the `TRAINER_URL` in your Supabase `/train` function to point at the local server, e.g. `http://<local-ip>:8000` or `http://host.docker.internal:8000` when running inside Docker.
- To expose the trainer to Supabase Cloud, tunnel the port with ngrok or Cloudflare Tunnel:
  ```bash
  ngrok http 8000
  ```
  Use the issued HTTPS URL as the remote `TRAINER_URL`.

## 5. Model Training Guidelines

### Tabular & Classical Models
- XGBoost, scikit-learn ensembles, and regression models fit easily and benefit from the CPU's cores.

### Transformer Workloads
- Enable mixed precision (`fp16=True`) to maximize memory efficiency.
- Use gradient accumulation when batch sizes would otherwise be too small.
- Favor compact checkpoints (FinBERT, DistilBERT, RoBERTa-base) and LoRA/PEFT adapters for economical fine-tuning.

### Trading-Focused Architectures
- LSTM/GRU models on MT5 OHLCV data remain lightweight and fast.
- Transformer-based sentiment and signal classifiers perform well with the memory strategies above.

## 6. Recommended Workflow

1. Ingest MT5 and TradingView exports into Supabase.
2. Pull dataset snapshots to the local machine (via signed URLs or syncing tools).
3. Launch training through the FastAPI endpoint using the RTX 4060 for experimentation and backtesting.
4. Persist trained artifacts to Supabase Storage or OneDrive for portability.
5. Deploy inference endpoints either from the local machine during development or from remote GPU instances for continuous availability.

## 7. Hybrid Strategy

- Use the RTX 4060 workstation for rapid iteration, prototyping, and smaller fine-tunes.
- Reserve cloud GPUs (DigitalOcean, Modal, etc.) for large-scale datasets, high batch sizes, or production retraining schedules.
- This split keeps experimentation agile while ensuring production workloads have the capacity they need.

## 8. Same-Day Implementation Plan

Follow this agenda to get the local trainer operational today:

1. **09:00 – 09:30 | Environment Validation**
   - Confirm GPU drivers and CUDA toolkit match the PyTorch wheel (`nvidia-smi`, `nvcc --version`).
   - Create or update the `trainer` Conda environment, then run `python -c "import torch; print(torch.cuda.is_available())"`.
2. **09:30 – 10:30 | Code & Data Preparation**
   - Pull the latest Dynamic Capital training repository and sync Supabase credentials via `.env`.
   - Download the current MT5/TradingView dataset snapshot to `~/datasets/<date>` for reproducibility.
3. **10:30 – 11:30 | API Bootstrapping**
   - Start the FastAPI server (`uvicorn main:app --host 0.0.0.0 --port 8000`).
   - Hit `http://localhost:8000/health` (or equivalent) to verify readiness; tail logs for runtime errors.
4. **11:30 – 13:00 | Supabase Integration & Smoke Test**
   - Update the Supabase Function `TRAINER_URL` to the local endpoint and deploy the function.
   - Trigger a dry-run training job with a small sample batch to ensure end-to-end connectivity.
5. **14:00 – 17:00 | Iterative Training Loop**
   - Iterate on hyperparameters (batch size, learning rate, gradient accumulation) based on GPU utilization.
   - Log metrics to Supabase Storage or a tracking tool (Weights & Biases) for future comparison.
   - Package artifacts and upload to remote storage; document configuration in the project notebook.

