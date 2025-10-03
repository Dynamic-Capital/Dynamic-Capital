# Trading · Discretionary Logic

`dynamic/trading/logic/` contains the risk engine and guardrails that supervise
human-directed trading flows.

Current components:

- `engine.py`: Applies policy checks, exposure limits, and escalation routines.
- `__init__.py`: Consolidates exports for external tooling.
- Optional data collection hooks publish telemetry snapshots when
  `DATA_COLLECTION_API_*` configuration is supplied.

Document new guardrail modules here and capture how they integrate with the
wider trading stack (execution bots, telemetry, or alerting).
