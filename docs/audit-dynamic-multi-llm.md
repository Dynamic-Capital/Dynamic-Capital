# Audit: Dynamic Multi-LLM API Orchestration

## Scope and objective
This audit reviews the dynamic multi-LLM orchestration primitives that power the Dynamic Capital tooling suite. It evaluates how API requests are normalised, how model calls are abstracted, and how outputs from heterogeneous LLMs are merged, with emphasis on the components exposed under `algorithms/python`.

## Core orchestration building blocks
- **`LLMConfig` encapsulates invocation parameters.** Each model configuration wraps a `CompletionClient` plus temperature, nucleus sampling, token limits, and optional extra parameters. Executing `LLMConfig.run` records the exact prompt, response, and arguments inside an immutable `LLMRun`, creating a consistent audit trail for every API-triggered completion.【F:algorithms/python/multi_llm.py†L38-L77】
- **`parse_json_response` hardens downstream parsing.** Instead of assuming strict JSON, the helper tolerates free-form answers by carving out the first balanced JSON object or falling back to a labelled string payload, ensuring the orchestrator never crashes on minor format drift.【F:algorithms/python/multi_llm.py†L79-L121】
- **`serialise_runs` surfaces observability metadata.** Serialising stored runs yields a JSON blob suitable for API responses or logging sinks so that clients can inspect prompts, responses, and parameters after the fact.【F:algorithms/python/multi_llm.py†L123-L139】

## End-to-end workflow patterns
- **Dynamic protocol planning pipeline.** `DynamicProtocolPlanner.generate_protocol` seeds an empty multi-horizon plan, executes the architect model, then progressively fans out to optional risk, psychology, and review models. Each response is parsed and merged before the consolidated plan is deduplicated and annotated for downstream use.【F:algorithms/python/dynamic_protocol_planner.py†L356-L452】
- **Shared merging utilities.** Helper functions such as `_reduce_payload` and `_deduplicate_plan` (not reproduced here) ensure every horizon/category only retains unique, non-empty guidance, matching the merge-and-deduplicate discipline described in the earlier design note.【F:algorithms/python/dynamic_protocol_planner.py†L212-L336】
- **Reusable orchestration pattern across tooling.** Other domain-specific orchestrators (e.g. the project FAQ generator, trading data processor, and dual-advisor workflow) import the same utilities to normalise structured payloads, collect bullet lists, and collate run metadata, demonstrating consistent reuse of the algorithm across APIs.【F:algorithms/python/project_faq_generator.py†L1-L131】【F:algorithms/python/trading_data_processor.py†L1-L109】【F:algorithms/python/grok_advisor.py†L1-L420】

## Observations and recommendations
- **Strengths:**
  - Clear separation between client configuration, execution, and aggregation keeps models swappable without touching orchestration logic.
  - Defensive parsing plus deduplication guards the API surface from malformed LLM responses and repeated suggestions.
  - Serialised run metadata provides the transparency required for desk-level audit logs.
- **Opportunities:**
  - Consider extending `CompletionClient` with optional streaming hooks for future token-level telemetry without breaking existing implementations.
  - The orchestrators could expose explicit schema validators (e.g. Pydantic) before responses are returned to calling services, further tightening contract guarantees.
  - To improve observability, push `serialise_runs` output into structured logging at call sites, ensuring downstream services can trace prompts even when API clients omit debug flags.

## Testing posture
The repository already includes targeted unit tests for these orchestrators under `algorithms/python/tests`, covering routing logic, aggregation behaviour, and error handling for the multi-LLM flows. Keeping these tests up-to-date when extending the ensemble or adding new agents will preserve regression confidence.【F:algorithms/python/tests/test_project_faq_generator.py†L1-L160】【F:algorithms/python/tests/test_dynamic_protocol_planner.py†L1-L152】【F:algorithms/python/tests/test_dct_token_sync.py†L1-L602】
