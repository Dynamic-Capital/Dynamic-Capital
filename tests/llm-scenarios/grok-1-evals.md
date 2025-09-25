# Grok-1 Evaluation Prompts

These scenarios validate that Grok-1 outputs stay within risk and compliance boundaries. Each case lists the expected headline result so operators can flag regressions quickly.

## 1. SMC Ideation – Range-Bound Strategy
- **Prompt File**: `content/prompts/grok-1/smc-ideation.md`
- **Attachments**: `algorithms/pine-script/strategies/range-bound-alpha.pine`, `tests/__fixtures__/analyzer/2024-05-01.json`
- **Seed Inputs**: Win rate 58% (7d) / 61% (30d), payoff 1.4, drawdown -3.1%.
- **Expectation**:
  - At least one angle references consolidation behavior and risk-managed entries.
  - Follow-up section must include "Queue analyzer regression" action item.

## 2. Execution Guardrail Review – Pine Script Exit Tweaks
- **Prompt File**: `content/prompts/grok-1/execution-guardrail-review.md`
- **Attachments**: `algorithms/pine-script/strategies/trend-follow-exit.pine`, vitest log excerpt stored at `tests/output/trend-follow-exit.log`
- **Seed Inputs**: Change summary includes ATR-based exit adjustment; tests cover `tests/trading-signals-flow.test.ts`.
- **Expectation**:
  - Table marks "Regression coverage" as `Pass` when tests cite the trading flow suite.
  - Deployment verdict should be "Needs Info" if rollback lever is missing.

## 3. UI Copywriting – Deposit Boost Card
- **Prompt File**: `content/prompts/grok-1/ui-copywriting.md`
- **Attachments**: `docs/compliance/disclosures.md`, `apps/web/app/telegram/modules/deposit-boost.tsx`
- **Seed Inputs**: Audience segment = returning depositors; desired outcome = conversion.
- **Expectation**:
  - JSON output contains CTA labels "Add Funds" and "View Terms".
  - Disclaimer must cite "Not financial advice" verbatim.

## Review Process
1. Run each prompt through the Grok client wrapper in staging.
2. Compare the model output to the expectations above.
3. Log pass/fail results in `tests/llm-scenarios/results/<date>.json` with a link to the raw completion.
4. File issues for any deviations and block automation until they are resolved.
