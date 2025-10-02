# RAG Sanity Playbook

This playbook codifies the regression prompts used to validate the Dynamic AI
knowledge base before and after each ingestion wave. It ensures the retrieval
index, embedding configuration, and response ranking remain stable while new
artefacts are promoted.

## How to run

1. Load the baseline prompts into the regression harness:
   ```bash
   python ml/rag_regression.py \
     --prompts data/knowledge_base/2025-11-07/rag-sanity-playbook.md \
     --index dynamic_ai_prod \
     --output tmp/rag_regression_2025-11-07.json
   ```
2. Compare the baseline output with the candidate index generated from the
   staging environment. Use
   `python ml/compare_rag_runs.py --baseline ... --candidate ...` to compute
   recall, precision, and hallucination deltas.
3. Flag any regression where:
   - Retrieval recall drops by more than 3% for a topic slice.
   - Hallucination rate increases by ≥ 2 percentage points.
   - Latency SLO (P95 ≤ 2.3s) is violated under identical hardware settings.

## Prompt set

### Market structure recall

- _"Summarise the three-step market structure checklist for aligning H4 and M15
  execution windows."_
- _"Which guardrails prevent overtrading when the global macro regime is
  neutral?"_

### Sovereign AI governance

- _"List the minimum telemetry signals required before promoting a sovereign AI
  dataset to production."_
- _"How often must access reviews be performed for knowledge base staging
  buckets?"_

### Vector integrity

- _"What embedder version powers the November 2025 refresh and what chunk size
  was used?"_
- _"Where can I find the vector refresh ledger for audit purposes?"_

## Expected answers (abridged)

| Prompt theme            | Key facts to confirm                                                   |
| ----------------------- | ---------------------------------------------------------------------- |
| Market structure recall | Three-step checklist (top-down scan, execution alignment, risk guard). |
| Sovereign AI governance | Telemetry signals (recall, precision, drift) and quarterly audits.     |
| Vector integrity        | Embedder version `text-embedding-004`, chunk size `768`, ledger path.  |

Investigate discrepancies by inspecting the candidate index build logs and
verifying that the ingest pipeline adhered to the enrichment checklist.
