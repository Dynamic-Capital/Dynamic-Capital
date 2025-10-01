# Dynamic Capital LLM Training Pipeline

## Overview

Dynamic Capital now supports multilingual, instruction-tuned fine-tuning
workflows across Dhivehi and English datasets. The pipeline is composed of three
stages:

1. **Corpus preprocessing** – deduplicate, language tag, and domain-label raw
   JSONL/TXT sources with `ml/preprocess_corpus.py`.
2. **Tokenizer training** – build a shared SentencePiece vocabulary with
   `ml/tokenizer_builder.py` to capture Thaana script coverage and
   trading/mentorship/gov tokens.
3. **LoRA fine-tuning service** – submit curated datasets to the FastAPI trainer
   (`trainer/main.py`) which now supports classification, causal language
   modelling, and seq2seq instruction tuning.

## Preprocess Raw Corpora

```bash
python ml/preprocess_corpus.py \
  --input data/raw/*.jsonl data/maldives_news.txt \
  --output data/processed/dhivehi_en.jsonl \
  --languages en dv \
  --min-characters 64
```

The CLI merges multiple corpora, applies MinHash + Bloom deduplication, performs
language detection (Thaana-aware), and tags rows with domain labels (trading,
mentorship, governance). The output JSONL is compatible with the trainer
service’s instruction schema (`prompt`, `context`, `response`, `language`,
`tags`).

## Train a Shared Tokenizer

```bash
python ml/tokenizer_builder.py \
  --input data/processed/dhivehi_en.jsonl \
  --output models/tokenizers/dhivehi_en \
  --vocab-size 52000 \
  --special-token "<trade_signal>" --special-token "<mentor_prompt>"
```

The tokenizer builder trains a SentencePiece unigram model, preserves a set of
custom special tokens, and writes artifacts (`.model`, `.vocab`,
`tokenizer_config.json`) that can be supplied to the trainer via the
`tokenizer_path` hyperparameter.

## Launch a Fine-Tuning Run

```bash
curl -X POST https://trainer.example.com/train \
  -H "x-trainer-key: $TRAINER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
        "run_id": 42,
        "model_name": "dhivehi-mentor",
        "dataset_url": "https://storage.example.com/dhivehi_en.jsonl",
        "webhook_url": "https://automation.example.com/trainer-hook",
        "hyperparams": {
          "base_model": "meta-llama/Llama-2-7b-hf",
          "task_type": "causal",
          "tokenizer_path": "models/tokenizers/dhivehi_en",
          "epochs": 3,
          "batch_size": 16,
          "max_seq_length": 1024
        }
      }'
```

The trainer now returns generation-focused metrics including perplexity,
BLEU/chrF scores, and a domain alignment score derived from Dynamic Capital
keyword heuristics.

## Environment Setup

Install the Python dependencies required for preprocessing, tokenizer training,
and the FastAPI trainer service:

```bash
pip install --upgrade "torch>=2.0" "transformers>=4.38" datasets peft \
  fastapi uvicorn sacrebleu sentencepiece langdetect
```

Node-based tooling (linting, formatting, type-checking) relies on the
repository’s package.json:

```bash
npm install
```

After installing dependencies you can execute regression tests for the trainer
schema:

```bash
pytest tests_python/test_trainer_service_schema.py
```
