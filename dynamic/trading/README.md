# Trading Services

The trading pillar separates discretionary guardrails from systematic execution:

- **Logic** (`dynamic/trading/logic/`): Risk policies, guardrails, and
  supervisory rules for discretionary trading desks.
- **Algo** (`dynamic/trading/algo/`): Parameterised bots, strategy cores, and
  adaptive execution components.

When adding trading features, keep shared abstractions typed and document any
new parameter surfaces within the relevant subdirectory README.
