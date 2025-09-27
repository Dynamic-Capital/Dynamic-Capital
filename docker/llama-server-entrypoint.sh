#!/usr/bin/env bash
set -euo pipefail

if [[ "${LLAMA_MODEL:-}" == "" ]]; then
  cat <<'MSG' >&2
[llama.cpp] Missing LLAMA_MODEL env var.
Provide the absolute path to a GGUF model file via LLAMA_MODEL. For example:

  docker run -e LLAMA_MODEL=/models/model.gguf -v /path/to/models:/models:ro \
    dynamic-capital/llama-server:latest
MSG
  exit 1
fi

HOST="${LLAMA_SERVER_HOST:-0.0.0.0}"
PORT="${LLAMA_SERVER_PORT:-8080}"
EXTRA_ARGS=()

if [[ "${LLAMA_SERVER_EXTRA_ARGS:-}" != "" ]]; then
  # shellcheck disable=SC2206
  EXTRA_ARGS=(${LLAMA_SERVER_EXTRA_ARGS})
fi

CMD=(
  "/opt/llama.cpp/bin/llama-server"
  "--model" "${LLAMA_MODEL}"
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
