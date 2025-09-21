# MetaTrader 5 Expert Advisor Workspace

Store the Expert Advisor (EA) implementation and supporting tooling in this
folder. Keeping the MQL5 source alongside its backtesting artifacts ensures the
trading logic remains auditable.

## Proposed Structure

```
mql5/
├── Experts/
│   └── DynamicCapitalEA.mq5     # Primary EA entry point
├── Include/                     # Shared classes and utilities (.mqh)
├── Tests/                       # Strategy Tester presets, results, reports
├── Docs/                        # Runbooks, deployment notes, changelog
└── tools/                       # Scripts for builds, linting, CI helpers
```

Create folders as the EA evolves—MetaTrader only recognizes the `Experts/` and
`Include/` casing above.

## Current Layout

The workspace now follows the recommended layout so MetaTrader contributors can
find active source files quickly:

```
algorithms/mql5/
├── Experts/
│   ├── Lorentzian_Classification_EA.mq5
│   └── MA_Cross_EA.mq5
├── Include/
│   ├── equity_protection.mqh
│   ├── logger.mqh
│   ├── multi_timeframe.mqh
│   ├── position_manager.mqh
│   ├── risk_management.mqh
│   ├── session_filter.mqh
│   ├── stats_reporter.mqh
│   └── utils.mqh
└── tradingview_to_mt5_bridge/
    ├── README.md
    ├── THIRD_PARTY.md
    ├── docker-compose.yml
    ├── requirements.txt
    ├── run.py
    └── src/
```

Add `Docs/`, `Tests/`, and supporting tooling as they come online—keeping those
folders scoped within this workspace keeps the trading automation pipeline
auditable and portable.

## Handoff Requirements

- Document how the EA retrieves signals from Supabase (polling vs. websockets).
- Provide compilation instructions (`metaeditor` CLI or Docker-based builds).
- Capture both backtest and forward-test evidence in `Tests/` for audit trails.
- Note any secrets or environment variables required on the VPS host.
