# Loop Equation Summary

- **One-line summary:** Update proto-neutron star mass via accretion and check
  compactness each timestep.

## Accretion Update with Black-Hole Check

The loop advances the proto-neutron star (PNS) mass by the accreted shell and
flags collapse when the compactness threshold is crossed:

$$
M_{\mathrm{PNS}}(t + \Delta t) = M_{\mathrm{PNS}}(t) + 4\pi r_{\mathrm{sh}}^{2} \, \rho(r_{\mathrm{sh}}) \, v_{\mathrm{ff}}(r_{\mathrm{sh}}) \, \Delta t,\\
\text{Black hole if } \frac{2 G M_{\mathrm{PNS}}(t)}{c^{2} R_{\mathrm{PNS}}(t)} \ge 1.
$$

Where:

- $M_{\mathrm{PNS}}$ — proto-neutron star mass.
- $r_{\mathrm{sh}}$ — shock radius.
- $\rho(r_{\mathrm{sh}})$ — density at the shock.
- $v_{\mathrm{ff}}(r_{\mathrm{sh}})$ — free-fall velocity at the shock.
- $R_{\mathrm{PNS}}$ — proto-neutron star radius.
- $G$ — gravitational constant, $c$ — speed of light.

The compactness check determines when continued accretion forces the PNS inside
its Schwarzschild radius, marking black-hole formation.
