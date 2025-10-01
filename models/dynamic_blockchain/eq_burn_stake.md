# Effective Stake with Burns

**Modules:** `dynamic_blockchain`, `dynamic_proof_of_burn`, `dynamic_stake`,
`dynamic_token`

## Overview

Burn events modify validator weight by applying leverage on destroyed tokens.

## Equation

$$s_i' = s_i + \beta b_i$$

- $s_i$ — pre-burn stake balance in $x_t$.
- $b_i$ — burn amount captured in disturbance $\xi_t$ or control $u_t$.
- $\beta$ — leverage factor defined in $\theta$.

## Notes

The updated stake $s_i'$ feeds downstream PoS selection probabilities and
staking APY computations.
