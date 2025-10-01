# Proof-of-Stake Selection Weight

**Modules:** `dynamic_blockchain`, `dynamic_proof_of_stake`,
`dynamic_validator`, `dynamic_wallet`

## Overview

Probability that validator $i$ proposes the next block based on stake weight.

## Equation

$$\Pr(i \text{ proposes}) = \frac{s_i}{\sum_j s_j}.$$

- $s_i$ — effective stake for validator $i$ captured in state $x_t$.
- The denominator aggregates across all active validators, potentially
  influenced by $\xi_t$ (joins/leaves).

## Usage

- Controls $u_t$ can adjust delegation strategies.
- Output metrics track fairness and decentralization using this distribution.
