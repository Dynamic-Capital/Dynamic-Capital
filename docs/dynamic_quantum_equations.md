# Dynamic Quantum Equations in Cosmic Contexts

Understanding the universe's evolution requires following how quantum fields,
particles, and spacetime itself interact across wildly different energy scales.
This note highlights foundational equations, shows how to plug in realistic
numbers, and points to observational tests that keep the theory anchored.

## 1. Quantum Fluctuations in the Early Universe

### Governing dynamics

During cosmic inflation (roughly \(10^{-36}\)–\(10^{-32}\) s after the Big Bang)
the inflaton field \(\phi\) obeys a Klein–Gordon equation in a curved
background:

```math
\ddot{\phi} + 3H \dot{\phi} - \frac{1}{a^2} \nabla^2 \phi + V'(\phi) = 0.
```

Slow-roll inflation further satisfies \(\epsilon = -\dot{H}/H^2 \ll 1\) and
\(\eta = V''/ (3H^2) \ll 1\), letting us approximate \(3H\dot{\phi} \simeq -
V'(\phi)\).

### Perturbation amplitude

Quantum fluctuations \(\delta\phi\) become curvature perturbations with power
spectrum

```math
P_{\mathcal{R}}(k) = \frac{1}{8\pi^2 M_\text{Pl}^2} \frac{H^2}{\epsilon}
\Bigg|_{k = aH},
```

implying a spectral index \(n_s \approx 1 - 6\epsilon + 2\eta\). For example,
choosing \(H = 10^{14}\,\text{GeV}\) and \(\epsilon = 0.01\) yields
\(P_{\mathcal{R}}^{1/2} \approx 4.5 \times 10^{-5}\), matching the COBE/WMAP
normalization.

#### Worked derivation: from Mukhanov–Sasaki to \(P_{\mathcal{R}}(k)\)

1. Start with the Mukhanov–Sasaki equation for the canonical mode \(v_k = z
   \mathcal{R}_k\):

   ```math
   v_k'' + \left(k^2 - \frac{z''}{z}\right) v_k = 0, \qquad z \equiv a \frac{\dot{\phi}}{H}.
   ```

   In slow-roll de Sitter, \(z''/z \approx 2/\tau^2\) with conformal time \(\tau
   = -1/(aH)(1-\epsilon)\).

2. Impose Bunch–Davies initial conditions deep inside the horizon (\(|k\tau| \gg
   1\)) so that

   ```math
   v_k(\tau) \to \frac{1}{\sqrt{2k}} e^{-ik\tau}.
   ```

3. Solve the equation with Hankel functions. For nearly scale-invariant
   backgrounds, the late-time solution (\(|k\tau| \ll 1\)) becomes

   ```math
   v_k(\tau) \simeq \frac{i}{\sqrt{2k^3}} \frac{1}{\tau} (1 + i k \tau) e^{-ik\tau}.
   ```

4. Convert back to curvature perturbations using \(\mathcal{R}_k = v_k / z\) and
   evaluate at horizon exit \(k = aH\):

   ```math
   |\mathcal{R}_k|^2 = \frac{H^4}{4 \dot{\phi}^2 k^3} = \frac{H^2}{8 \pi^2 M_\text{Pl}^2 \epsilon} \frac{2\pi^2}{k^3}.
   ```

5. Finally, identify the dimensionless power spectrum via \(P_{\mathcal{R}}(k) =
   \frac{k^3}{2 \pi^2} |\mathcal{R}_k|^2\), yielding the expression above and
   reproducing Planck's measured amplitude when slow-roll parameters satisfy the
   observed bounds.

### Observational links

- Planck 2018 data prefers \(n_s = 0.9649 \pm 0.0042\) and \(r = 16\epsilon <
  0.07\) (95% C.L.), constraining inflaton potentials.
- Baryon acoustic oscillations and large-scale structure surveys verify the
  predicted nearly scale-invariant spectrum.

## 2. Black Holes and Hawking Radiation

### Thermodynamic summary

Semi-classical gravity predicts a black hole of mass \(M\) radiates thermally:

```math
T_H = \frac{\hbar c^3}{8 \pi G M k_B}, \qquad S = \frac{k_B c^3 A}{4 G \hbar}.
```

The luminosity scales as \(L \propto 1/M^2\), while the evaporation timescale is

```math
t_\text{evap} \approx \frac{5120 \pi G^2 M^3}{\hbar c^4}.
```

A solar-mass black hole (\(M_\odot \approx 2 \times 10^{30}\,\text{kg}\)) has
\(T_H \sim 6 \times 10^{-8}\,\text{K}\) and \(t_\text{evap} \sim 10^{67}\)
years, whereas a primordial black hole with \(M \sim 10^{12}\,\text{kg}\) would
evaporate within the current age of the universe, potentially leaving
high-energy gamma-ray signatures.

#### Greybody-corrected emission template

The pure blackbody spectrum is filtered by frequency-dependent transmission
coefficients \(\Gamma_{s\ell m}(\omega)\). The differential power carried by a
particle species of spin \(s\) is

```math
\frac{\mathrm{d}^2 E}{\mathrm{d}t\,\mathrm{d}\omega} = \sum_{\ell, m} \frac{\Gamma_{s\ell m}(\omega)}{2\pi} \frac{\omega}{\exp(\omega / T_H) - (-1)^{2s}}.
```

Numerical codes (e.g., BlackHawk, HawcEvap) tabulate \(\Gamma\) by solving the
radial Teukolsky equation. Including these factors boosts the high-energy tail
for fermions and suppresses low-frequency scalar emission, refining constraints
from gamma-ray and cosmic-ray searches.

### Observational links

- Fermi-LAT and INTEGRAL monitor bursts that could match the terminal phase of
  primordial black hole evaporation.
- Event horizon telescope imaging constrains deviations from the thermal
  spectrum expected for near-equilibrium accretion flows.

## 3. Quantum Entanglement Across Cosmological Scales

### Canonical correlations

Bell pairs illustrate maximal spin entanglement:

```math
|\psi\rangle = \frac{1}{\sqrt{2}} \left(| \uparrow \downarrow \rangle -
| \downarrow \uparrow \rangle \right).
```

Tracing out one qubit yields \(\rho_A = \operatorname{Tr}_B
|\psi\rangle\langle\psi| = \tfrac{1}{2} I\) with von Neumann entropy

```math
S(\rho_A) = -\operatorname{Tr}(\rho_A \log \rho_A) = \log 2.
```

In quantum field theory, entanglement entropy of a region typically scales with
the boundary area \(S \propto A/\epsilon^2\), hinting at holographic relations
between geometry and information.

### Cosmological interpretations

- The ER=EPR proposal equates entangled pairs with non-traversable wormholes,
  motivating tensor-network toy models for emergent spacetime.
- Inflationary modes exiting the horizon remain entangled; decoherence by the
  environment renders density perturbations effectively classical.

#### Tensor-network playground

- **Setup:** Represent a discretized de Sitter patch with a MERA or PEPS
  network, assigning qubits to coarse-grained Hubble patches.
- **Metric proxy:** Track minimal cuts through the network to estimate emergent
  geodesic distances, mirroring Ryu–Takayanagi area laws.
- **Reheating probe:** Quench the network by coupling edge tensors to thermal
  baths, then monitor entanglement growth to emulate particle production at the
  end of inflation.

## 4. Wheeler–DeWitt Equation and Quantum Cosmology

### Timeless constraint

Canonical quantization of general relativity imposes the Hamiltonian constraint
on the universal wave functional:

```math
\hat{H} \Psi[h_{ij}, \phi] = 0.
```

In minisuperspace (homogeneous, isotropic metrics with scale factor \(a\)), this
simplifies to

```math
\left[ -\frac{\hbar^2}{2 M_\text{Pl}^2} \frac{\partial^2}{\partial a^2} +
U(a) \right] \Psi(a) = 0,
```

where \(U(a)\) encodes curvature, cosmological constant, and matter sources.
Applying the Hartle–Hawking no-boundary condition selects regular solutions as
\(a \to 0\), while Vilenkin's tunneling proposal favors outgoing modes.

### Practical approaches

- Use semiclassical WKB methods to extract an emergent time variable from the
  phase of \(\Psi\).
- Couple the minisuperspace background to perturbations to compute quantum
  corrections to inflationary observables.
- Implement finite-difference or spectral collocation schemes to solve the
  Wheeler–DeWitt equation with loop quantum cosmology potentials, checking for
  bounce solutions that avoid singularities.

## 5. Hydrogen Atom in Stellar Environments

### Bound-state solution

The stationary Schrödinger equation in a Coulomb potential is

```math
\left( -\frac{\hbar^2}{2m_e} \nabla^2 - \frac{e^2}{4\pi \varepsilon_0 r} \right)
\psi(r, \theta, \phi) = E \psi(r, \theta, \phi).
```

The ground state wavefunction and energy are

```math
\psi_{1s}(r) = \frac{1}{\sqrt{\pi a_0^3}} e^{-r/a_0}, \qquad
E_1 = -\frac{13.6\,\text{eV}}{n^2}, \quad n = 1,
```

with Bohr radius \(a_0 = 0.529\,\text{Å}\).

### Stellar relevance

- Quantum tunneling allows protons to overcome the Coulomb barrier in stellar
  cores. The Gamow factor estimates the tunneling probability \(P \sim
  \exp(-2\pi Z_1 Z_2 \alpha c / v)\).
- Balmer and Lyman spectral lines, shifted by Doppler and Stark effects,
  diagnose stellar temperatures, densities, and compositions; JWST and ground
  spectrographs extend these measurements to high-redshift galaxies.

## Next steps for exploration

1. Derive \(P_{\mathcal{R}}(k)\) from the Mukhanov–Sasaki equation and compare
   with Planck likelihood chains for different inflationary potentials.
2. Fit greybody-corrected Hawking spectra to Fermi-LAT and AMEGO forecasts to
   bracket primordial black hole contributions to the extragalactic gamma-ray
   background.
3. Prototype the tensor-network rehearsal outlined above to test ER=EPR-driven
   entanglement geometries in expanding spacetimes.
4. Apply the numerical Wheeler–DeWitt pipeline to loop quantum cosmology to
   assess whether bounce scenarios produce observable imprints.
5. Incorporate updated astrophysical S-factors into stellar evolution codes to
   quantify how tunneling corrections shift main-sequence lifetimes.
