# Grok-1 Token Governance

Define consistent budgets and truncation rules before running automated jobs so Grok-1 prompts remain stable.

## Token Budgets
- **SMC Ideation** – 2,400 token request budget, 1,200 token completion cap. Reserve 200 tokens for system and attachment metadata.
- **Execution Guardrail Review** – 1,800 token request budget, 900 token completion cap. Enforce streaming to detect runaway reasoning.
- **UI Copywriting** – 1,200 token request budget, 600 token completion cap. Reject completions exceeding 650 tokens to prevent verbose JSON.

## Truncation Rules
1. Trim analyzer trace attachments to the latest 50 events before upload.
2. Summarize TradeConfig logs older than 48 hours into bullet digests before including in the prompt body.
3. Discard historical compliance notes once the associated checklist is resolved to keep prompt context fresh.

## Paraphrase Safeguards
- Require Grok-1 to quote numeric metrics verbatim from attachments; configure the client to diff responses against source data.
- Deny completions that attempt to restate regulated disclaimers—pull the disclaimer text directly from `docs/compliance/disclosures.md` instead.
- For Telegram copy, run outputs through `tests/llm-scenarios/grok-1-evals.md` to ensure disclaimers are preserved word-for-word.

## Implementation Checklist
- Enforce budgets via `utils/llm/grok.ts` once the Grok client wrapper lands.
- Add automated truncation to the prompt builder script before queuing jobs.
- Extend the QA checklist so operators verify token usage stays within these envelopes after each release.
