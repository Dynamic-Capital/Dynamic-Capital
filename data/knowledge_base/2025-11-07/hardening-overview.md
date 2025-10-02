# Dynamic AI Knowledge Base Hardening Overview

This drop captures the operational upgrades applied to the Dynamic AI knowledge
base in November 2025. It consolidates the revised ingestion workflow,
governance checkpoints, and telemetry targets that keep retrieval-augmented
agents trustworthy as the corpus scales.

## Objectives

- **Normalize metadata** across drops so the ingestion pipeline can infer
  document classes, compliance tier, and downstream retention policies without
  manual tagging.
- **Tighten evaluation gates** by pairing every ingestion batch with retrieval
  and answer-quality baselines for the affected topic slices.
- **Automate drift detection** through weekly vector health snapshots and
  failing guardrail triggers routed to the Knowledge Ops channel.

## Architecture Updates

1. **Dual-phase ingestion**
   - Phase 1 streams raw artefacts into the staging lake with SHA-256
     signatures, preserving the original folder hierarchy in
     `data/knowledge_base/raw/`.
   - Phase 2 promotes normalized documents into `processed/` once format
     validators, personally identifiable information (PII) scanners, and
     taxonomy annotators pass.
2. **Schema harmonization**
   - All JSONL corpora now conform to the `knowledge_base_record_v3` schema with
     fields for `source_attribution`, `language_tags`, `jurisdiction`, and
     `retrieval_embeddings` metadata.
   - Markdown knowledge capsules adopt a front-matter block exposing ownership,
     update cadence, and RAG guardrails.
3. **Vector freshness telemetry**
   - Introduced a `vector_refresh.log` ledger capturing the embedder version,
     sentence window size, and chunk overlap for each re-indexing run.
   - Added weekly Grafana alerts that fire when any collection drifts below the
     0.92 recall floor measured against the regression harness.

## Governance Controls

- **Drop acceptance checklist** embedded in `enrichment-checklist.md` ensures
  provenance, licensing, and evaluation notes accompany the artefacts.
- **Lineage manifests** require cross-linking to OneDrive item IDs or external
  registry URLs, unlocking automated revalidation when upstream sources change.
- **Access reviews** enforce quarterly audits of who can modify staging and
  production buckets, with diffs recorded in the security changelog.

## Next Actions

- Roll the normalized schema to legacy drops prior to 2025-08 to maintain RAG
  compatibility.
- Extend the telemetry exporter so refresh ledgers stream to the central data
  warehouse for longitudinal analysis.
- Pilot a `temporal-slices` view in the knowledge base API that exposes
  time-bound subsets for scenario simulations.
