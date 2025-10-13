# Dynamic Trading Language Parser Spec

The trading language parser now expects modern `key: value` (or `key=value`)
pairs when describing trade intents. Legacy arrow or bracket syntax has been
removed to avoid ambiguity with downstream systems.

## Required Fields

- `instrument`
- `direction`
- `conviction`
- `timeframe`

## Optional Fields

- `catalysts` — Accepts `;`, `|`, or `,` as delimiters.
- `entry`, `target`, `stop`
- `reasoning`
- `risk_notes`
- `metrics` — Provide comma-separated `name=value` pairs.
- `style`
- `created_at` — ISO 8601 timestamp.

## Example Payload

```text
instrument: ETHUSD
direction: long
conviction: 0.72
timeframe: Intraday
catalysts: London upgrade tailwinds; Funding premium stabilising
entry: 1820.25
target: 1895
stop: 1778.5
reasoning: Momentum returning alongside liquidity rebuild
risk_notes: Watch on-chain flows | Funding flip risk
metrics: skew=0.45, momentum=0.62
created_at: 2025-02-14T12:00:00+00:00
```

## Error Handling

- Deprecated tokens such as `->`, `::`, `catalyst[...]`, or `risk[...]` raise a
  `TradeIntentParseError`.
- Missing required fields produce actionable error messages listing the
  omissions.
- Empty metric keys or malformed numeric values result in validation errors to
  guard against partially parsed inputs.
