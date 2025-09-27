# Forex Daily Trading Plan

## Purpose

Operationalize Dynamic Capital's discretionary forex process into a time-boxed routine that can be executed by any trader on the desk. Use this playbook alongside your broker-specific SOPs and account-level risk profile before taking live exposure.

## Session Guardrails

| Control | Default | Triggered Action |
| --- | --- | --- |
| Daily loss cap | -3R | Flatten exposure, end session, log variance driver |
| Max concurrent positions | 2 pairs | Require risk lead sign-off before adding third |
| Economic news blackout | 5 min pre/15 min post high-impact release | Pause all new entries, widen alerts on open trades |
| Spread tolerance | ≤ 1.5× 30-day average | Cancel pending orders, reassess liquidity providers |
| Break protocol | ≥2 execution mistakes in 60 min | Step away for 10 min reset, review checklist |

Document all overrides with timestamp, rationale, and approving stakeholder in the trading journal.

## Daily Execution Checklist

- [ ] Confirm session guardrails, account status, and news blackout windows.
- [ ] Complete pre-market intelligence sweep and update watchlist tiers.
- [ ] Build chart annotations, directional bias, and position sizing limits.
- [ ] Execute London block plan, including alerts/orders and context monitoring.
- [ ] Conduct mid-session review, reconcile logs, and adjust playbook scenarios.
- [ ] Prepare for New York close: scale risk, lock stops, and capture documentation.
- [ ] Journal outcomes, update metrics, and archive session artifacts.

### Verification Protocol

Track completion evidence in the session journal and obtain the appropriate sign-off before moving to the next block.

| Checklist Item | Evidence to Capture | Verification Owner |
| --- | --- | --- |
| Guardrails & account status confirmed | Screenshot of risk dashboard + broker balance snapshot | Risk lead |
| Pre-market intelligence sweep | Annotated calendar excerpt and updated watchlist tiers | Trader |
| Chart annotations and sizing limits | Saved chart template + sizing worksheet export | Trader |
| London execution block | Order blotter excerpt and context notes in 15-minute log | Execution partner |
| Mid-session review | Updated adherence scorecard + revised scenarios summary | Risk lead |
| New York close prep | Checklist photo or digital sign-off + stop adjustment log | Trader |
| Journaling & archiving | Journal PDF, metrics sheet, and storage folder link | Operations |

## Workflow Timeline

### T-90 to T-45 — Pre-Market Intelligence

- [ ] Review the macro calendar (ForexFactory, CME, institutional desk notes) and highlight releases tied to target pairs.
- [ ] Sync overnight reports: prior-session price map, volatility summary, broker notices.
- [ ] Update watchlist tiers (Primary, Secondary, Parked) based on liquidity and catalyst alignment.

### T-45 to T-15 — Chart & Plan Build

- [ ] Annotate support/resistance zones across weekly, daily, and execution time frames.
- [ ] Note key order flow areas (Asia high/low, prior value area, option barriers) and record confidence level (High/Medium/Low).
- [ ] Define the bias for each pair (Bullish, Bearish, Neutral) and pair it with acceptable trade structures (trend, breakout, mean reversion).
- [ ] Calculate permissible position size per pair using current ATR and session R.

### Session Open — Execution Block 1 (London)

- [ ] Confirm spreads are within tolerance and fill quality is acceptable via micro-test order if needed.
- [ ] Deploy resting orders or alerts aligned with the support/resistance and breakout plans.
- [ ] Track market context every 15 minutes: structure shift, momentum divergence, liquidity pockets.
- [ ] Escalate to risk lead if volatility doubles ATR or if news flow contradicts prepared bias.

### Mid-Session Review — Execution Block 2 (London/NY Overlap)

- [ ] Reconcile trade log: realized R, open risk, adherence score.
- [ ] Reassess macro catalysts for the remainder of the session (FOMC speakers, data revisions).
- [ ] Update playbook scenarios: continuation, reversal, chop. Retire setups that no longer meet criteria.

### Final Block — New York Close Prep

- [ ] Scale down risk 60 minutes before session end unless high-conviction catalyst remains.
- [ ] Convert trailing stops to hard levels; remove resting orders that would extend risk past the close.
- [ ] Snapshot charts and DOM/T&S for journal documentation.

## Strategy Modules

### Support & Resistance Module

| Step | Trigger | Execution | Risk Control |
| --- | --- | --- | --- |
| Map levels | Daily open | Identify prior day high/low, weekly VWAP, liquidity pools | Reject levels lacking confluence across ≥2 time frames |
| Confirmation | Price tests level with declining volume | Seek wick rejection + momentum divergence before entry | Cancel idea after two failed tests or close beyond level |
| Trade management | Entry filled | Half-size offload at +1R, trail stop to structure low/high | Hard stop stays beyond last swing; no widening |

### Trend Following Module

| Step | Trigger | Execution | Risk Control |
| --- | --- | --- | --- |
| Bias alignment | 50 EMA above/below 200 EMA | Only take trades in direction of alignment | Stand aside during EMA compression (<0.1% slope) |
| Entry | Pullback to 20 EMA or structure zone | Use limit order with confirmation candle close | If pullback exceeds 1.5× ATR, invalidate |
| Exit | Momentum flattening or higher-timeframe resistance | Scale at +1.5R, move stop to breakeven | Cap total trend trades at 3 per session |

### Breakout Module

| Step | Trigger | Execution | Risk Control |
| --- | --- | --- | --- |
| Range definition | Consolidation ≥ 6 candles, ATR compression | Mark upper/lower boundaries, note catalyst proximity | Avoid breakouts within blackout window |
| Order placement | Price closes within 20% of boundary | Place stop order 0.2 ATR beyond range | Position size assumes slippage of 0.5× ATR |
| Validation | Breakout candle closes beyond level | Trail stop to midpoint after close above/below | Abort if price re-enters range within 2 candles |

### Position Sizing & Risk

1. Compute base lot size: `Lot = (AccountEquity × R%) / (StopDistance × PipValue)`.
2. Adjust for volatility: multiply by `ATR_Current / ATR_30d`. Cap adjustment at ±30%.
3. Record final size, stop, target, and expected R-multiple in ticket template before sending order.

## Monitoring & Logging

- Maintain a live dashboard (spread, ATR, open risk, drawdown). Update every 15 minutes or when trade executed.
- Journal each trade immediately using the template below.
- Capture screenshots: pre-trade plan, entry candle, exit context.
- Log emotional state (1–5) and physiological markers (HRV, focus) at start, midpoint, and end of session.

| Timestamp | Pair | Setup Tag | Direction | Entry / Stop / Target | Size | Result (R) | Adherence (1-5) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 08:32 | EURUSD | Breakout | Long | 1.0872 / 1.0852 / 1.0912 | 1.2 lots | +1.8R | 5 | Cleared CPI risk, volume spike |

## Post-Session Retrospective

1. **Scorecard** — Summarize total R, hit rate, drawdown, and checklist adherence. Flag any guardrail breaches.
2. **Root-cause analysis** — For each losing trade beyond -1R or rule breach, identify whether it was plan, execution, or market driven.
3. **Archive** — Store journal, screenshots, broker statement snippets, and risk log in the session folder (`/journals/YYYY-MM-DD`).
4. **Plan forward** — Draft next-session hypotheses, data to collect, and drills (e.g., replay specific market conditions).

## Discipline Checklist

- [ ] **Patience** — Trade only when all module conditions are satisfied; use timer reminders to avoid over-trading.
- [ ] **Consistency** — Follow the structured timeline; mark deviations in journal.
- [ ] **Risk management** — Reconfirm stops/targets in ticket template before submission and during mid-session review.
- [ ] **Record keeping** — Journal within five minutes of exit, attach evidence, back up to shared drive nightly.
- [ ] **Emotional control** — Apply breathing or walk-away protocol when stress score ≥4.
- [ ] **Flexibility** — Update bias only after objective triggers (trend change across two time frames, macro catalyst reversal).
- [ ] **Continuous learning** — Schedule weekly review block for backtesting, scenario drills, and playbook refinements.

## Key Metrics to Track

- Win rate, average and cumulative R-multiple, and profit factor per setup tag.
- Maximum adverse excursion (MAE) vs. planned stop distance and slippage on entries.
- Session compliance score (percentage of trades satisfying module criteria) and guardrail breach count.
- Emotional state trend across the week correlated with performance.
