# Error Budget and Burn Rate

**Modules:** `dynamic_microservices`, `dynamic_logging`

## Overview

Monitors SLO consumption via remaining error budget and burn rate.

## Equations

\[ E = 1 - \text{SLO}, \qquad b = \frac{\text{errors in window}}{E \cdot
\text{window}}. \]

## Usage

- $E$ and $b$ contribute to observability dashboards ($y_t$).
- Controls $u_t$ may throttle features when burn rate exceeds thresholds.
