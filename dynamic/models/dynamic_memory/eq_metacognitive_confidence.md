# Metacognitive Confidence Signal

**Modules:** `dynamic_metacognition`

## Overview

Sigmoid-transformed evidence forms subjective confidence levels.

## Equation

$$c = \sigma(w^\top z).$$

- $z$ — feature vector summarizing decision evidence (state component).
- $w$ — weight vector in $\theta$.
- $\sigma(\cdot)$ — logistic function.

## Notes

- Controls $u_t$ may regularize or recalibrate weights.
- Confidence scores feed monitoring dashboards and adaptive thresholds.
