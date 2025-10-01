# Drift–Diffusion Decision Process

**Modules:** `dynamic_self_awareness`, `dynamic_critical_thinking`

## Overview

Stochastic differential equation modeling evidence accumulation until decision
bounds are reached.

## Equation

$$dx = v\,dt + \sigma\,dW_t.$$

- $v$ — drift rate parameter ($\theta$) reflecting evidence strength.
- $\sigma$ — diffusion coefficient.
- $W_t$ — Wiener process driving randomness ($\xi_t$).

## Notes

- Decision occurs when $x$ hits upper/lower bounds encoded in constraints.
- Controls $u_t$ adjust thresholds based on risk tolerance.
