# Market Structure Study Notes

## Understanding Market Structure

- *Is the market random?* It can feel that way when entries rely on indicators
  without context, yet price is never random. Structure exposes the intent of
  the orders driving price, revealing where opposition is gathering and why a
  move is unfolding.
- Structural pivots that generate strong reactions advertise the presence of
  liquidity. Static or untouched levels lack that intent and cannot guide the
  next decision in isolation.
- Market psychology mirrors this. Traders view price relative to the larger
  structure so they can agree on bias. When structure is unclear, consensus and
  conviction fade until price advertises a new imbalance.
- Wyckoff's first law applied to structure: a trending body remains in motion
  until counter-order flow forces a change. Newton's laws echo the same lesson:
  every bullish drive meets a bearish response at equilibrium, and a trend will
  persist until opposing pressure builds enough to halt it.
- Liquidity and imbalance therefore underpin market structure. Markets sit in
  equilibrium while buyers and sellers are matched; imbalance tips the scale and
  creates directional movement. You are studying the flow of orders transitioning
  from balance → imbalance → new balance.
- In this equilibrium state, liquidity depth varies. When the book can absorb
  heavy selling, price may consolidate; when buyers overwhelm offers, the
  advance accelerates. The reverse is equally true for bearish phases.
- Everything you need to learn stems from observing how price behaves at that
  equilibrium: who controls the auction, how fast that control changes hands,
  and whether price returns to the mean or expands into trend continuation.

### In summary

- When buyers are more aggressive than sellers, upswings last longer than the
  pullbacks.
- When sellers are in control, downswings extend and retracements are shallow.
- When pressure is balanced, swings appear random because the market is ranging.

## Market Structure Concept

- Market structure is a timeless definition driven by imbalances of buying and
  selling. Those imbalances reveal whether price is defending higher levels or
  pressuring toward new lows.
- Structure aligns order flow, liquidity building, and pressure across multiple
  time frames. Reading the hierarchy keeps you focused on the dominant trend.
- Short-term moves can be manipulated. Anchor decisions in the higher-time-frame
  bias first, then drop down to execute with the prevailing flow.

### Trend tiers

- **Primary / Long-Term Trend** – Lasting months to many years with weekly or
  monthly higher highs/higher lows in a bull phase, or lower highs/lower lows in
  a bear phase.
- **Secondary (Intermediate) Trend** – Lasting from weeks to a few months,
  moving in the opposite direction of the primary trend while building or
  relieving liquidity at key levels.
- **Intermediate-Term Flow** – Any short-term highs/lows that align with higher
  short-term highs/lows; essentially the structure that bridges the primary and
  intraday views.
- **Short-Term Trend** – Days to weeks inside the intermediate structure,
  printing new short-term highs or lows relative to the preceding swing.
- **Tertiary Trend** – Hours to days. The weakest flow, often counter to the
  active short-term direction, used to fine tune entries.

- **Short-term bullish** behaviour prints higher lows relative to both the
  preceding and following swing.
- **Short-term bearish** behaviour prints lower highs relative to both the
  preceding and following swing.
- Treat the daily as the expected trend. Execute long setups in bullish
  structure and short setups in bearish structure.

## Trading with Market Structure

- When the market structure is bullish, plan for price to retest prior structure
  before continuing. Supportive pullbacks offer the setups; fading strength does
  not.
- In bearish conditions, expect previous lows to be revisited and only fade a
  decline when structure shifts or the higher-time-frame bias turns neutral.
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
   alignment for continuation.
4. Anchor bias to the weekly and daily structure before drilling down.
5. Stand aside on lower time frames until the higher structure turns neutral or
   supportive of your idea.
6. Allow higher time frame structure to coordinate with intraday entries.
7. Trade with the higher-time-frame bias during bullish regimes; fade rallies
   cautiously.
8. During bearish regimes, only take sells that align with both the higher
   structure and the most recent short-term break of structure.
9. Wait for daily/weekly trends to align before loading aggressive positions.
10. In bullish regimes, focus on buying pullbacks to higher lows rather than
    selling into strength.
11. In bearish regimes, focus on selling lower highs rather than buying into
    weakness.
12. Track the Dollar Index and correlated macro drivers for confluence while
    the structure plays out.

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
