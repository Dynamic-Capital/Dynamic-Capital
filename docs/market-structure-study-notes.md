# Market Structure Study Notes

## Understanding Market Structure

- Market structure relies on wave movements, reaction points, opposing orders,
  and liquidity imbalances to reveal the intentions of price movers.
- Structural pivots that cause reactions reflect future opposition; static ones
  lack intent or liquidity information.
- Market psychology: traders see markets moving relative to broader structure,
  seeking market psychology consensus when structure is unclear.
- Wyckoff's law: a body in motion (bull trend) continues until counter-order
  flow creates imbalance.
- Newton's third law: every bullish move meets bearish response at equilibrium;
  breakout equals breakdown in magnitude.
- Newton's first law restated: a bullish body stays in motion until counterflow
  creates imbalance.
- Liquidity and imbalance underpin market structure, covering price intent and
  flow. Markets stay in equilibrium until liquidity imbalance shifts.
- Buyers overpowering sellers signal bullishness; sellers overpowering buyers
  indicate bearishness. Balanced markets move sideways, and equilibrium shifts
  when pressure accumulates.
- Key takeaways: aggressive buyers lift prices; dominant sellers drop prices;
  balance brings sideways movement; trends follow reliable repeating structures.

## Market Structure Concept

- Structure aligns order flow, liquidity building, and application of pressure
  across time frames to reveal trend intent.
- Primary trend examples: long-term with weekly higher highs and lows; long-term
  with lower highs and lows.
- Intermediate trend: between long-term extremes, showing higher or lower
  intermediate levels.
- Short-term trend: within intermediate trend, rising or falling relative to
  surrounding levels.
- Tertiary trend: the weakest flow, often counter to short-term direction,
  lasting hours to days.

## Trading with Market Structure

- Align directional bias with higher time frames and trade smaller time frame
  setups in that direction.
- Anticipate reactions at equilibrium levels, key supports, and resistances;
  best trades occur when price tests and rejects these zones.
- Look for the first countertrend candle after a rally or drop for optimal
  entries and stops.
- Identify bodies showing imbalance and continuation traits to spot dynamic
  moves. Wait for transitions: trend to range to new trend.
- Observe previous ranges; structural shifts and liquidity grabs often precede
  new moves. Use low volatility periods to prepare.
- Manage trades with disciplined plans, scaling around structural signals and
  liquidity events.

## Things to Keep in Mind

1. Bullish structure features price breaking previous highs and respecting prior
   lows.
2. Bearish structure features price breaking previous lows and respecting prior
   highs.
3. Intermediate swings take profits; short-term swings target direction
   alignment for trend continuation.
4. Higher time frame structure and weekly/daily charts set bias.
5. Avoid trading lower time frames against higher time frame structure; wait for
   a neutral or bullish bias before buying.
6. Allow higher time frame structure to coordinate with intraday entries.
7. During bullish structure, watch swings for buy setups and sell swings
   cautiously.
8. Sell during bearish structure only in sync with short-term trend shifts.
9. Wait for daily/weekly trends to align before loading buys.

## Terms Cheat Sheet

- **HL / HH** – Higher Low / Higher High indicate bullish structure.
- **LL / LH** – Lower Low / Lower High indicate bearish structure.
- **BOS** – Break of Structure signals trend continuation.
- **CHoCH** – Change of Character signals potential trend shift.
- **STH / STL** – Short-Term High / Low mark local swing points.
- **ITH / ITL** – Intermediate-Term High / Low mark key structure levels.
- **LTH / LTL** – Long-Term High / Low mark major higher-time-frame pivots.

## Textbook Market Structure Example

- Higher time frame levels act as key zones, supply/demand, order blocks, and
  mitigation areas.
- Change of character occurs when price breaks the most recent swing in the
  opposite direction of the trend.
- Break of structure confirms continuation with new highs or lows aligned with
  the active trend.
- Short-term highs/lows and intermediate levels provide entry and management
  cues as price navigates higher-time-frame zones.

## Applying These Concepts in Your Project

- **Codify the structure hierarchy**: Translate the primary → tertiary trend
  framework into reusable utilities or scripts that classify swings on each
  timeframe. Use the definitions above to set objective rules for higher-time-
  frame bias, and surface that bias inside dashboards, backtests, or trade
  alerts.
- **Automate structural alerts**: Map BOS/CHoCH detection to notifications so
  the team instantly knows when a bias shift or continuation signal appears.
  Pair the alerts with the checklist in “Things to Keep in Mind” to prompt
  traders on confirmation steps before acting.
- **Enhance strategy reviews**: Integrate the liquidity and imbalance principles
  into post-trade analytics. Track which trades respected equilibrium zones,
  whether entries aligned with the first countertrend candle, and how scaling
  decisions matched the management guidance.
- **Standardize terminology**: Use the cheat sheet as shared vocabulary across
  documentation, trading journals, and training material so collaboration stays
  consistent.
- **Create scenario playbooks**: Combine the textbook example with project
  screenshots or charts to build playbooks for your common market conditions.
  Annotate how structure evolved, why trades succeeded or failed, and how the
  guidelines here would have adjusted the plan.

## Dynamic Trading Algo (DTA) Improvement Checklist

- [x] **Root Task: Data & Structure Integrity**
  - [ ] **Validate market structure inputs**: Confirm swing classification,
        liquidity zones, and BOS/CHoCH tags from your data pipeline align with
        manual annotations on representative symbols and time frames.
  - [ ] **Audit data freshness**: Monitor data latency and completeness across
        charting, backtests, and live feeds so the algo never acts on stale
        structure signals.
- [x] **Root Task: Bias & Signal Engine**
  - [ ] **Stress-test bias calculations**: Run unit and integration tests that
        simulate conflicting primary, intermediate, and short-term structures to
        ensure the correct hierarchy drives the algo's directional bias.
  - [ ] **Codify entry prerequisites**: Encode the “Things to Keep in Mind” list
        into guardrails (e.g., no countertrend entries without higher-time-frame
        neutrality) and surface violations in logs or dashboards.
  - [ ] **Integrate liquidity-based alerts**: Feed BOS/CHoCH and equilibrium
        touch events into notification channels with metadata on confirmation
        status and historical hit rate.
- [x] **Root Task: Execution & Risk Controls**
  - [ ] **Instrument execution quality**: Track slippage, fill speed, and order
        rejection reasons around structural pivot trades to identify execution
        gaps.
  - [ ] **Tighten risk parameters**: Align stop placement, scaling rules, and
        maximum exposure with the structure hierarchy, enforcing them through
        config files or parameter stores.
- [x] **Root Task: Monitoring & Continuous Learning**
  - [ ] **Review scenario playbooks**: Schedule recurring retros where traders
        replay tagged scenarios, comparing actual algo actions with the
        documented playbooks to refine logic.
  - [ ] **Automate performance reporting**: Generate weekly scorecards covering
        win rate, expectancy, and drawdown segmented by structure regime
        (trending, ranging, transition).
- [x] **Root Task: Change & Deployment Management**
  - [ ] **Optimize build & deployment pipelines**: Profile CI/CD and research
        build caching, dependency pruning, or container layering to shorten
        image builds and reduce drift between research, staging, and production
        environments.
  - [ ] **Document change management**: Log every structural rule update with
        before/after examples, test evidence, and deployment dates to support
        faster debugging and compliance reviews.
