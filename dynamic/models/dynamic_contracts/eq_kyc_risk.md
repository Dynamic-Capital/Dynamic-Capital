# KYC Risk Scoring

**Modules:** `dynamic_kyc`

## Overview

Logistic regression over feature vector to estimate probability of risk.

## Equation

$$p(\text{risk}=1 \mid x) = \sigma(w^\top x).$$

- $x$ — applicant features (state or disturbance).
- $w$ — weight vector parameter in $\theta$.

## Notes

- Controls $u_t$ set thresholds for manual review.
- Risk scores populate compliance dashboards.
