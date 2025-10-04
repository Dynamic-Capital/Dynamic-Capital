# Dynamic Translation Engine Guide

## Overview

The dynamic translation engine coordinates glossary enforcement, translation
memory, and model fallbacks to provide consistent localisation output for
Dynamic Capital workloads. It exposes both eager and lazy execution paths so
analysts can choose the right trade-off between throughput and memory footprint.

## API Summary

| Helper                       | Description                                                                                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `translate(request)`         | Translates a single `TranslationRequest`, applying glossary substitutions and translation memory matches before falling back to the configured model.                              |
| `translate_batch(requests)`  | Eagerly evaluates an iterable of requests and returns a tuple of `TranslationResult` objects. Internally delegates to the streaming helper for consistent validation and scoring.  |
| `translate_stream(requests)` | Lazily yields `TranslationResult` objects on demand. Requests are evaluated only when the iterator advances, which keeps peak memory usage low and enables incremental processing. |

## Usage Examples

```python
from dynamic_translation.engine import DynamicTranslationEngine, TranslationRequest

engine = DynamicTranslationEngine(
    supported_languages=("en", "fr"),
)

# Streaming — preferred for long-running jobs and queue consumers
requests = (
    TranslationRequest(text=text, source_language="en", target_language="fr")
    for text in large_text_source()
)

for result in engine.translate_stream(requests):
    persist_result(result)

# Batch — convenient for short, finite inputs when tuple semantics are easier
results = engine.translate_batch(
    (
        TranslationRequest(
            text="Launch the Dynamic Capital playbook.",
            source_language="en",
            target_language="fr",
        ),
        TranslationRequest(
            text="Launch the treasury dashboard",
            source_language="en",
            target_language="fr",
        ),
    )
)
```

## When to Use Streaming vs Batch

- **Use `translate_stream`** when processing arbitrarily long iterables,
  integrating with task queues, or when translation feedback should be surfaced
  incrementally to downstream systems.
- **Use `translate_batch`** for short analytical workloads, synchronous API
  calls, or when downstream code expects an in-memory tuple for further
  aggregation.
- Both helpers share the same validation, glossary, and memory-scoring rules,
  ensuring identical translation quality regardless of the execution mode.

## Operational Notes

- Configure a custom translator via `engine.configure_translator(...)` if you
  need to override the default model backend.
- Call `engine.clear_translation_cache()` after a deployment that updates
  translator weights to guarantee fresh outputs.
- Translation memory entries can be appended through
  `engine.add_memory_entries(...)`; these entries are considered by both the
  batch and streaming paths before invoking the fallback model.
- Refer to the [rollout plan](dynamic_translation_rollout_plan.md) for
  stakeholder communication checkpoints and the feedback intake workflow that
  governs future engine enhancements. A living snapshot of open feedback and
  mitigation owners lives in the
  [LOC-STREAM tracker log](dynamic_translation_loc_stream_snapshot.md).
