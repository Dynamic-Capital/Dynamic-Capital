# Proof-of-Work Expected Block Time

**Modules:** `dynamic_blockchain`, `dynamic_proof_of_work`

## Overview

Proof-of-work mining yields stochastic block discovery with expected
inter-arrival time proportional to network difficulty and inverse hash power.

## Equation

$$\mathbb{E}[T] = \frac{D}{H}$$

- $D$ — current difficulty target (in $\theta$).
- $H$ — aggregate network hash rate modeled as part of $x_t$ or disturbance
  $\xi_t$.

## Usage

- Controls $u_t$ include miner allocation or hash rate provisioning decisions.
- The resulting $T$ feeds latency metrics $y_t$ and loss terms penalizing slow
  block production.
