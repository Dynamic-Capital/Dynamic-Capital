# Net Present Value of Contracts

**Modules:** `dynamic_contracts`, `dynamic_reference`

## Overview

Discounts future cash flows to assess contract value.

## Equation

$$\text{NPV} = \sum_t \frac{CF_t}{(1 + r)^t}.$$

- $CF_t$ — cash flow at period $t$ (disturbance or control).
- $r$ — discount rate parameter in $\theta$.

## Notes

- Output metrics compare NPV to liability thresholds.
- Controls $u_t$ can modify payment schedules to optimize NPV.
