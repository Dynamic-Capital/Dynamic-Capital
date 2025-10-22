Open WebUI + Ollama (Local LLM UI)
==================================

This tooling spins up Open WebUI connected to an Ollama backend using Docker.

Prerequisites
-------------
- Docker Desktop (or Docker Engine) installed and running
- `docker compose` available in your shell

Quick Start
-----------
- Copy any needed env overrides from `.env.example` to your `.env` (optional)
- Start the stack:

  npm run openwebui:up

- Open the UI at:

  http://localhost:8090

Useful commands
---------------
- View logs:

  npm run openwebui:logs

- Stop and remove containers:

  npm run openwebui:down

Configuration
-------------
- Ports can be overridden via environment variables:
  - `OPEN_WEBUI_PORT` (default `8090`)
  - `OLLAMA_PORT` (default `11434`)
- Models are stored in a named Docker volume `ollama` and persist across runs.

First‑time model pull
---------------------
Open WebUI will list models once Ollama has them available. To pull a model:

  docker exec -it ollama ollama pull llama3.2:3b

Replace `llama3.2:3b` with any supported model tag.

Notes
-----
- For GPU acceleration, update the `ollama` service per upstream docs
  (e.g., use `runtime: nvidia` and device mappings). This file defaults to CPU
  for portability.
- The stack runs on an isolated network so `OLLAMA_BASE_URL` is set to the
  internal hostname `http://ollama:11434`.

