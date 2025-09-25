# SMC Ideation Prompt Template (Grok-1)

## Objective
Guide Grok-1 to propose Structured Market Commentary (SMC) experiments that align with Dynamic Capital's risk posture, audience tone, and release schedule.

## Required Context Blocks
1. **Strategy Snapshot** – Paste the current TradingView strategy description or MT5 playbook summary.
2. **Recent Performance Metrics** – Include win rate, payoff ratio, and drawdown windows (7d/30d).
3. **Release Guardrails** – Copy the latest broadcast or mini app tone guidelines.
4. **Pending Compliance Flags** – Reference any items from `docs/compliance/` impacting messaging.

## Prompt Skeleton
```
You are the research partner for Dynamic Capital's automation desk.
- Strategy: <strategy name>
- Performance (7d/30d win rate, payoff, drawdown): <metrics>
- Compliance considerations: <bullet list>
- Delivery surface: <Telegram broadcast | Mini App card | Analyzer memo>

Tasks:
1. Recommend two fresh narrative angles that reinforce trust without overpromising.
2. Suggest one quantitative insight sourced from TradeConfig or analyzer traces to validate the angle.
3. Flag any operational follow-ups (new alerts, QA runs) needed before member-facing release.

Respond in markdown with `## Angle`, `## Insight`, and `## Follow-ups` headings. Keep each section under 120 words.
```

## Usage Notes
- Maintain the guardrail tone defined in `content/prompts/shared/tone.md` when available.
- If metrics are missing, instruct Grok-1 to request them rather than fabricating values.
- Archive accepted outputs under `content/prompts/grok-1/history/` with a timestamped filename for future audits.
