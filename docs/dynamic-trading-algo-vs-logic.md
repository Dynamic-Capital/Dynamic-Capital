# Dynamic Trading ALGO vs LOGIC

Dynamic Capital now frames its trading automation stack across two complementary
pillars:

- **Dynamic Trading ALGO** — Driving Yield of New Advancements in Markets,
  Intelligence & Creation — **Automated Liquidity Generation & Optimization**
  for trading execution.
- **Dynamic Trading LOGIC** — Driving Yield of New Advancements in Markets,
  Intelligence & Creation — **Leveraging Optimized Global Intelligence &
  Computation** for trading decisions.

Together they form a complete decision-to-execution flywheel where LOGIC
determines _why_ to act and ALGO manages _how_ the action is delivered.

## Acronym expansions

| Pillar             | Expansion                                                             |
| ------------------ | --------------------------------------------------------------------- |
| **D.Y.N.A.M.I.C.** | Driving Yield of New Advancements in Markets, Intelligence & Creation |
| **A.L.G.O.**       | Automated Liquidity Generation & Optimization                         |
| **L.O.G.I.C.**     | Leveraging Optimized Global Intelligence & Computation                |

## Capability split

### Dynamic Trading ALGO — execution engine

- Automates order routing, liquidity sourcing, and broker/exchange handshakes.
- Coordinates real-time bots, hedging routines, and fail-safes that protect
  capital during volatile sessions.
- Converts validated strategies into executable instructions with consistent
  position sizing, risk bands, and settlement workflows.

### Dynamic Trading LOGIC — strategy intelligence

- Concentrates the AI/ML research stack that evaluates signals, cross-market
  correlations, and regime shifts.
- Chooses which strategies to activate, pause, or recalibrate based on
  probabilistic edge, macro context, and portfolio constraints.
- Provides explainability payloads to traders, auditors, and downstream
  automation teams so human oversight remains informed.

## How they collaborate

1. **LOGIC ideates and validates** — Strategy research agents curate signals,
   assess their historical performance, and simulate forward-looking scenarios.
2. **ALGO operationalizes** — Execution pipelines translate those signals into
   broker-ready commands, applying guardrails, throttles, and liquidity
   heuristics.
3. **Closed-loop feedback** — Execution telemetry flows back into the LOGIC
   layer so models can refine confidence scores, retrain, or request manual
   review.
4. **Product alignment** — Treat LOGIC as the "strategy brain" and ALGO as the
   "execution hands" when packaging capabilities, roadmaps, or service-level
   agreements.

Maintaining a sharp separation between these pillars keeps the system modular:
LOGIC experiments can evolve rapidly without destabilizing the ALGO rails, while
ALGO enhancements improve resilience without altering strategic intent.

## Current implementation status

### Dynamic Trading ALGO — execution layer runtime

- **Versioning** – `dynamic/trading/algo/trading_core.py` declares
  `ALGO_VERSION_INFO = ModelVersion(name="Dynamic Algo", number=VersionNumber(0,
  2))`,
  exposing the `0.2` tag everywhere via `DynamicTradingAlgo.version` so
  downstream systems can pin automation pipelines to the shipped build.
- **Connector strategy** – `DynamicTradingAlgo` attempts to bootstrap either the
  MT5 (`integrations.mt5_connector.MT5Connector`) or REST
  (`integrations.trade_api_connector.TradeAPIConnector`) connector but falls
  back to an internal paper broker when the dependency graph is not available.
  This keeps sandbox and CI environments operational without external services
  while still allowing production builds to wire in live brokers.
- **Telemetry fallbacks** – Every trade event is routed through
  `_emit_trade_event`, which tries the optional
  `integrations.data_collection_api.serialise_for_collection` helper first and
  then gracefully downgrades to `_fallback_collection_serialise` so execution
  metadata is never dropped even when collectors are offline.
- **Live collaboration** – `dynamic/trading/live_sync.py` stitches the ALGO
  executor together with risk telemetry through `DynamicTradingLiveSync`,
  ensuring the execution layer can accept governance context, research inputs,
  and current positions from the LOGIC pillar before firing orders.

| Capability              | Status summary                                                      |
| ----------------------- | ------------------------------------------------------------------- |
| Release tag             | `ModelVersion` 0.2, surfaced via `DynamicTradingAlgo.version`.      |
| Broker integration      | MT5 & REST connectors optional; automatic paper broker fallback.    |
| Telemetry resilience    | Graceful downgrade from external collectors to in-process fallback. |
| Live sync orchestration | `DynamicTradingLiveSync` mediates strategy → execution hand-offs.   |

```python
from dynamic.trading.algo import DynamicTradingAlgo

algo = DynamicTradingAlgo()
print(algo.version)  # -> "dynamic-algo@0.2"
```

### Dynamic Trading LOGIC — discretionary risk brain

- **Guardrail primitives** – `dynamic/trading/logic/engine.py` defines the
  `RiskLimits`, `RiskTelemetry`, and `DynamicRisk` data classes responsible for
  tracking gross/net exposure, largest position sizing, and 95% VaR for the live
  book.
- **Telemetry loop** – When `DynamicRisk.snapshot()` runs it compiles breaches,
  emits a `RiskTelemetry` payload, and pushes it through `_emit_telemetry`. The
  method automatically mirrors the ALGO’s behaviour: it prefers
  `bootstrap_data_collection_api()` and, if unavailable, falls back to
  structured dictionaries so nothing breaks in offline environments.
- **Shared lifecycle** – The same `DynamicTradingLiveSync` entrypoint consumes
  `DynamicRisk` output, letting the LOGIC pillar approve or veto execution in
  real time based on guardrail health.

| Capability              | Status summary                                                       |
| ----------------------- | -------------------------------------------------------------------- |
| Risk surface            | Positions, exposure, and VaR tracked through typed dataclasses.      |
| Breach detection        | `DynamicRisk.snapshot()` annotates breaches for governance review.   |
| Telemetry compatibility | Optional collector bootstrap with safe fallbacks mirrors ALGO layer. |
| Execution handshake     | Live sync module shares LOGIC state with the ALGO executor.          |

```python
from dynamic.trading.logic import DynamicRisk, RiskLimits

limits = RiskLimits(max_gross_exposure=1_000_000, max_single_position=250_000, max_var=50_000)
risk = DynamicRisk(limits)
telemetry = risk.snapshot()  # safe even before positions are ingested
print(telemetry.gross_exposure)
```
