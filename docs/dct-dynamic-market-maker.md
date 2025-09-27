# DCT Dynamic Market Maker (DMM)

## Purpose

- Provide production-grade liquidity for the DCT token across TON decentralized
  exchanges and mirrored centralized venues.
- Maintain tight, adaptive spreads that respond to volatility while protecting
  the treasury from inventory drawdowns.
- Offer explicit hooks for treasury incentives, buyback/burn automation, and
  hedge execution.

## System Overview

| Block                  | Responsibilities                                                                                                        | Key Interfaces                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Data Feeds**         | Stream mid-price, best bid/ask, depth, trades, realized volatility, and funding (if perps). Optional mempool analytics. | TON indexers, CEX REST/WebSocket, internal market data bus.     |
| **Risk Engine**        | Track inventory, notional exposure, P&L, and volatility bands. Enforce soft/hard limits and toxicity filters.           | Redis/TimescaleDB for state, alerting bus (PagerDuty/Telegram). |
| **Quoting Engine**     | Compute reservation price and spread via Avellaneda–Stoikov with inventory skew, spread floors, and size ladders.       | Risk engine (inventory, vol), venue adapters (order placement). |
| **Execution Adapters** | Post/cancel/replace orders, manage refresh cadence, and monitor fills per venue.                                        | TON DEX smart contracts, CEX FIX/REST, transaction signer.      |
| **Hedging Layer**      | Net exposure offsets using perps/spot hedges, optionally route to OTC.                                                  | Hedge venue adapters, treasury wallet.                          |
| **Treasury Hooks**     | Trigger buyback/burn programs, distribute liquidity mining rewards based on uptime × tightness metrics.                 | Treasury governance contracts, reward distribution modules.     |
| **Controls**           | Circuit breakers, kill-switch, stale-data watchdogs, P&L drawdown guards.                                               | On-call alerting, config management.                            |

## Data Feed Requirements

1. **Market microstructure** – Consolidated order book snapshots (top 10 levels)
   and trade tape per venue at ≤ 1 s cadence.
2. **Volatility inputs** – EWMA (1–5 min) over mid-price returns with clamping
   `σ ∈ [σ_min, σ_max]` to reduce noise.
3. **Funding & borrow rates** – Required for perp hedging cost-of-carry
   adjustments.
4. **On-chain telemetry** – Optional mempool scanners to detect large incoming
   swaps and pre-adjust spreads.
5. **Health checks** – Heartbeats on each feed; stale data triggers widening or
   cancels.

## Risk Engine Design

- Maintain inventory vector `q_v` per venue and consolidated inventory `q_total`
  (expressed in DCT and quote currency notionals).
- Configure **soft limits** (e.g., 4% of float) to start skewing quotes and
  **hard limits** (e.g., 6% of float) to halt directional inventory
  accumulation.
- Compute running P&L and realized/unrealized drawdown; crossing session
  thresholds triggers kill-switch escalation.
- Volatility banding: `σ_eff = clamp(EWMA(returns), σ_min, σ_max)`.
- Toxicity detection: `toxicity_score = adverse_move / time_to_fill`; sustained
  scores above threshold widen spreads for N refresh cycles.
- Persist state in low-latency store (Redis) with periodic archival
  (TimescaleDB/Postgres) for analytics.

## Quoting Engine (Avellaneda–Stoikov Core)

1. **Reservation price**: `r_t = S_t - (q_total * γ * σ_eff^2 * T) / 2`.
2. **Optimal half-spread**: `δ_t = (γ * σ_eff^2 * T) / 2 + (1/γ) * ln(1 + γ/κ)`.
3. **Quote levels**:
   - Bid = `r_t - δ_t - skew_boost`, Ask = `r_t + δ_t + skew_boost`.
   - `skew_boost = β * clamp(q_total / q_soft, -1, 1)` to accelerate rebalancing
     near limits.
   - Apply minimum spread floor covering fees + 2–5 bps gas cushion.
4. **Size ladder**: Define tiers (e.g., 25%, 50%, 25% of max quote size)
   concentrated near mid when inventory light; shrink tiers as inventory
   approaches limits.
5. **Refresh cadence**: 1–3 s on DEX (adjustable to manage gas); 500 ms on CEX
   where latency allows.

## Execution & Venue Adapters

- Implement per-venue order managers that track live order IDs, expiry, and
  confirmation receipts.
- Use cancel/replace strategy to avoid stale orders; enforce maximum outstanding
  quote notional per side.
- Integrate TON wallet signer with nonce management and gas estimation buffers.
- Cross-venue router monitors price differentials; opportunistically hedge or
  arbitrage when > threshold after fees.
- Gracefully degrade when venue connectivity fails: cancel resting orders and
  halt new placements.

## Hedging & Rebalancing

- Define hedge threshold `|q_total| > q_hedge`. When exceeded, place IOC/market
  orders on hedge venue for `|q_total| - q_target`.
- Support both perps (requires funding cost tracking) and spot/OTC desks.
- Batch hedges to minimize fees while keeping inventory near neutral; prefer
  quoting adjustments before external hedges to avoid churn.
- Record hedges in treasury ledger for audit and P&L attribution.

## Treasury Integration

- Liquidity mining: reward LP addresses proportional to quote uptime × depth ×
  tightness; update reward multipliers per epoch.
- Buyback/Burn: route a configurable share of MM profits into periodic buybacks,
  with automated settlement to burn address or treasury reserve.
- Budget controls: enforce max daily spend for incentives and buybacks; expose
  config to governance interface.
- Reporting: publish weekly liquidity metrics (average spread, depth, inventory
  turnover) to treasury dashboard.

## Controls & Circuit Breakers

- **Volatility spike**: if `σ_eff > σ_max`, widen spreads by factor `k` or pause
  quoting.
- **Slippage guard**: abort refresh when latest fills deviate > X bps from
  reference TWAP.
- **Data staleness**: cancel quotes if feed heartbeat > 3 s or price discrepancy
  > configurable tolerance.
- **P&L drawdown**: stop quoting when session drawdown exceeds limit; require
  manual reset.
- **Manual kill-switch**: one command cancels all orders and disables new
  placements until re-enabled by multi-sig approval.

## Parameter Baseline

| Parameter               | Initial Value                      | Notes                                                     |
| ----------------------- | ---------------------------------- | --------------------------------------------------------- |
| Refresh interval        | 1–3 s DEX, 0.5–1 s CEX             | Tune per gas budget and venue latency.                    |
| Risk aversion `γ`       | 0.1                                | Higher widens spreads and reduces inventory swings.       |
| Arrival sensitivity `κ` | 1.0                                | Fit from venue fill rates; recalibrate weekly.            |
| Horizon `T`             | 120 s                              | Shorter for reactive behavior; extend on illiquid venues. |
| Vol clamp               | `σ_min = 5 bps`, `σ_max = 120 bps` | Derived from historical realized vol distribution.        |
| Soft inv limit          | 4% of circulating float            | Start skewing quotes.                                     |
| Hard inv limit          | 6% of circulating float            | Halt directional fills.                                   |
| Spread floor            | Fees + 3 bps                       | Ensures cost coverage.                                    |
| Max quote notional      | Treasury-defined                   | Prevents overexposure per side.                           |

## Monitoring & Alerting

- Metrics: spread width, quote size, inventory, fill rates, toxicity score,
  volatility bands, hedge frequency.
- Dashboards: Grafana panels per venue with color-coded risk zones.
- Alerts: PagerDuty/Telegram notifications for limit breaches, stale feeds,
  failed transactions, drawdowns, and kill-switch activation.
- Logging: Structured logs (JSON) with correlation IDs for order lifecycle
  tracing.

## Simulation & Backtesting

1. Historical market data replay to evaluate strategy performance and inventory
   distribution.
2. Stress scenarios (vol spikes, thin liquidity) to tune `γ`, `β`, and limit
   thresholds.
3. A/B testing of skew functions and spread floors using sandbox accounts before
   production rollout.
4. Shadow mode: run DMM in observe-only mode capturing hypothetical fills for
   1–2 weeks before enabling live orders.

## Implementation Roadmap

1. **Foundation (Weeks 1–3)**
   - Stand up data feed collectors and unified market data bus.
   - Build risk engine services with inventory tracking and volatility
     estimation.
   - Implement basic Avellaneda–Stoikov quoting with spread floors.
2. **Expansion (Weeks 4–6)**
   - Add inventory skew, size laddering, and toxicity filters.
   - Integrate venue adapters (primary TON DEX + chosen CEX) with cancel/replace
     logic.
   - Establish monitoring dashboards and alerting playbooks.
3. **Hedging & Treasury (Weeks 7–9)**
   - Deploy hedging module with configurable thresholds and treasury ledger
     integration.
   - Launch liquidity mining reward calculations and profit-driven buyback
     hooks.
4. **Hardening (Weeks 10–12)**
   - Implement circuit breakers, kill-switch, and full end-to-end failover
     testing.
   - Conduct simulation backtests, dry runs, and risk committee sign-off.
   - Publish runbooks and update governance documentation.

## Operational Playbook (Daily)

- Pre-open checklist: verify data feeds, wallet balances, configuration hashes,
  and prior-day P&L reconciliation.
- Continuous monitoring: ensure spreads track volatility targets, adjust
  parameters during scheduled reviews.
- End-of-day: archive logs, update treasury ledger with realized P&L, and review
  alerts/incidents.

## Compliance & Governance Considerations

- Maintain multisig approvals for parameter changes affecting risk limits and
  treasury flows.
- Document liquidity incentive policies and publish updates for community
  transparency.
- Log all manual overrides with operator ID, timestamp, and rationale for
  auditability.
