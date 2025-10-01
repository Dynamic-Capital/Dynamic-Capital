# Series Availability

**Modules:** `dynamic_microservices`, `dynamic_framework`

## Overview

When services are chained in series, the overall availability is the product of
component availabilities.

## Equation

$$A_{\text{series}} = \prod_i A_i.$$

## Notes

- State $x_t$ can track per-service uptime.
- Control $u_t$ includes redundancy planning or maintenance scheduling.
- Availability enters the loss through outage penalties.
