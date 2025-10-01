# Token Supply Evolution

**Modules:** `dynamic_blockchain`, `dynamic_token`

## Overview

Tracks circulating supply via cumulative mints and burns.

## Equation

$$S(t) = S_0 + \sum_{\tau \le t} \text{mint}(\tau) - \sum_{\tau \le t} \text{burn}(\tau).$$

## Notes

- $S_0$ initializes the state $x_0$.
- Mint and burn flows may enter as disturbances $\xi_t$ or be governed by
  controls $u_t$ (e.g., treasury actions).
- Supply $S(t)$ feeds tokenomics dashboards and staking yield calculations.
