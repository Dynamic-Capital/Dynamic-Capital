# Dynamic Platform Layer

The platform pillar brings together foundational infrastructure that powers the
Dynamic Capital network surface. It is split across three primary modules:

- **Web3** (`dynamic/platform/web3/`): Network telemetry, smart contract
  readiness, and bridge orchestration across supported chains.
- **Token** (`dynamic/platform/token/`): Treasury automation, committee
  alignment, and NFT utilities for the Dynamic Capital Token (DCT).
- **Engines** (`dynamic/platform/engines/`): Compatibility shims that expose
  legacy engine entry points while forwarding to the modern module layout.

When adding new services keep domain-specific logic inside the appropriate
subdirectory and expose curated exports in `__init__.py` for clarity.
