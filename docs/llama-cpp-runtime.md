# llama.cpp Runtime Integration

This guide explains how Dynamic Capital vendors and deploys
[ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp) for local inference
workloads. It complements the high-level plan in
[`language-quant-integration-guide.md`](./language-quant-integration-guide.md)
with actionable steps for operators and CI pipelines.

## 1. Sync the Vendor Snapshot

1. Ensure `git` and `deno` are installed locally.
2. Run the helper script to hydrate `third_party/llama.cpp/vendor`:

   ```bash
   deno run -A scripts/sync-llama-cpp.ts --force
   ```

   - The script pins commit `72b24d96c6888c609d562779a23787304ae4609c`.
   - Non-essential directories (bindings, CI configs, large example suites) are
     pruned by default. Pass `--no-prune` to keep the full upstream tree.
   - `third_party/llama.cpp/version.json` records the synced commit metadata for
     audit and reproducibility.

## 2. Build the Container Image

The repository ships with `docker/llama.cpp.Dockerfile`, optimized for CPU-only
inference and a minimal runtime surface. To produce an image locally:

```bash
docker build \
  --file docker/llama.cpp.Dockerfile \
  --tag dynamic-capital/llama-server:dev \
  ..
```

Key build arguments:

- `LLAMA_CPP_COMMIT` (default: `72b24d96c6888c609d562779a23787304ae4609c`) keeps
  the container aligned with the vendor metadata.
- `BASE_IMAGE` lets you swap the Ubuntu base for a CUDA-enabled image if GPU
  acceleration is required downstream.

## 3. Run the Server via Docker Compose

An optional `llama-server` service is available behind the `llama` profile in
`docker/docker-compose.yml`. To launch it alongside the main stack:

```bash
mkdir -p models
# Copy or link your GGUF checkpoint into ./models first.
docker compose --profile llama up llama-server
```

Environment knobs exposed by `docker/llama-server-entrypoint.sh`:

- `LLAMA_MODEL` (required): absolute path of the mounted GGUF model file.
- `LLAMA_SERVER_HOST` (default `0.0.0.0`): listen address for the HTTP server.
- `LLAMA_SERVER_PORT` (default `8080`, overridden to `8081` in the compose
  file).
- `LLAMA_SERVER_EXTRA_ARGS`: optional additional flags (e.g.
  `"--ctx-size 4096"`).

Additional CLI flags can be appended via the Compose `command` stanza. See the
[upstream server README](https://github.com/ggml-org/llama.cpp/tree/master/examples/server)
for the full option matrix.

## 4. Operational Tips

- Always verify model licensing before distributing checkpoints alongside the
  container image.
- Update `third_party/llama.cpp/version.json` in Git whenever the pinned commit
  changes so downstream automation can detect upgrades.
- For GPU deployments, inherit from this Dockerfile and enable cuBLAS
  (`-DLLAMA_CUBLAS=ON`).
- Keep `LLAMA_SERVER_EXTRA_ARGS` minimal in production; prefer explicit Compose
  overrides committed to infrastructure-as-code.

## 5. Troubleshooting

- **`git` missing** – install it before running the sync script.
- **Model path errors** – the entrypoint refuses to start without `LLAMA_MODEL`.
  Confirm that the host directory is mounted read-only and the file suffix is
  `.gguf`.
- **High memory usage** – tune context and batch sizes via
  `LLAMA_SERVER_EXTRA_ARGS` or Compose command overrides.
