# Proof-of-Space Winning Probability

**Modules:** `dynamic_blockchain`, `dynamic_proof_of_space`

## Overview

Proof-of-space leaders are selected proportionally to plot quality and storage
capacity.

## Relationship

$$\Pr(\text{win}_i) \propto \text{quality}(\text{plot}_i) \times \text{capacity}_i.$$

## Integration

- Normalize the proportional relationship to obtain a valid probability
  distribution.
- Plot quality metrics are stored in $x_t$; capacity adjustments may be controls
  $u_t$.
- Outputs monitor fairness and reward allocation variance.
