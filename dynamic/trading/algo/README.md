# Trading · Algorithmic Execution

This directory hosts systematic trading components such as execution bots,
strategy planners, and middleware adapters.

Highlights:

- Core trading loop (`trading_core.py`) with signal normalisation helpers.
- Role-based algorithms (CEO/CFO/COO), metadata engines, and pool management.
- Supporting adapters for telemetry, script orchestration, and traffic control.

When introducing new strategies document their configuration knobs, telemetry
feeds, and guardrails here.
