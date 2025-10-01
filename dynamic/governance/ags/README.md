# Governance · Autonomous Governance Suite (AGS)

This module automates policy enforcement, stakeholder communications, and
playbook execution for Dynamic Capital governance.

Key components:

- `engine.py`: Core orchestrator that loads policy specifications and applies
  them across services.
- `dynamic_ags.py`: High-level helpers for composing governance campaigns.
- `discipline.py`, `sync.py`, `nfy_market_dimensions.py`: Supporting utilities
  for consistent coordination and reporting.

Keep governance flows declarative and document any new DAG schedules in this
README to aid operations teams.
