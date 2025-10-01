# Dynamic Quantum Programming Cheat Sheets by Domain

This guide expands the original cheat sheets by capturing concrete highlights
directly extracted from the linked resources. Each section lists the primary use
cases alongside verbatim insights gathered from the referenced documentation,
blogs, or repositories so you can jump straight into the most relevant tools.

## Dynamic Quantum Finance

- **Primary use cases**: Portfolio optimisation, risk modelling, option pricing,
  and algorithmic trading workflows.
- **Use the tooling for**:
  - [`qiskit-finance`](https://qiskit.org/documentation/finance/): The
    documentation describes the package as “an open-source framework that
    contains uncertainty components for stock/securities problems, applications
    for finance problems, such as portfolio optimization, and data providers to
    source real or random data.”
  - [`PennyLane`](https://github.com/PennyLaneAI/pennylane/blob/master/README.md):
    The README positions PennyLane as “the definitive open-source framework for
    quantum programming” with features that let you “build quantum circuits …
    run on high-performance simulators or various hardware devices … integrate
    with PyTorch, TensorFlow, JAX, Keras, or NumPy to define and train hybrid
    models.”
  - [Quantum Finance & Numerical Methods](https://github.com/MonitSharma/Quantum-Finance-and-Numerical-Methods):
    The repository README emphasises curated materials for “financial modeling,
    data visualization, and economic forecasting” with course folders that cover
    “Introduction to Finance with Python,” “Machine Learning for Finance,” and
    “Classical Use Cases.”
- **Execution notes**:
  - Encode historical or simulated price paths into amplitude registers, then
    call Qiskit Finance data providers for scenario generation.
  - Build differentiable pipelines with PennyLane to optimise hedging
    strategies against simulated payoffs.
  - Prototype Monte-Carlo and phase-estimation pricing examples by adapting the
    repository’s notebooks.

## Dynamic Quantum Business & Optimisation

- **Primary use cases**: Supply-chain orchestration, logistics routing,
  workforce scheduling, and decision modelling.
- **Use the tooling for**:
  - [`D-Wave Ocean`](https://docs.ocean.dwavesys.com/en/stable/ocean/index.html):
    The SDK overview highlights the “Python-based open-source software
    development kit … [that] makes application development for quantum
    computers rapid and efficient” plus the Leap service for running demos on
    D-Wave hardware.
  - [`Qiskit Optimization`](https://qiskit.org/ecosystem/optimization/index.html):
    Its overview explains that the framework spans “high-level modeling of
    optimization problems … automatic conversion between different problem
    representations … [and] a suite of easy-to-use quantum optimization
    algorithms” including QAOA and Grover-based search.
  - [`Cirq`](https://quantumai.google/cirq): Google’s landing page reiterates
    that “Cirq is a Python software library for writing, manipulating, and
    optimizing quantum circuits … Cirq comes with built-in simulators … and
    works with a state-of-the-art wave function simulator: qsim.”
- **Execution notes**:
  - Formulate logistics or routing decisions as QUBO/Ising cost functions for
    D-Wave Ocean samplers.
  - Prototype docplex models, convert them through Qiskit Optimization, and
    benchmark variational solvers.
  - Use Cirq’s hardware-aware abstractions to validate low-level gate layouts
    before deploying to annealers or gate-model backends.

## Dynamic Quantum Space Science

- **Primary use cases**: Satellite path optimisation, quantum sensing payload
  design, and simulation of cosmic phenomena.
- **Resource extraction**:
  - [UCSD Quantum Computation Cheat Sheet](https://cseweb.ucsd.edu/~slovett/workshops/quantum-computation-2018/files/cheat_sheet.pdf)
    summarises the “basics of quantum computation” and points readers toward
    canonical texts by Nielsen & Chuang, Kitaev et al., and Mark Wilde, making
    it a concise refresher when translating orbital mechanics or sensing
    problems into qubit formalisms.
- **Execution notes**:
  - Use the cheat sheet’s reminders on states, gates, and measurement to map
    orbital perturbations into tensor networks or amplitude encodings.
  - Combine formalism guidance with mission-specific simulations for entangled
    sensing constellations.

## Dynamic Quantum Biology

- **Primary use cases**: Protein folding pathways, molecular simulation, and
  quantum chemistry for drug discovery.
- **Use the tooling for**:
  - [`OpenFermion`](https://github.com/quantumlib/OpenFermion/blob/master/README.rst):
    The README calls it “an open-source library for compiling and analyzing
    quantum algorithms to simulate fermionic systems” and lists plugins for
    Psi4, PySCF, Dirac, and Q-Chem to integrate classical electronic structure
    solvers.
  - [`Qiskit Nature`](https://qiskit.org/ecosystem/nature/): The API catalog
    surfaces electronic and vibrational structure drivers, Hamiltonian classes
    such as `ElectronicEnergy` and `VibrationalEnergy`, and mapper utilities
    (Jordan–Wigner, Bravyi–Kitaev, bosonic mappers) for converting chemistry
    problems into qubit operators.
  - [`PennyLane`](https://github.com/PennyLaneAI/pennylane/blob/master/README.md):
    Its key features emphasise quantum chemistry tooling, machine-learning
    integrations, and hardware backends ideal for differentiable VQE pipelines.
- **Execution notes**:
  - Combine OpenFermion’s Hamiltonian generators with Qiskit Nature drivers to
    create active space reductions, then map to qubits using the available
    mappers.
  - Optimise VQE ansätze via PennyLane’s autodiff interfaces or leverage its
    dataset hub for benchmarking molecular ground states.

## Dynamic Quantum Math

- **Primary use cases**: Linear algebra acceleration, amplitude manipulation,
  and Fourier transforms.
- **Resource extraction**:
  - The UCSD cheat sheet’s subsequent pages reintroduce computational basis
    states \(|0\rangle, |1\rangle\), Hadamard-derived \(|\pm\rangle\) bases, and
    the Pauli operators \(X, Y, Z\), providing quick references when validating
    tensor decompositions or gate algebra in algorithm design.
- **Execution notes**:
  - Keep the bra–ket identities from the cheat sheet nearby while deriving
    algebraic proofs for QFT, amplitude amplification, or error-correcting
    stabilisers.
  - Use the Pauli table to sanity-check commutation relations in linear
    combinations of unitaries.

## Dynamic Quantum Physics

- **Primary use cases**: Many-body simulation, quantum field approximations,
  and decoherence modelling.
- **Resource extraction**:
  - [IQM Circuit Magicians](https://meetiqm.com/blog/quantum-computing-cheat-sheet-for-circuit-magicians/)
    explains that the downloadable cheat sheet “contains not only basics about
    qubits but also various gates and some building blocks that might be helpful
    in your algorithm,” acting as a gate-level aide-mémoire for physical
    modelling.
  - The [IQM Academy cheat sheet hub](https://github.com/iqm-finland/iqm-academy-cheat-sheets/blob/master/README.md)
    documents translations and licensing for sharing circuit resources, useful
    for collaborative lab environments.
- **Execution notes**:
  - Reference the gate catalogue when constructing trotterised Hamiltonian
    evolutions or noise-insertion experiments.
  - Align lab documentation with the CC-BY-SA licence guidance when adapting
    IQM materials for internal physics curricula.
