# Dynamic Quantum Programming Cheat Sheets by Domain

These quick-reference cheat sheets gather essential resources, libraries, and
focal points for the key Dynamic Quantum domains. Use them to bootstrap
experiments, pick tooling, and understand the typical problem spaces for each
specialty.

## Dynamic Quantum Finance

- **Primary use cases**: Portfolio optimisation, risk modelling, option pricing,
  and algorithmic trading workflows.
- **Core libraries**:
  [`qiskit-finance`](https://qiskit.org/documentation/finance/),
  [`PennyLane`](https://pennylane.ai/), and
  [Q#](https://learn.microsoft.com/azure/quantum/overview-what-is-qsharp) for
  hybrid quantum-classical strategies.
- **Starter repository**:
  [Quantum Finance & Numerical Methods](https://github.com/MonitSharma/Quantum-Finance-and-Numerical-Methods)
  for sample circuits and quantitative patterns.
- **Trading logic focus**:
  - Encode historical or simulated price movements into amplitude or qubit
    registers.
  - Run Monte Carlo style distribution sampling on quantum hardware to explore
    risk surfaces.
  - Apply quantum phase estimation and related primitives to accelerate
    derivative pricing and hedging analytics.

## Dynamic Quantum Business & Optimisation

- **Primary use cases**: Supply-chain orchestration, logistics routing,
  workforce scheduling, and complex decision modelling.
- **Frameworks**: [`D-Wave Ocean`](https://docs.ocean.dwavesys.com/en/stable/),
  [`Qiskit Optimization`](https://qiskit.org/ecosystem/optimization/), and
  [`Cirq`](https://quantumai.google/cirq) for gate-level control.
- **Cheat sheet**:
  [IQM Circuit Magicians](https://meetiqm.com/blog/quantum-computing-cheat-sheet-for-circuit-magicians/)
  overview for circuit-level reminders.
- **Language focus**: Q#, Qiskit (Python), and Quantum Machine Learning (QML)
  DSLs to prototype annealing and variational workflows.
- **Implementation notes**:
  - Map combinatorial problems (e.g., routing, knapsack) into QUBO or Ising
    formulations for annealing.
  - Blend classical heuristics with quantum subroutines to keep solutions
    feasible in noisy intermediate-scale quantum (NISQ) settings.

## Dynamic Quantum Space Science

- **Primary use cases**: Satellite path optimisation, quantum sensing payload
  design, and simulation of cosmic phenomena.
- **Reference resources**:
  [UCSD Quantum Computation Notes Cheat Sheet (PDF)](https://cseweb.ucsd.edu/~slovett/workshops/quantum-computation-2018/files/cheat_sheet.pdf)
  for core formalism.
- **Focus areas**:
  - Quantum formalism for orbital mechanics and relativistic adjustments.
  - Entanglement-based sensing strategies for distributed satellite
    constellations.
  - Tensor network simulations of astrophysical systems to manage exponential
    state spaces.

## Dynamic Quantum Biology

- **Primary use cases**: Protein folding pathways, molecular dynamics, and
  quantum chemistry calculations for drug discovery.
- **Libraries**: [`OpenFermion`](https://github.com/quantumlib/OpenFermion),
  [`Qiskit Nature`](https://qiskit.org/ecosystem/nature/), and
  [`PennyLane`](https://pennylane.ai/) for differentiable chemistry workflows.
- **Cheat sheet hub**:
  [IQM Academy Cheat Sheets](https://github.com/iqm-finland/iqm-academy-cheat-sheets)
  for circuit design refreshers and lab exercises.
- **Execution focus**:
  - Encode molecular Hamiltonians using second quantisation and active-space
    reduction techniques.
  - Leverage variational quantum eigensolvers (VQE) or quantum phase estimation
    for energy landscape exploration.

## Dynamic Quantum Math

- **Primary use cases**: Linear algebra acceleration, probability amplitude
  manipulation, and quantum Fourier transforms (QFT).
- **Core concepts**: Bra–ket notation, tensor products for composite systems,
  and unitary matrix reasoning.
- **Cheat sheet**:
  [UCSD Quantum Computation Notes Cheat Sheet (PDF)](https://cseweb.ucsd.edu/~slovett/workshops/quantum-computation-2018/files/cheat_sheet.pdf)
  for a compact mathematical summary.
- **Key reminders**:
  - Normalise state vectors and verify unitary gate constructions before
    composing circuits.
  - Translate between matrix formulations and circuit diagrams to check
    intuition against implementation.

## Dynamic Quantum Physics

- **Primary use cases**: Simulation of quantum many-body systems, quantum field
  theory approximations, and decoherence modelling.
- **Canonical texts**: _Quantum Computation and Quantum Information_ (Nielsen &
  Chuang), Preskill's quantum computation lecture notes, and Mark Wilde's
  _Quantum Information Theory_ for rigorous treatments.
- **Cheat sheet**:
  [IQM Circuit Magicians](https://meetiqm.com/blog/quantum-computing-cheat-sheet-for-circuit-magicians/)
  for quick circuit syntax recall.
- **Practice focus**:
  - Build hybrid simulators that combine trotterised evolutions with error
    mitigation techniques.
  - Explore decoherence and noise channels using Kraus operators and master
    equation solvers to stress-test physical models.
