# Platform · Web3 Services

`dynamic/platform/web3/` concentrates the network access layer for Dynamic
Capital. The package provides:

- Health and readiness scoring for supported chains.
- Smart contract registration, telemetry ingestion, and unified status reports.
- Guardrails that block go-live events when reliability thresholds are missed.

Use this module for bridge monitoring, RPC orchestration, and on-chain routing
utilities. New adapters should export typed dataclasses and be documented in this
README.
