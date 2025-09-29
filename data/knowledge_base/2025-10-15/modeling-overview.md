# October 2025 Retrieval Strategy Overview

The October drop introduces a richer set of customer narrative documents that
support two-pass retrieval:

1. **Context assembly:** Build a candidate set using cosine similarity over the
   refreshed embeddings and enforce department diversity.
2. **Grounding refinement:** Re-rank the candidates with the `summarize-v2`
   reranker to prioritize entries with explicit resolution guidance.

Keep the markdown file synchronized with `knowledge_base/2025-10-15` on OneDrive
when updates land in the shared workspace.
