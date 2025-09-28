# IP Allocation Pressure

**Modules:** `dynamic_ip_address`

## Overview

Tracks address pool pressure from requests and returns.

## Dynamics

$$A_{t+1} = A_t + \text{req}_t - \text{return}_t.$$

- $A_t$ — allocated addresses (state variable).
- Requests and returns can be controls ($u_t$) or disturbances ($\xi_t$).

## Notes

- Constraints enforce $0 \le A_t \le A_{\max}$ to avoid exhaustion.
- Outputs report utilization percentages for planning.
