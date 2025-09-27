#!/usr/bin/env bash
set -euo pipefail

HOST="${LLAMA_SERVER_HOST:-0.0.0.0}"
PORT="${LLAMA_SERVER_PORT:-8080}"
EXTRA_ARGS=()

if [[ "${LLAMA_SERVER_EXTRA_ARGS:-}" != "" ]]; then
  # shellcheck disable=SC2206
  EXTRA_ARGS=(${LLAMA_SERVER_EXTRA_ARGS})
fi

CMD=("/opt/llama.cpp/bin/llama-server")

if [[ "${LLAMA_MODEL:-}" != "" ]]; then
  CMD+=("--model" "${LLAMA_MODEL}")
elif [[ "${LLAMA_HF_REPO:-}" != "" ]]; then
  CMD+=("-hf" "${LLAMA_HF_REPO}")
  if [[ "${LLAMA_HF_FILE:-}" != "" ]]; then
    CMD+=("--hf-file" "${LLAMA_HF_FILE}")
  fi
  if [[ "${LLAMA_HF_REVISION:-}" != "" ]]; then
    CMD+=("--hf-revision" "${LLAMA_HF_REVISION}")
  fi
  if [[ "${LLAMA_HF_TOKEN:-}" != "" ]]; then
    CMD+=("--hf-token" "${LLAMA_HF_TOKEN}")
  fi
else
  cat <<'MSG' >&2
[llama.cpp] Missing model configuration.
Set LLAMA_MODEL to an absolute GGUF path or provide a Hugging Face repository
via LLAMA_HF_REPO (optionally LLAMA_HF_FILE/LLAMA_HF_REVISION/LLAMA_HF_TOKEN).

  docker run -e LLAMA_MODEL=/models/model.gguf -v /path/to/models:/models:ro \
    dynamic-capital/llama-server:latest
  # or
  docker run -e LLAMA_HF_REPO=ggml-org/gemma-3-1b-it-GGUF \
    dynamic-capital/llama-server:latest
MSG
  exit 1
fi

CMD+=(
  "--host" "${HOST}"
  "--port" "${PORT}"
)

if ((${#EXTRA_ARGS[@]})); then
  CMD+=("${EXTRA_ARGS[@]}")
fi

if (($#)); then
  CMD+=("$@")
fi

exec "${CMD[@]}"
