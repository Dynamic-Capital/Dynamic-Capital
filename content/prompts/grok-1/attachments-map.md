# Grok-1 Prompt Attachment Map

Use this matrix to ground Grok-1 responses in the most recent trading, analyzer, and compliance artifacts.

| Context Need | Preferred Artifact | Location | Refresh Cadence |
| --- | --- | --- | --- |
| Strategy definitions | Latest Pine Script plus change log | `algorithms/pine-script/strategies/<name>.pine` | Update with every PR |
| Analyzer traces | JSON export from analyzer regression suite | `tests/__fixtures__/analyzer/<date>.json` | Nightly after regression run |
| TradeConfig logs | Sanitized log bundle | `algorithms/vercel-webhook/logs/<yyyymmdd>.ndjson` | Upload after each deployment |
| Compliance guardrails | Disclosures and limitations | `docs/compliance/disclosures.md` | Review weekly |
| Glossary references | Member-facing term definitions | `docs/trading-glossary-index.md` | Monthly or when new term ships |
| Broadcast history | Prior copy for context | `broadcast/history/<yyyymmdd>.md` | After each broadcast |

## Attachment Workflow
1. Pull the latest artifacts listed above before invoking a Grok prompt.
2. Compress large NDJSON or trace exports using `zstd` before uploading to the prompt attachment store.
3. Store files in the `grok-1` bucket within the secured artifact store (`s3://dynamic-capital-grok/attachments/`).
4. Record the uploaded object key and checksum in `content/prompts/grok-1/history/index.json` for auditability.
5. Reference the attachment identifiers inside the prompt preamble so Grok-1 can cite the material.
