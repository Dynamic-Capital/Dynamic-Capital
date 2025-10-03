export interface OpenSourceEntry {
  readonly name: string;
  readonly description: string;
  readonly homepage: string;
  readonly license: string;
  readonly tags: readonly string[];
}

export interface OpenSourceCatalogData {
  readonly helpers: readonly OpenSourceEntry[];
  readonly languageModels: readonly OpenSourceEntry[];
  readonly adapters: readonly OpenSourceEntry[];
  readonly toolkits: readonly OpenSourceEntry[];
}

export const OPEN_SOURCE_CATALOG: OpenSourceCatalogData = {
  helpers: [
    {
      name: "LangChain",
      description:
        "Composable orchestration framework for building production-grade LLM applications.",
      homepage: "https://www.langchain.com/",
      license: "MIT",
      tags: ["workflow", "agents", "retrieval"],
    },
    {
      name: "Haystack",
      description:
        "End-to-end NLP framework with pipelines for retrieval augmented generation and question answering.",
      homepage: "https://haystack.deepset.ai/",
      license: "Apache-2.0",
      tags: ["rag", "pipelines", "search"],
    },
    {
      name: "LlamaIndex",
      description:
        "Data framework that connects private data sources to LLMs via modular indices and query engines.",
      homepage: "https://www.llamaindex.ai/",
      license: "MIT",
      tags: ["indices", "connectors", "retrieval"],
    },
  ],
  languageModels: [
    {
      name: "Mistral 7B",
      description:
        "Compact transformer released by Mistral AI with strong instruction-following and coding skills.",
      homepage: "https://mistral.ai/news/announcing-mistral-7b/",
      license: "Apache-2.0",
      tags: ["general-purpose", "7b", "transformer"],
    },
    {
      name: "Mixtral 8x7B",
      description:
        "Sparse mixture-of-experts architecture delivering high quality reasoning with efficient inference.",
      homepage: "https://mistral.ai/news/mixtral-of-experts/",
      license: "Apache-2.0",
      tags: ["moe", "reasoning", "32k"],
    },
    {
      name: "Phi-2",
      description:
        "Microsoft research model optimised for reasoning and instruction tuning with permissive weights.",
      homepage:
        "https://www.microsoft.com/en-us/research/blog/phi-2-the-surprising-power-of-small-language-models/",
      license: "MIT",
      tags: ["small", "reasoning", "instruction-tuned"],
    },
  ],
  adapters: [
    {
      name: "llama.cpp",
      description:
        "Portable inference runtime for running GGML quantised LLMs on commodity CPU and GPU hardware.",
      homepage: "https://github.com/ggerganov/llama.cpp",
      license: "MIT",
      tags: ["inference", "ggml", "edge"],
    },
    {
      name: "vLLM",
      description:
        "High-throughput serving engine that provides OpenAI-compatible APIs for open-weight models.",
      homepage: "https://github.com/vllm-project/vllm",
      license: "Apache-2.0",
      tags: ["serving", "api", "throughput"],
    },
    {
      name: "Text Generation Inference",
      description:
        "Hugging Face production inference server with tensor parallelism, streaming, and quantisation.",
      homepage: "https://github.com/huggingface/text-generation-inference",
      license: "Apache-2.0",
      tags: ["deployment", "hugging-face", "quantisation"],
    },
  ],
  toolkits: [
    {
      name: "AutoGPT",
      description:
        "Experimental open multi-agent system that chains tools and memory for autonomous task execution.",
      homepage: "https://github.com/Significant-Gravitas/AutoGPT",
      license: "MIT",
      tags: ["agents", "planning", "autonomous"],
    },
    {
      name: "CrewAI",
      description:
        "Framework for coordinating specialised LLM agents with role-based collaboration and planning.",
      homepage: "https://github.com/joaomdmoura/crewAI",
      license: "MIT",
      tags: ["multi-agent", "coordination", "planning"],
    },
    {
      name: "LangGraph",
      description:
        "LangChain extension for building cyclic workflows, stateful agents, and guarded tool execution.",
      homepage: "https://github.com/langchain-ai/langgraph",
      license: "MIT",
      tags: ["workflow", "graph", "guardrails"],
    },
  ],
} as const;

export type OpenSourceCategory = keyof OpenSourceCatalogData;
