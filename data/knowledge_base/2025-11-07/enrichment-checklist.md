# Knowledge Base Enrichment Checklist

Use this checklist whenever new Dynamic AI knowledge base artefacts are prepared
for promotion. It complements the automated validation suite and captures manual
review signals that still require human judgement.

## Pre-ingestion

- [ ] Verify the upstream source repository, OneDrive item, or vendor dataset
      allows redistribution under our knowledge base license stack.
- [ ] Capture SHA-256 checksums for every file staged in `raw/` and record them
      in the lineage manifest.
- [ ] Assign or update taxonomy tags (`domain`, `jurisdiction`,
      `audience_level`, `compliance_tier`) so the downstream routing rules can
      auto-apply security policies.
- [ ] Run
      `node scripts/checklists/knowledge-base-drop-verify.mjs --drop
      2025-11-07`
      to confirm the manifest, local mirror, and provenance registry stay in
      sync before ingestion.

## Normalisation pass

- [ ] Run the format validator suite: `npm run lint:kb data/knowledge_base`
      (optionally add `--strict` or `--min-tokens 80`) to confirm schema
      compatibility for JSONL/CSV payloads and
      `python tools/validate_markdown.py` for markdown capsules.
- [ ] Execute `python ml/validate_embeddings.py --drop 2025-11-07` to ensure
      chunking, embedder version, and vector dimensionality match the active
      retrieval stack.
- [ ] Populate the RAG regression harness baseline by replaying the
      `rag-sanity-playbook.md` prompts against the prior production index.

## Acceptance gate

- [ ] Ensure evaluation metrics meet or exceed the thresholds defined in
      `ingestion-metrics.json` (recall ≥ 0.92, answer precision ≥ 0.88).
- [ ] Attach reviewer sign-off (name, date, decision) to the lineage manifest.
- [ ] Update `data/knowledge_base/index.json` and re-run
      `npx tsx scripts/knowledge_base/sync-readme.ts` to publish the refreshed
      overview.
