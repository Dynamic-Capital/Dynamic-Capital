# Proof-of-Authority Finality Condition

**Modules:** `dynamic_blockchain`, `dynamic_proof_of_authority`

## Overview

Proof-of-authority chains finalize blocks once enough validators sign,
guaranteeing Byzantine fault tolerance.

## Condition

$$m \ge 2f + 1$$

- $m$ — number of validator signatures collected (observed in $x_t$).
- $f$ — maximum tolerated Byzantine nodes parameterized in $\theta$.

## Integration

- Controls $u_t$ influence signature solicitation strategies or validator
  rotation.
- Constraints enforce the inequality to mark finality.
