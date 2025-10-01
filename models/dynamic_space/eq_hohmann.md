# Hohmann Transfer Delta-V

**Modules:** `dynamic_space`, `dynamic_interplanetary_space`

## Overview

Delta-v requirements for transferring between circular coplanar orbits using a
Hohmann maneuver.

## Equation

\[ \Delta v = \sqrt{\frac{\mu}{r_1}}\left(\sqrt{\frac{2 r_2}{r_1 + r_2}} -
1\right) + \sqrt{\frac{\mu}{r_2}}\left(1 - \sqrt{\frac{2 r_1}{r_1 +
r_2}}\right). \]

- $r_1$, $r_2$ — initial and target orbital radii.
- $\mu$ — gravitational parameter.

## Notes

- Controls $u_t$ schedule burns; disturbances include navigation errors.
- Delta-v budgets feed mission planning objectives.
