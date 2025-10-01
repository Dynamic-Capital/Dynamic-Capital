# Parallel Availability (Active-Active)

**Modules:** `dynamic_microservices`, `dynamic_logging`

## Overview

Active-active replicas increase availability by failing over to healthy nodes.

## Equation

$$A_{\text{parallel}} = 1 - \prod_i (1 - A_i).$$

## Notes

- Redundant replicas appear in state $x_t$; controls toggle capacity
  allocations.
- Logging modules use $A_{\text{parallel}}$ to verify SLO compliance.
