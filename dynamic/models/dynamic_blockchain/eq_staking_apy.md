# Staking Annual Percentage Yield

**Modules:** `dynamic_blockchain`, `dynamic_stake`, `dynamic_validator`

## Overview

Approximate the simple APY for staking rewards subject to slashing risk.

## Equation

$$\text{APY} \approx \frac{R_{\text{epoch}}}{\text{TotalStake}} \times \text{epochs}_{\text{year}} - \text{slashing\_risk}.$$

## Parameters

- $R_{\text{epoch}}$ — rewards per epoch in $\theta$.
- $\text{TotalStake}$ — aggregate stake tracked in $x_t$.
- $\text{epochs}_{\text{year}}$ — schedule parameter controlling compounding
  horizon.
- $\text{slashing\_risk}$ — expected penalty rate from validator misbehavior.

## Notes

- Controls $u_t$ can rebalance delegations to target desired APY.
- Output metrics compare realized yield versus the approximation to detect
  drift.
