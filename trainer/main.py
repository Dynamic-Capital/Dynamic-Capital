"""FastAPI microservice for LoRA fine-tuning on Supabase-managed runs."""
from __future__ import annotations

import json
import logging
import os
import shutil
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional

import numpy as np
import requests
import torch
from datasets import Dataset
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from torch.utils.data import Dataset as TorchDataset
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    Trainer,
    TrainingArguments,
)

from peft import LoraConfig, TaskType, get_peft_model


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
TRAINER_KEY = os.environ.get("TRAINER_KEY", "super-secret")
STORAGE_TMP = Path(os.environ.get("TRAINER_STORAGE", "/tmp/datasets"))
STORAGE_TMP.mkdir(parents=True, exist_ok=True)

OUTPUT_ROOT = Path(os.environ.get("TRAINER_OUTPUT", "./outputs"))
OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

LOG = logging.getLogger("trainer")
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")


def require_trainer_key(x_trainer_key: Optional[str] = Header(None)) -> None:
    if x_trainer_key != TRAINER_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")


app = FastAPI(title="Dynamic Capital Trainer", version="1.0.0")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class HyperParams(BaseModel):
    base_model: str = Field(default="distilbert-base-uncased")
    epochs: int = Field(default=2, ge=1)
    batch_size: int = Field(default=8, ge=1)
    learning_rate: float = Field(default=2e-4, gt=0)
    warmup_ratio: float = Field(default=0.1, ge=0, le=0.5)
    weight_decay: float = Field(default=0.01, ge=0)
    gradient_accumulation_steps: int = Field(default=1, ge=1)


class TrainRequest(BaseModel):
    run_id: int
    model_name: str
    dataset_url: str
    webhook_url: str
    hyperparams: HyperParams = Field(default_factory=HyperParams)


@dataclass
class PreparedDataset:
    train: TorchDataset
    eval: TorchDataset
    rows: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def post_webhook(webhook_url: str, payload: Dict[str, object]) -> None:
    headers = {"Content-Type": "application/json", "x-trainer-key": TRAINER_KEY}
    try:
        requests.post(webhook_url, headers=headers, data=json.dumps(payload), timeout=30)
    except Exception as exc:  # pragma: no cover - webhook errors are non-fatal
        LOG.warning("Webhook error: %s", exc)


def download_dataset(url: str, run_id: int) -> Path:
    local_path = STORAGE_TMP / f"run-{run_id}.jsonl"
    LOG.info("Downloading dataset for run %s -> %s", run_id, local_path)
    with requests.get(url, timeout=120, stream=True) as response:
        response.raise_for_status()
        with local_path.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    handle.write(chunk)
    return local_path


def parse_rows(path: Path) -> List[Dict[str, object]]:
    rows: List[Dict[str, object]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, raw in enumerate(handle, start=1):
            raw = raw.strip()
            if not raw:
                continue
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSONL at line {line_number}: {exc}") from exc
            if "input_text" not in payload:
                raise ValueError(f"Missing 'input_text' at line {line_number}")
            if "label" not in payload:
                raise ValueError(f"Missing 'label' at line {line_number}")
            rows.append(payload)
    if not rows:
        raise ValueError("Dataset is empty")
    return rows


def build_hf_dataset(rows: Iterable[Dict[str, object]]) -> Dataset:
    texts: List[str] = []
    labels: List[int] = []
    for row in rows:
        label_value = str(row["label"]).lower().strip()
        label = 0 if label_value in {"sell", "negative", "0"} else 1
        texts.append(str(row["input_text"]))
        labels.append(label)
    dataset = Dataset.from_dict({"text": texts, "label": labels})
    return dataset.train_test_split(test_size=0.2, seed=42)


def tokenize_dataset(dataset: Dataset, tokenizer: AutoTokenizer) -> PreparedDataset:
    def tokenize(batch: Dict[str, List[str]]) -> Dict[str, List[int]]:
        return tokenizer(
            batch["text"],
            padding="max_length",
            truncation=True,
            max_length=128,
        )

    tokenized = dataset.map(tokenize, batched=True)
    tokenized.set_format(type="torch", columns=["input_ids", "attention_mask", "label"])
    return PreparedDataset(
        tokenized["train"],
        tokenized["test"],
        rows=len(dataset["train"]) + len(dataset["test"]),
    )


def detect_lora_targets(model: torch.nn.Module) -> List[str]:
    linear_layers = {name.split(".")[-1] for name, module in model.named_modules() if isinstance(module, torch.nn.Linear)}
    for candidate in ("q_lin", "k_lin", "v_lin"):
        if candidate not in linear_layers:
            break
    else:
        return ["q_lin", "k_lin", "v_lin"]

    if {"query", "key", "value"}.issubset(linear_layers):
        return ["query", "key", "value"]

    if "dense" in linear_layers:
        return ["dense"]

    return list(linear_layers)


def build_trainer(
    run_id: int,
    dataset: PreparedDataset,
    hparams: HyperParams,
    tokenizer: AutoTokenizer,
) -> Trainer:
    base_model = hparams.base_model
    LOG.info("Loading base model %s", base_model)

    model = AutoModelForSequenceClassification.from_pretrained(base_model, num_labels=2)
    model.config.pad_token_id = tokenizer.pad_token_id
    if hasattr(model, "gradient_checkpointing_enable"):
        model.gradient_checkpointing_enable()
    if hasattr(model.config, "use_cache"):
        model.config.use_cache = False

    target_modules = detect_lora_targets(model)
    LOG.info("Using LoRA targets: %s", target_modules)
    lora_config = LoraConfig(
        task_type=TaskType.SEQ_CLS,
        r=8,
        lora_alpha=16,
        lora_dropout=0.05,
        target_modules=target_modules,
    )
    model = get_peft_model(model, lora_config)

    use_fp16 = torch.cuda.is_available() and torch.cuda.get_device_properties(0).total_memory <= 7 * 1024**3
    LOG.info("FP16 enabled: %s", use_fp16)

    output_dir = OUTPUT_ROOT / f"run-{run_id}"
    output_dir.mkdir(parents=True, exist_ok=True)

    training_args = TrainingArguments(
        output_dir=str(output_dir),
        report_to=[],
        evaluation_strategy="epoch",
        save_strategy="epoch",
        logging_dir=str(output_dir / "logs"),
        per_device_train_batch_size=hparams.batch_size,
        per_device_eval_batch_size=hparams.batch_size,
        num_train_epochs=hparams.epochs,
        learning_rate=hparams.learning_rate,
        warmup_ratio=hparams.warmup_ratio,
        weight_decay=hparams.weight_decay,
        gradient_accumulation_steps=hparams.gradient_accumulation_steps,
        fp16=use_fp16,
        optim="adamw_torch",
        max_grad_norm=1.0,
    )

    def compute_metrics(eval_pred):
        predictions = np.argmax(eval_pred.predictions, axis=1)
        labels = eval_pred.label_ids
        accuracy = float((predictions == labels).mean())
        return {"accuracy": accuracy}

    return Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset.train,
        eval_dataset=dataset.eval,
        tokenizer=tokenizer,
        compute_metrics=compute_metrics,
    )


# ---------------------------------------------------------------------------
# Training Orchestration
# ---------------------------------------------------------------------------
def package_artifacts(run_id: int) -> Path:
    output_dir = OUTPUT_ROOT / f"run-{run_id}"
    archive_path = output_dir / "model"
    LOG.info("Packaging artifacts for run %s", run_id)
    shutil.make_archive(str(archive_path), "zip", root_dir=output_dir)
    return archive_path.with_suffix(".zip")


def run_training(
    run_id: int,
    model_name: str,
    dataset_path: Path,
    webhook_url: str,
    hparams: HyperParams,
) -> None:
    start_time = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    post_webhook(
        webhook_url,
        {
            "run_id": run_id,
            "status": "running",
            "started_at": start_time,
        },
    )

    try:
        rows = parse_rows(dataset_path)
        hf_dataset = build_hf_dataset(rows)
        tokenizer = AutoTokenizer.from_pretrained(hparams.base_model)
        prepared = tokenize_dataset(hf_dataset, tokenizer)
        trainer = build_trainer(run_id, prepared, hparams, tokenizer)

        LOG.info("Starting training for run %s", run_id)
        trainer.train()

        LOG.info("Evaluating model for run %s", run_id)
        metrics = trainer.evaluate()

        LOG.info("Saving model artifacts for run %s", run_id)
        trainer.save_model()
        trainer.tokenizer.save_pretrained(OUTPUT_ROOT / f"run-{run_id}")
        artifact_path = package_artifacts(run_id)

        post_webhook(
            webhook_url,
            {
                "run_id": run_id,
                "status": "succeeded",
                "artifact_path": str(artifact_path),
                "model_name": model_name,
                "metrics": {
                    "accuracy": float(metrics.get("eval_accuracy", 0.0)),
                    "rows": prepared.rows,
                },
                "finished_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            },
        )
    except Exception as exc:  # pragma: no cover - runtime protection
        LOG.exception("Training failed for run %s", run_id)
        post_webhook(
            webhook_url,
            {
                "run_id": run_id,
                "status": "failed",
                "error": str(exc),
                "finished_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            },
        )
        raise


# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------
@app.post("/train")
async def train(
    request: TrainRequest,
    background: BackgroundTasks,
    _: None = Depends(require_trainer_key),
) -> Dict[str, object]:
    dataset_path = download_dataset(request.dataset_url, request.run_id)
    background.add_task(
        run_training,
        request.run_id,
        request.model_name,
        dataset_path,
        request.webhook_url,
        request.hyperparams,
    )
    return {"ok": True, "run_id": request.run_id}


@app.get("/healthz")
def healthcheck() -> Dict[str, str]:
    return {"status": "ok"}
