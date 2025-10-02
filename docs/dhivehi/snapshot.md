# Dhivehi Language Support Snapshot

## Journey Coverage

- **Capture:** Thaana-aware input widgets and OCR adapters collect customer
  messages across web, mobile, and scanned artifacts.
- **Translate:** Translation-memory seeds and neural engines convert Dhivehi ↔
  English while preserving finance-specific terminology.
- **Resolve:** Localized tooling enables agents to read, respond, and escalate
  tickets without script ambiguity.
- **Learn:** Feedback loops enrich the glossary, improve speech models, and
  expand QA guardrails for future interactions.

## Terminology & Noun Assets

| Asset              | Status                                                                   | Notes |
| ------------------ | ------------------------------------------------------------------------ | ----- |
| Translation Memory | ✅ Seed corpus of banking, aid, and support nouns tagged with domains.   |       |
| Glossary           | ✅ Includes variants, domain flags, and provenance for consistent reuse. |       |
| Domain Taxonomy    | 🚧 Expanding coverage for insurance and travel subdomains.               |       |

## Character Handling

- Bidirectional transliteration helpers normalize between Latin digraphs and
  Thaana consonants/vowels.
- Script detection guards against mixed-script input before translation.
- Thaana rendering validated across RTL layouts in core channels (web, email).

## Punctuation & Symbols

- Localized equivalents for commas, semicolons, and question marks maintain
  readability in RTL context.
- Mirrored bracket pairs and paired punctuation map to Arabic-script glyphs.
- Normalization step strips stray Latin punctuation before template insertion.

## Speech & Audio

- Automated speech recognition models fine-tuned on Dhivehi contact-center
  audio.
- Text-to-speech prototypes generate Dhivehi prompts for IVR flows; awaiting
  production latency benchmarks.

## Quality Assurance

- QA guardrails evaluate transliteration accuracy, glossary adherence, and RTL
  layout regressions.
- Continuous evaluation captures agent feedback to retrain translation memory
  and ASR models.

## Next Steps

1. Extend domain taxonomy to cover fintech partners.
2. Harden TTS latency for IVR deployments.
3. Publish RTL accessibility checklist for partner integrations.

## Simulation

- Run `python -m dynamic_translation.dhivehi_simulation "ބާވަތް ބަލާލުން."` to generate a sample Dhivehi → English translation trace with glossary coverage, memory provenance, and post-edit prompts.
