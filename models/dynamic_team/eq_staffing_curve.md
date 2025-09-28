# Staffing Productivity Curve

**Modules:** `dynamic_development_team`, `dynamic_team`

## Overview

Captures ramp-up of team productivity as members learn workflows.

## Equation

$$P_t = P_{\max} \big(1 - e^{-k t}\big).$$

- $P_{\max}$ — asymptotic productivity ($\theta$).
- $k$ — learning rate parameter.

## Notes

- Time $t$ may correspond to tenure tracked in state $x_t$.
- Controls $u_t$ include onboarding investments that modify $k$.
