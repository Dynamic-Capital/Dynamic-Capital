# Intelligence · Dynamic AGI

`dynamic/intelligence/agi/` powers the self-improving intelligence loop. It
combines model training automation, local evaluation workflows, and deployment
helpers for AGI services.

Contents overview:

- `model.py`: Core AGI orchestrator with identity metadata and signal blending.
- `build.py`: CLI utilities for producing governance-friendly AGI payloads.
- `self_improvement.py`: Continuous improvement loop coordinating diagnostics
  and retraining.
- `benchmarking.py`: Loads benchmark payloads, grades domain health, and crafts
  enrichment plans with curated datasets.
- `knowledge_base.py`: Canonical knowledge payloads that seed DAI, DAGI, and
  DAGS fine-tuning snapshots.
- `qa.py`: Builds domain-focused Q&A sessions that synthesise knowledge and
  oversight guidance for operators.
- Auxiliary helpers for fine-tuning, local experimentation, and rollout.

Document new AGI routines here so downstream operations understand required
inputs and expected outputs.

## Benchmark-driven fine-tuning

Use `benchmarking.prepare_benchmark_plan_from_source` to translate a benchmark
configuration (JSON payload or file path) into domain-specific remediation
plans. The helper returns:

- per-domain grade, severity, and metric deficits;
- curated `LearningSnapshot` objects from `knowledge_base` that close coverage,
  accuracy, and governance gaps;
- a synthetic `fine_tune_until_average` projection showing the expected
  convergence trajectory.

`FineTuneTrainer.fine_tune_from_benchmark` wraps these primitives so pipeline
runners can benchmark DAI, DAGI, and DAGS, ingest the missing knowledge, and
harvest batches without manually wiring datasets.

## Operational Q&A sessions

`qa.build_domain_qa_session` translates the curated knowledge base into a
structured transcript with three anchors:

1. Capabilities and current performance metrics.
2. Negative and positive improvement signals to prioritise.
3. Human oversight, awareness, and metacognition guidance.

Use these sessions to brief operators ahead of fine-tune or deployment cycles
so the qualitative context travels with the quantitative benchmarks.
