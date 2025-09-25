# Execution Guardrail Review Prompt (Grok-1)

## Objective
Validate trading automation updates against Dynamic Capital's guardrails before code reaches staging.

## Inputs to Provide
1. **Diff Summary** – Bullet summary of Pine Script / TypeScript changes impacting signal flow.
2. **Risk Controls Snapshot** – Copy of the relevant MT5 Expert Advisor configuration or `queue/` worker overrides.
3. **Test Evidence** – Paste vitest excerpts or analyzer regression logs covering the change.
4. **Rollback Lever** – Note the feature flag, config toggle, or deployment plan available if the change misbehaves.

## Prompt Skeleton
```
You are auditing a proposed automation change.
- Change summary: <bullets>
- Risk controls touched: <details>
- Test evidence: <links or snippets>
- Rollback lever: <flag/config>

Checklist:
1. Identify any missing regression coverage or metrics collection that would reveal adverse behavior within 10 minutes of deploy.
2. Confirm overrides and manual review paths remain available for operators.
3. Recommend additional log fields or Supabase rows to annotate when Grok influenced the decision.

Respond with a table: `Check`, `Status (Pass/Risk)`, `Notes`. Conclude with a single paragraph deployment verdict (Ship / Block / Needs Info).
```

## Usage Notes
- Attach the latest `tests/trading-*` results to reduce repetitive clarifications.
- Prefer referencing existing alert payload fields before inventing new schema.
- Store Grok's verdict alongside the PR in `algorithms/vercel-webhook/REVIEWS.md` for traceability.
