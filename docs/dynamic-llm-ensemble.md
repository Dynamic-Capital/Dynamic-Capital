# Dynamic LLM Ensemble

## Overview

Dynamic Capital's LLM ensemble coordinates multiple reasoning providers to
refine trading narratives and produce institutional-grade decision support. The
ensemble layers hosted APIs and local inference backends to balance latency,
cost, and interpretability while maintaining a consistent prompt contract.

## Ensemble Members

- **Dolphin LLaMA.cpp Adapter** — defined in
  `dynamic/intelligence/ai_apps/dolphin_adapter.py`
  - Wraps locally hosted Dolphin checkpoints with configurable sampling
    parameters and prompt templates tailored for market reasoning.
  - Lazily downloads or validates `.gguf` weights before instantiating the
    `llama_cpp` runtime and agent interface.
- **Ollama Adapter** — implemented in
  `dynamic/intelligence/ai_apps/ollama_adapter.py`
  - Sends structured prompts to a running Ollama server, forwarding optional
    generation settings (`keep_alive`, model options) and prior dialogue
    context.
  - Provides resilient error handling for network failures and malformed
    responses via `LLMIntegrationError`.
- **Kimi-K2 Adapter** — located at
  `dynamic/intelligence/ai_apps/kimi_k2_adapter.py`
  - Targets the hosted Moonshot Kimi-K2 API with chat-formatted payloads and
    dynamic headers for key management.
  - Supports configurable decoding controls (`temperature`, `top_p`,
    `max_output_tokens`) and gracefully extracts text content across message
    variants.

## Configuration

Each adapter exposes a dataclass-based configuration that can be adjusted when
instantiating the object. The examples below demonstrate common deployment
paths; feel free to tailor them to your runtime and network boundaries.

### Dolphin LLaMA.cpp

1. Install the optional dependencies that expose the LLaMA.cpp bindings:

   ```bash
   pip install "llama-cpp-python>=0.2" "llama-cpp-agent>=0.2"
   ```

2. Download a Dolphin `.gguf` checkpoint into the directory specified by
   `DolphinModelConfig.local_dir` (defaults to `models/`). Alternatively, enable
   `auto_download=True` to fetch the weights the first time the adapter is used.

3. Instantiate the adapter with any overrides that match your hardware:

   ```python
   from pathlib import Path

   from dynamic.intelligence.ai_apps import DolphinLlamaCppAdapter, DolphinModelConfig

   dolphin = DolphinLlamaCppAdapter(
       model_config=DolphinModelConfig(
           filename="Dolphin3.0-Qwen2.5-1.5B-Q4_K_M.gguf",
           local_dir=Path("/opt/dynamic/models"),
           gpu_layers=20,
           threads=8,
       ),
       auto_download=True,
   )
   ```

   Key fields in `DolphinModelConfig` control how the gguf checkpoint is
   executed:

   - `context_window`, `batch_size`, and `thread_batch` should be sized to your
     CPU budget—larger windows and batches improve reasoning depth but increase
     memory pressure.
   - `gpu_layers` offloads layers to the GPU when compiled with CUDA/Metal; set
     it to `0` for CPU-only deployments.
   - `threads` governs the llama.cpp CPU worker pool. Match it to the available
     cores for best throughput.

   Sampling behaviour is controlled independently through
   `DolphinSamplingConfig`, and the adapter exposes `ensure_backend()` for
   ahead-of-time warmups or health checks before the ensemble fans out work.

### Ollama Adapter

1. Start an Ollama server on the host of your choice and pull the desired model:

   ```bash
   ollama serve &
   ollama pull llama3
   ```

2. Point the adapter at your server and customise request options as needed:

   ```python
   from dynamic.intelligence.ai_apps import OllamaAdapter, OllamaConfig

   ollama = OllamaAdapter(
       config=OllamaConfig(
           host="http://edge-gateway.internal:11434",
           model="llama3",
           keep_alive=300,
           options={"num_predict": 768, "temperature": 0.6},
       ),
       timeout=15,
   )
   ```

   The adapter requires the `requests` package to be available in the Python
   environment that executes the integration code (`pip install requests`).

### Kimi-K2 Adapter

1. Obtain a Moonshot (Kimi) API key and expose it to the runtime, for example:

   ```bash
   export KIMI_K2_API_KEY="sk-..."
   ```

2. Provide the key (and any regional routing overrides) when constructing the
   adapter:

   ```python
   import os
   from dynamic.intelligence.ai_apps import KimiK2Adapter, KimiK2Config

   kimi = KimiK2Adapter(
       config=KimiK2Config(
           api_key=os.environ["KIMI_K2_API_KEY"],
           base_url="https://api.moonshot.cn/v1",
           path="/chat/completions",
           temperature=0.5,
           extra_body={"presence_penalty": 0.1},
       ),
       timeout=30,
   )
   ```

   As with the Ollama integration, ensure the `requests` dependency is installed
   wherever the adapter is executed (`pip install requests`).

## Orchestration Workflow

1. Build market context and base reasoning via the fusion stack
   (`dynamic/intelligence/ai_apps/core.py` and
   `dynamic/intelligence/ai_apps/fusion.py`).
2. Feed the reasoning into one or more adapters to obtain refined narratives;
   each adapter exposes an `enhance_reasoning` method that maintains a uniform
   signature for easy fan-out execution.
3. Aggregate responses by confidence, latency, or domain heuristics inside the
   `DynamicFusionAlgo` or downstream automation to select the preferred
   narrative for trading, risk, or research workflows.
