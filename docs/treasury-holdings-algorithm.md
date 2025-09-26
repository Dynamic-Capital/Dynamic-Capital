# Treasury Holdings Algorithm (Policy-Driven Rebalancer)

## Purpose
- Automate treasury portfolio management while honoring governance-approved allocations, guardrails, and escalation paths.
- Preserve liquidity for operations, maintain runway stability, and scale buybacks/burns within policy thresholds.

## Core Inputs
- **Configuration**: `app_config` and policy tables defining tranche weights, guardrail bounds, and exception workflows.
- **Treasury Snapshot**: Categorized balance sheet covering TON reserves, yield vault deposits, and liquidity positions.
- **Market Telemetry**: TON price, volatility, usage demand, and override flags sourced via the shared `DCTMarketSnapshot`/`DCTPriceCalculator` pipeline.
- **Governance State**: Token Assembly directives, Contributor Council overrides, and queued policy updates.

## High-Level Flow
1. **Ingest State**
   - Pull configuration, treasury inventory, and market telemetry on a fixed cadence (default: hourly, burstable on large inflows).
   - Normalize data into a shared `TreasuryState` object for downstream consistency and auditing.
2. **Derive Targets**
   - Allocate each inflow across operations, investment, and buyback/burn tranches using configured weights and floor constraints (e.g., maintain ≥20 M DCT operations buffer).
   - Apply time-based multipliers (e.g., increased liquidity provisioning ahead of product launches) before finalizing target weights.
3. **Validate Guardrails**
   - Ensure liquidity depth ≥1 M TON inside ±2 % price bands and that ≥65 % of positions remain in-range.
   - Monitor price drift (±15 % VWAP divergence) and volatility (>40 % annualized) to decide whether to auto-execute or defer for governance review.
   - Enforce buyback caps (≤20 % of net fees monthly) and burn triggers (route 50 % of penalty fees when runway >24 months).
4. **Solve Deltas**
   - Use a weight-based allocator (patterned after `DCTAllocationEngine`) to compute target holdings per bucket.
   - Derive deltas between current and desired allocations, applying smoothing (e.g., max 10 % circulating supply shift per epoch) similar to `DCTProductionPlanner`.
   - Persist proposed moves and telemetry into `tx_logs` for auditability.
5. **Execute Adjustments**
   - Route TON→DCT conversions through the existing `dexBuyDCT` and burn flows to inherit slippage protections.
   - Trigger buybacks via rate-limited, venue-scoped executors honoring per-minute and per-market caps.
   - Sequence liquidity top-ups, runway replenishment, and yield vault deposits according to priority queues, logging each action.
6. **Governance & Reporting**
   - Require Contributor Council + Token Assembly approval for operations outside daily policy bands.
   - Emit weekly/monthly transparency reports summarizing inflows, outflows, buybacks, burns, and guardrail status.

## Data Structures
- `TreasuryState`: Snapshot of balances, inflows, policy overrides, and telemetry references.
- `AllocationPlan`: Target weights, floor/ceiling bounds, and staged execution schedule.
- `ExecutionTask`: Atomic action specification (venue, asset pair, volume, safety checks, logging hooks).

## Telemetry & Alerting
- Publish metrics for guardrail compliance, execution latency, and policy utilization into the observability pipeline.
- Trigger alerts when:
  - Liquidity depth < target or out-of-range share >35 %.
  - Volatility exceeds tolerance and rebalancing is deferred.
  - Buyback/burn budgets near monthly caps.

## Implementation Notes
- Implement allocator and smoothing logic as reusable services to keep policy tuning independent of execution engines.
- Use idempotent upsert patterns for `tx_logs` and state snapshots to support retries.
- Version configuration schemas to allow staged rollout of new guardrails without downtime.

## Testing Strategy
- **Unit Tests**: Validate allocator math, guardrail enforcement, and smoothing heuristics against deterministic fixtures.
- **Simulation Harness**: Replay historical inflows and market conditions to verify policy adherence and stress behavior.
- **Integration Tests**: Mock DEX/exchange executors ensuring venue rate limits and slippage protections trigger as expected.
- **Operational Drills**: Run monthly governance review simulations to ensure escalation paths and reporting pipelines stay functional.
