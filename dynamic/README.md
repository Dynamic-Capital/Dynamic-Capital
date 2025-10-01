# Dynamic Platform Architecture

This namespace consolidates the core Dynamic Capital pillars under a single
`dynamic/` root. Modules are grouped by responsibility so services, algorithms,
and tooling can share clear boundaries.

## Pillar overview

- **Platform** (`dynamic/platform/`): Bridges custody, network access, and
  shared execution engines for on-chain activity.
- **Governance** (`dynamic/governance/`): Automates stakeholder alignment and
  policy enforcement.
- **Intelligence** (`dynamic/intelligence/`): Houses self-improving AGI loops,
  copilots, and research assistants that power decision support.
- **Trading** (`dynamic/trading/`): Encapsulates discretionary guardrails and
  systematic execution logic for capital deployment.
- **Tools** (`dynamic/tools/`): Provides developer and operator utilities
  supporting observability and workflow orchestration.
- **Models** (`dynamic/models/`): Collects quantitative, sentiment, and
  predictive model specifications that feed trading strategies.
- **Brand** (`dynamic/brand/`): Centralises shared design language and experience
  assets for the Dynamic ecosystem.

Each subdirectory contains its own README describing the available packages and
how they should evolve.
