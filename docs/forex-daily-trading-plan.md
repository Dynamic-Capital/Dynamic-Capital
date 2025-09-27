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

### Task IDs and Execution Map

Assign each checklist item an ID while you work through the session. Capture the ID, timestamp, and verification evidence inside the trading journal so that the verification owner can sign off without ambiguity.

#### Session-Level Controls

| Task ID | Checklist Item | How to Run the Task | Verification Evidence | Owner |
| --- | --- | --- | --- | --- |
| SC-01 | Confirm guardrails, account status, news blackout windows | Open risk dashboard, broker portal, and economic calendar; document overrides if needed before entering markets | Screenshot of guardrails dashboard plus broker balance note stored in journal | Risk lead |
| SC-02 | Complete pre-market intelligence sweep | Review macro calendar, overnight notes, and liquidity updates; refresh watchlist tiers | Annotated calendar excerpt and updated watchlist spreadsheet uploaded to session folder | Trader |
| SC-03 | Build chart annotations, bias, and sizing limits | Mark key levels, bias, and ATR-based risk on trading platform and risk worksheet | Saved chart template and position-sizing worksheet export linked in journal | Trader |
| SC-04 | Execute London block plan | Deploy alerts/orders, monitor context every 15 minutes, escalate anomalies | Order blotter snippet, alert log, and 15-minute context notes attached to execution log | Execution partner |
| SC-05 | Conduct mid-session review | Reconcile realized/open risk, reassess catalysts, update scenarios | Adherence scorecard screenshot and revised playbook scenarios summary | Risk lead |
| SC-06 | Prepare for New York close | Scale positions, lock stops, clear stale orders, stage documentation | Photo or digital sign-off of NY close checklist plus stop-adjustment audit log | Trader |
| SC-07 | Journal and archive | Finalize journal entry, metrics, and archive artifacts | PDF journal export, metrics update, and archive directory link | Operations |

#### T-90 to T-45 — Pre-Market Intelligence

| Task ID | Task | How to Run the Task | Verification Evidence | Owner |
| --- | --- | --- | --- | --- |
| PM-01 | Review macro calendar | Check ForexFactory, CME, and desk notes; highlight high/medium-impact releases tied to watchlist pairs | Screenshot of annotated calendar with highlight timestamps stored in journal | Trader |
| PM-02 | Sync overnight reports | Pull prior session price map, volatility summary, and broker notices; log key deltas | Consolidated note in journal with source links and summary bullets | Trader |
| PM-03 | Update watchlist tiers | Rank pairs into Primary/Secondary/Parked based on liquidity and catalysts | Updated watchlist sheet uploaded and referenced in journal | Trader |

#### T-45 to T-15 — Chart & Plan Build

| Task ID | Task | How to Run the Task | Verification Evidence | Owner |
| --- | --- | --- | --- | --- |
| CP-01 | Annotate support/resistance zones | Work from weekly → daily → execution charts marking key zones with color coding | Chart workspace template saved to platform cloud/workspace export attached | Trader |
| CP-02 | Record order flow areas | Note Asia range, prior value area, option barriers with confidence score | Screenshot of chart annotations plus confidence note saved in journal | Trader |
| CP-03 | Define directional bias & structures | For each pair, assign bias and acceptable structures (trend, breakout, mean reversion) | Bias matrix table inserted into journal with rationale per pair | Trader |
| CP-04 | Calculate position sizing limits | Use ATR and session R to compute allowable lot sizes | Completed sizing worksheet or calculator export stored with task ID | Trader |

#### Session Open — Execution Block 1 (London)

| Task ID | Task | How to Run the Task | Verification Evidence | Owner |
| --- | --- | --- | --- | --- |
| LX-01 | Confirm spreads and fill quality | Run micro-test order or depth check; ensure spread ≤ tolerance | Screenshot of DOM/spread monitor with timestamp | Trader |
| LX-02 | Deploy resting orders or alerts | Load planned orders/alerts aligned with modules | Export of platform order/alert list saved to journal | Execution partner |
| LX-03 | Track context every 15 minutes | Update log with structure, momentum, liquidity observations | Context log entries appended to 15-minute worksheet | Execution partner |
| LX-04 | Escalate volatility/news variance | Notify risk lead when ATR doubles or catalysts shift; document response | Chat/email transcript or escalation note linked to journal | Trader |

#### Mid-Session Review — Execution Block 2 (London/NY Overlap)

| Task ID | Task | How to Run the Task | Verification Evidence | Owner |
| --- | --- | --- | --- | --- |
| MR-01 | Reconcile trade log | Update realized R, open risk, adherence score | Screenshot of reconciled log and adherence metrics table | Trader |
| MR-02 | Reassess catalysts | Scan upcoming events, news feeds, and desk alerts; adjust focus pairs | Updated catalyst summary posted in journal | Risk lead |
| MR-03 | Update playbook scenarios | Refresh continuation/reversal/chop scenarios; retire invalid setups | Versioned scenario matrix saved with timestamp | Risk lead |

#### Final Block — New York Close Prep

| Task ID | Task | How to Run the Task | Verification Evidence | Owner |
| --- | --- | --- | --- | --- |
| NY-01 | Scale down risk | Reduce exposure unless high-conviction catalyst persists; log rationale | Position summary showing reduced size with rationale note | Trader |
| NY-02 | Lock stops & clear orders | Convert trailing stops, cancel resting orders extending past session | Platform activity log export showing stop/order adjustments | Trader |
| NY-03 | Capture documentation | Snapshot charts, DOM/T&S for journaling | Screenshot bundle saved to archive folder referenced in journal | Operations |

#### Discipline Checklist Integration

| Task ID | Discipline | How to Run the Task | Verification Evidence | Owner |
| --- | --- | --- | --- | --- |
| DC-01 | Patience | Use checklist IDs to confirm setups meet module criteria; set timer to avoid revenge trading | Journal note confirming criteria met for each executed trade | Trader |
| DC-02 | Consistency | Track adherence to time blocks; flag deviations immediately | Adherence delta table appended to journal | Trader |
| DC-03 | Risk management | Double-check stop/target entries and mid-session review adjustments | Ticket screenshots pre- and post-adjustment filed with task IDs | Trader |
| DC-04 | Record keeping | Enter trades within five minutes of exit and back up nightly | Journal timestamps plus backup confirmation screenshot | Operations |
| DC-05 | Emotional control | Log stress scores; apply reset protocol ≥4 | Heart rate variability/score log attached with reset notes | Trader |
| DC-06 | Flexibility | Update bias after objective triggers with documented rationale | Bias change memo with trigger evidence stored in archive | Trader |
| DC-07 | Continuous learning | Schedule weekly drill/backtest block tied to session learnings | Calendar invite screenshot and drill summary added to weekly review | Trader |

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
