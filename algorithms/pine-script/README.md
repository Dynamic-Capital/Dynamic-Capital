# Pine Script Workspace

Use this folder to manage every TradingView deliverable that powers the Dynamic
Capital automation loop.

## Suggested Layout

```
pine-script/
├── strategies/        # Primary strategy files (.pine)
├── indicators/        # Supporting indicator scripts
├── includes/          # Shared functions/importable snippets
├── alerts/            # Example alert JSON payloads and docs
└── tests/             # Backtest exports, validation notebooks, etc.
```

Create the sub-folders above as you add real assets. Keeping strategy,
indicator, and helper code split makes it easier to hand off artifacts to the
automation and EA teams.

## Naming Guidelines

- Use semantic filenames, e.g. `momentum_breakout_strategy.pine`.
- Keep strategy version history in Git; avoid appending `v2` to filenames.
- Document alert payload fields in `alerts/README.md` once implemented.

## Next Steps

1. Finalize the TradingView strategy/indicator logic.
2. Document webhook alert JSON payloads so the Vercel function can parse them.
3. Commit exported backtests or validation notes inside `tests/` for QA.

## Candlestick trigger alignment

- The web configuration lists candlestick triggers under
  `apps/web/config/strategies/core.json` (e.g. `"engulfing"`, `"pin"`). Keep the
  names identical to the boolean toggles in
  `strategies/dynamic_capital_regime_playbook.pine` so UI selections map
  directly to the Pine logic.
- `"Engulfing"` requires the current body to engulf the previous candle body and
  close in the direction of the trend (bullish closes above the prior open,
  bearish closes below).
- `"Pin"` enforces a wick-to-body ratio (default 2:1) and a close near the wick
  extreme so analysts can spot rejection candles without manual tuning.
- Manual validation: when changing trigger definitions, (1) adjust the Pine
  script inputs, (2) refresh the UI config list, and (3) replay a labelled
  TradingView session to confirm that the highlighted candles match the chosen
  triggers.
