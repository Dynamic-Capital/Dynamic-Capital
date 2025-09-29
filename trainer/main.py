"""FastAPI microservice for LoRA fine-tuning on Supabase-managed runs."""
from __future__ import annotations

import json
import logging
import os
import shutil
import time
from dataclasses import dataclass
from enum import Enum
import math
from pathlib import Path
from typing import Dict, List, Mapping, Optional, Sequence, Tuple

try:  # pragma: no cover - numpy is optional for import-time compatibility
    import numpy as np
except ModuleNotFoundError:  # pragma: no cover - fallback for minimal environments
    class _NumpyShim:
        @staticmethod
        def argmax(values: Sequence[Sequence[float]], axis: int = 0) -> List[int]:
            if axis != 1:
                raise ValueError("_NumpyShim.argmax only supports axis=1")
            return [max(range(len(row)), key=lambda idx: row[idx]) for row in values]

    np = _NumpyShim()  # type: ignore
import requests
import torch
from datasets import Dataset, DatasetDict
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from torch.utils.data import Dataset as TorchDataset
from transformers import (
    AutoModelForSequenceClassification,
    AutoModelForCausalLM,
    AutoModelForSeq2SeqLM,
    AutoTokenizer,
    DataCollatorForLanguageModeling,
    DataCollatorForSeq2Seq,
    Trainer,
    TrainingArguments,
)

from peft import LoraConfig, TaskType as PeftTaskType, get_peft_model


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


class SupportedTaskType(str, Enum):
    CLASSIFICATION = "classification"
    CAUSAL_LM = "causal"
    SEQ2SEQ = "seq2seq"


class HyperParams(BaseModel):
    base_model: str = Field(default="distilbert-base-uncased")
    epochs: int = Field(default=2, ge=1)
    batch_size: int = Field(default=8, ge=1)
    learning_rate: float = Field(default=2e-4, gt=0)
    warmup_ratio: float = Field(default=0.1, ge=0, le=0.5)
    weight_decay: float = Field(default=0.01, ge=0)
    gradient_accumulation_steps: int = Field(default=1, ge=1)
    task_type: SupportedTaskType = Field(default=SupportedTaskType.CLASSIFICATION)
    tokenizer_path: Optional[str] = Field(default=None)
    max_seq_length: int = Field(default=1024, ge=64, le=4096)
    eval_max_samples: int = Field(default=64, ge=1, le=512)


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
    raw_train: Dataset
    raw_eval: Dataset


THAANA_RANGE = (0x0780, 0x07BF)


def _ensure_str(value: object, field: str, line_number: int) -> str:
    if value is None:
        raise ValueError(f"Missing '{field}' at line {line_number}")
    if isinstance(value, str):
        text = value.strip()
        if not text:
            raise ValueError(f"Empty '{field}' at line {line_number}")
        return text
    return str(value)


def _contains_thaana(text: str) -> bool:
    return any(THAANA_RANGE[0] <= ord(char) <= THAANA_RANGE[1] for char in text)


def infer_language(prompt: str, response: str, provided: Optional[object]) -> str:
    if provided:
        return str(provided).lower()
    combined = f"{prompt} {response}"
    if _contains_thaana(combined):
        return "dv"
    return "en"


def format_instruction_prompt(prompt: str, context: str = "", language: str = "") -> str:
    segments: List[str] = []
    lang = language.strip()
    if lang:
        segments.append(f"[LANG={lang}]")
    ctx = context.strip()
    if ctx:
        segments.append(f"Context:\n{ctx}")
    segments.append(f"Prompt:\n{prompt.strip()}")
    return "\n\n".join(segments).strip()


def format_instruction_example(
    prompt: str,
    response: str,
    *,
    context: str = "",
    language: str = "",
    tokenizer: Optional[AutoTokenizer] = None,
    include_response: bool = True,
) -> str:
    body = format_instruction_prompt(prompt, context=context, language=language)
    if not include_response:
        return body

    eos_token = getattr(tokenizer, "eos_token", None) if tokenizer is not None else None
    suffix = "\n\nResponse:\n" + response.strip()
    if eos_token:
        suffix += eos_token
    return body + suffix


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


def parse_rows(path: Path, task_type: SupportedTaskType) -> List[Dict[str, object]]:
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
            if task_type is SupportedTaskType.CLASSIFICATION:
                text = _ensure_str(payload.get("input_text"), "input_text", line_number)
                if "label" not in payload:
                    raise ValueError(f"Missing 'label' at line {line_number}")
                rows.append({"input_text": text, "label": payload.get("label")})
            else:
                prompt_source = (
                    payload.get("prompt")
                    or payload.get("instruction")
                    or payload.get("input")
                )
                response_source = (
                    payload.get("response")
                    or payload.get("output")
                    or payload.get("answer")
                )
                if not prompt_source or not response_source:
                    raise ValueError(
                        f"Missing 'prompt'/'response' style keys at line {line_number}"
                    )
                prompt = _ensure_str(prompt_source, "prompt", line_number)
                response = _ensure_str(response_source, "response", line_number)
                context_value = (
                    payload.get("context")
                    or payload.get("system")
                    or payload.get("background")
                    or payload.get("history")
                    or ""
                )
                context = str(context_value).strip()
                language = infer_language(prompt, response, payload.get("language"))
                rows.append(
                    {
                        "prompt": prompt,
                        "response": response,
                        "context": context,
                        "language": language,
                    }
                )
    if not rows:
        raise ValueError("Dataset is empty")
    return rows


def build_hf_dataset(rows: Sequence[Mapping[str, object]], task_type: SupportedTaskType) -> DatasetDict:
    if task_type is SupportedTaskType.CLASSIFICATION:
        texts: List[str] = []
        labels: List[int] = []
        for row in rows:
            label_value = str(row["label"]).lower().strip()
            label = 0 if label_value in {"sell", "negative", "0"} else 1
            texts.append(str(row["input_text"]))
            labels.append(label)
        dataset = Dataset.from_dict({"text": texts, "label": labels})
        return dataset.train_test_split(test_size=0.2, seed=42)

    prompts: List[str] = []
    contexts: List[str] = []
    responses: List[str] = []
    languages: List[str] = []
    for row in rows:
        prompts.append(str(row["prompt"]))
        contexts.append(str(row.get("context", "")))
        responses.append(str(row["response"]))
        languages.append(str(row.get("language", "")))
    dataset = Dataset.from_dict(
        {
            "prompt": prompts,
            "context": contexts,
            "response": responses,
            "language": languages,
        }
    )
    return dataset.train_test_split(test_size=0.2, seed=42)


def tokenize_dataset(
    dataset: DatasetDict, tokenizer: AutoTokenizer, hparams: HyperParams
) -> PreparedDataset:
    raw_train = dataset["train"]
    raw_eval = dataset["test"]

    if hparams.task_type is SupportedTaskType.CLASSIFICATION:
        def tokenize(batch: Dict[str, List[str]]) -> Dict[str, List[int]]:
            return tokenizer(
                batch["text"],
                padding="max_length",
                truncation=True,
                max_length=min(hparams.max_seq_length, 512),
            )

        remove_columns = [column for column in raw_train.column_names if column != "label"]
        tokenized = dataset.map(
            tokenize,
            batched=True,
            remove_columns=remove_columns,
        )
        tokenized.set_format(type="torch", columns=["input_ids", "attention_mask", "label"])
        total_rows = len(raw_train) + len(raw_eval)
        return PreparedDataset(tokenized["train"], tokenized["test"], rows=total_rows, raw_train=raw_train, raw_eval=raw_eval)

    if hparams.task_type is SupportedTaskType.CAUSAL_LM:
        def tokenize(batch: Dict[str, List[str]]) -> Dict[str, List[Sequence[int]]]:
            formatted = [
                format_instruction_example(
                    prompt=prompt,
                    response=response,
                    context=context,
                    language=language,
                    tokenizer=tokenizer,
                )
                for prompt, context, response, language in zip(
                    batch["prompt"], batch["context"], batch["response"], batch["language"]
                )
            ]
            model_inputs = tokenizer(
                formatted,
                padding="max_length",
                truncation=True,
                max_length=hparams.max_seq_length,
            )
            labels: List[List[int]] = []
            for ids in model_inputs["input_ids"]:
                if isinstance(ids, list):
                    labels.append(ids.copy())
                else:
                    labels.append(list(ids))
            model_inputs["labels"] = labels
            return model_inputs

        tokenized = dataset.map(
            tokenize,
            batched=True,
            remove_columns=raw_train.column_names,
        )
        tokenized.set_format(type="torch", columns=["input_ids", "attention_mask", "labels"])
        total_rows = len(raw_train) + len(raw_eval)
        return PreparedDataset(tokenized["train"], tokenized["test"], rows=total_rows, raw_train=raw_train, raw_eval=raw_eval)

    # Seq2Seq tokenization
    def tokenize(batch: Dict[str, List[str]]) -> Dict[str, List[Sequence[int]]]:
        inputs = [
            format_instruction_prompt(prompt, context=context, language=language)
            for prompt, context, language in zip(batch["prompt"], batch["context"], batch["language"])
        ]
        model_inputs = tokenizer(
            inputs,
            padding="max_length",
            truncation=True,
            max_length=hparams.max_seq_length,
        )
        with tokenizer.as_target_tokenizer():
            labels = tokenizer(
                batch["response"],
                padding="max_length",
                truncation=True,
                max_length=hparams.max_seq_length,
            )
        model_inputs["labels"] = labels["input_ids"]
        decoder_attention = labels.get("attention_mask")
        if decoder_attention is not None:
            model_inputs["decoder_attention_mask"] = decoder_attention
        return model_inputs

    tokenized = dataset.map(
        tokenize,
        batched=True,
        remove_columns=raw_train.column_names,
    )
    seq2seq_columns = ["input_ids", "attention_mask", "labels"]
    if "decoder_attention_mask" in tokenized["train"].column_names:
        seq2seq_columns.append("decoder_attention_mask")
    tokenized.set_format(type="torch", columns=seq2seq_columns)
    total_rows = len(raw_train) + len(raw_eval)
    return PreparedDataset(tokenized["train"], tokenized["test"], rows=total_rows, raw_train=raw_train, raw_eval=raw_eval)


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
    LOG.info("Loading base model %s for task %s", base_model, hparams.task_type.value)

    data_collator = None
    compute_metrics = None

    if hparams.task_type is SupportedTaskType.CLASSIFICATION:
        model = AutoModelForSequenceClassification.from_pretrained(base_model, num_labels=2)
        peft_task = PeftTaskType.SEQ_CLS

        def classification_metrics(eval_pred):
            predictions = np.argmax(eval_pred.predictions, axis=1)
            labels = eval_pred.label_ids
            accuracy = float((predictions == labels).mean())
            return {"accuracy": accuracy}

        compute_metrics = classification_metrics
    elif hparams.task_type is SupportedTaskType.CAUSAL_LM:
        model = AutoModelForCausalLM.from_pretrained(base_model)
        peft_task = PeftTaskType.CAUSAL_LM
        data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)
    else:
        model = AutoModelForSeq2SeqLM.from_pretrained(base_model)
        peft_task = PeftTaskType.SEQ_2_SEQ_LM
        data_collator = DataCollatorForSeq2Seq(tokenizer=tokenizer, model=model)

    if tokenizer.pad_token is None:
        tokenizer.add_special_tokens({"pad_token": "<pad>"})
    if getattr(model.config, "pad_token_id", None) is None and tokenizer.pad_token_id is not None:
        model.config.pad_token_id = tokenizer.pad_token_id
    if hasattr(model, "resize_token_embeddings") and len(tokenizer) != model.get_input_embeddings().weight.shape[0]:
        model.resize_token_embeddings(len(tokenizer))

    if hasattr(model, "gradient_checkpointing_enable"):
        model.gradient_checkpointing_enable()
    if hasattr(model.config, "use_cache"):
        model.config.use_cache = False

    target_modules = detect_lora_targets(model)
    LOG.info("Using LoRA targets: %s", target_modules)
    lora_config = LoraConfig(
        task_type=peft_task,
        r=8,
        lora_alpha=16,
        lora_dropout=0.05,
        target_modules=target_modules,
    )
    model = get_peft_model(model, lora_config)

    use_fp16 = False
    if torch.cuda.is_available():
        cuda_props = torch.cuda.get_device_properties(0)
        use_fp16 = cuda_props.total_memory <= 7 * 1024**3
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
        predict_with_generate=hparams.task_type is not SupportedTaskType.CLASSIFICATION,
        generation_max_length=hparams.max_seq_length,
    )

    return Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset.train,
        eval_dataset=dataset.eval,
        tokenizer=tokenizer,
        compute_metrics=compute_metrics,
        data_collator=data_collator,
    )


def _load_sacrebleu():  # pragma: no cover - optional dependency
    try:
        import sacrebleu  # type: ignore

        return sacrebleu
    except Exception:  # noqa: BLE001 - broad to keep optional dependency soft
        return None


def _fallback_bleu(predictions: Sequence[str], references: Sequence[str]) -> float:
    matches = 0
    total_tokens = 0
    for pred, ref in zip(predictions, references):
        tokens = pred.split()
        if not tokens:
            continue
        total_tokens += len(tokens)
        reference_tokens = set(ref.split())
        matches += sum(1 for token in tokens if token in reference_tokens)
    if total_tokens == 0:
        return 0.0
    return (matches / total_tokens) * 100.0


def _fallback_chrf(predictions: Sequence[str], references: Sequence[str]) -> float:
    scores: List[float] = []
    for pred, ref in zip(predictions, references):
        pred_chars = set(pred)
        ref_chars = set(ref)
        if not pred_chars or not ref_chars:
            scores.append(0.0)
            continue
        overlap = len(pred_chars & ref_chars)
        precision = overlap / len(pred_chars)
        recall = overlap / len(ref_chars)
        if precision + recall == 0:
            scores.append(0.0)
        else:
            scores.append((2 * precision * recall / (precision + recall)) * 100.0)
    return float(sum(scores) / len(scores)) if scores else 0.0


DOMAIN_KEYWORDS: Dict[str, Sequence[str]] = {
    "trading": ("buy", "sell", "bullish", "bearish", "stop-loss", "entry"),
    "mentorship": ("mentor", "guidance", "learning", "practice", "feedback"),
    "governance": ("vote", "council", "charter", "policy", "ethics"),
}


def compute_generation_scores(predictions: Sequence[str], references: Sequence[str]) -> Dict[str, float]:
    if not predictions:
        return {"bleu": 0.0, "chrf": 0.0}

    sacrebleu_mod = _load_sacrebleu()
    if sacrebleu_mod is not None:
        bleu = sacrebleu_mod.corpus_bleu(predictions, [references]).score
        chrf = sacrebleu_mod.corpus_chrf(predictions, [references]).score
        return {"bleu": float(bleu), "chrf": float(chrf)}

    return {
        "bleu": _fallback_bleu(predictions, references),
        "chrf": _fallback_chrf(predictions, references),
    }


def compute_domain_alignment(prompts: Sequence[str], predictions: Sequence[str]) -> float:
    if not predictions:
        return 0.0

    alignment_scores: List[float] = []
    for prompt, prediction in zip(prompts, predictions):
        prompt_lower = prompt.lower()
        prediction_lower = prediction.lower()
        bucket_scores: List[float] = []
        for keywords in DOMAIN_KEYWORDS.values():
            if any(keyword in prompt_lower for keyword in keywords):
                bucket_scores.append(1.0 if any(keyword in prediction_lower for keyword in keywords) else 0.0)
        if bucket_scores:
            alignment_scores.append(sum(bucket_scores) / len(bucket_scores))
        else:
            alignment_scores.append(0.5)  # neutral when no domain cues present
    return float(sum(alignment_scores) / len(alignment_scores))


def generate_predictions(
    trainer: Trainer,
    dataset: Dataset,
    tokenizer: AutoTokenizer,
    hparams: HyperParams,
) -> Tuple[List[str], List[str], List[str]]:
    sample_size = min(len(dataset), hparams.eval_max_samples)
    if sample_size == 0:
        return [], [], []

    sample = dataset.select(range(sample_size))
    prompts: List[str] = []
    references: List[str] = []
    for row in sample:
        prompt = format_instruction_prompt(
            str(row["prompt"]),
            context=str(row.get("context", "")),
            language=str(row.get("language", "")),
        )
        prompts.append(prompt)
        references.append(str(row["response"]))

    model_inputs = tokenizer(
        prompts,
        padding=True,
        truncation=True,
        max_length=hparams.max_seq_length,
        return_tensors="pt",
    )
    model_inputs = {key: value.to(trainer.model.device) for key, value in model_inputs.items()}

    generation_kwargs = {
        "max_length": hparams.max_seq_length,
        "pad_token_id": tokenizer.pad_token_id,
    }
    if getattr(trainer.model.config, "eos_token_id", None) is not None:
        generation_kwargs["eos_token_id"] = trainer.model.config.eos_token_id

    trainer.model.eval()
    with torch.no_grad():
        generated = trainer.model.generate(**model_inputs, **generation_kwargs)

    predictions = tokenizer.batch_decode(generated, skip_special_tokens=True)
    return prompts, predictions, references


def assemble_metrics(
    hparams: HyperParams,
    eval_metrics: Dict[str, float],
    trainer: Trainer,
    dataset: PreparedDataset,
    tokenizer: AutoTokenizer,
) -> Dict[str, float]:
    payload: Dict[str, float] = {"rows": float(dataset.rows)}

    if "eval_loss" in eval_metrics:
        payload["loss"] = float(eval_metrics["eval_loss"])

    if hparams.task_type is SupportedTaskType.CLASSIFICATION:
        payload["accuracy"] = float(eval_metrics.get("eval_accuracy", 0.0))
        return payload

    eval_loss = eval_metrics.get("eval_loss")
    if eval_loss is not None:
        try:
            payload["perplexity"] = float(math.exp(eval_loss))
        except OverflowError:  # pragma: no cover - defensive guard
            payload["perplexity"] = float("inf")

    prompts, predictions, references = generate_predictions(trainer, dataset.raw_eval, tokenizer, hparams)
    scores = compute_generation_scores(predictions, references)
    payload.update(scores)
    payload["domain_alignment"] = compute_domain_alignment(prompts, predictions)
    return payload


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
        rows = parse_rows(dataset_path, hparams.task_type)
        hf_dataset = build_hf_dataset(rows, hparams.task_type)
        tokenizer_source = hparams.tokenizer_path or hparams.base_model
        LOG.info("Loading tokenizer from %s", tokenizer_source)
        tokenizer = AutoTokenizer.from_pretrained(tokenizer_source, trust_remote_code=True)
        if tokenizer.pad_token is None and tokenizer.eos_token is not None:
            tokenizer.pad_token = tokenizer.eos_token
        tokenizer.padding_side = "right"
        prepared = tokenize_dataset(hf_dataset, tokenizer, hparams)
        trainer = build_trainer(run_id, prepared, hparams, tokenizer)

        LOG.info("Starting training for run %s", run_id)
        trainer.train()

        LOG.info("Evaluating model for run %s", run_id)
        raw_metrics = trainer.evaluate()
        metrics = assemble_metrics(hparams, raw_metrics, trainer, prepared, tokenizer)

        LOG.info("Saving model artifacts for run %s", run_id)
        trainer.save_model()
        tokenizer.save_pretrained(OUTPUT_ROOT / f"run-{run_id}")
        artifact_path = package_artifacts(run_id)

        post_webhook(
            webhook_url,
            {
                "run_id": run_id,
                "status": "succeeded",
                "artifact_path": str(artifact_path),
                "model_name": model_name,
                "metrics": metrics,
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
