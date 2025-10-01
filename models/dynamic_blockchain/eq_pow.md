Name: Proof-of-work block interval

Equation(s):

```math
\mathbb{E}[T] = \frac{D}{H}
```

Assumptions:

- Hash rate $H$ remains approximately constant during the averaging window.
- Difficulty $D$ reflects the expected hashes required per block under uniform
  miner effort.

Calibration:

- Derive $H$ from observed block intervals or miner telemetry over the target
  epoch.
- Use protocol difficulty snapshots for $D$ and update estimates whenever
  retargeting occurs.
