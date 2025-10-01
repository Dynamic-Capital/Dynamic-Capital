# Dynamic Component Naming Framework

This framework standardizes how we abbreviate components across the Dynamic
Capital ecosystem. It combines a protocol prefix, a functional abbreviation, and
an optional scope suffix to keep names concise, pronounceable, and unambiguous.

## Naming Syntax

```
<prefix>-<function>[-<scope>]
```

- **Prefix** anchors the component to the ecosystem domain.
- **Function** signals the module's primary responsibility.
- **Scope suffix** (optional) describes the layer where the component runs.

## Prefix Library

| Prefix | Domain                        | Pronunciation Tip | Notes                                                                               |
| ------ | ----------------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| `DC`   | Dynamic Capital core protocol | "dee-see"         | Default prefix for platform-wide services and shared libraries.                     |
| `AGI`  | Intelligence Oracle           | "ah-gee"          | Used for analytical, forecasting, or inference services powered by the AGI Oracle.  |
| `TT`   | Telegram & TON integration    | "tee-tee"         | Covers bots, bridges, and onboarding flows tied to Telegram or TON services.        |
| `DCT`  | Token layer                   | "dee-cee-tee"     | Applied to tokenomics, mint/burn logic, treasury automations, and supply telemetry. |

## Function Abbreviations

| Function     | Abbreviation | Description                                           | Example Name                      |
| ------------ | ------------ | ----------------------------------------------------- | --------------------------------- |
| Core Module  | `CM`         | Foundational service or orchestrator logic.           | `DC-CM` → Dynamic Core Module     |
| Token        | `TK`         | Fungible or non-fungible token artifacts.             | `DCT-TK` → Dynamic Capital Token  |
| Oracle       | `OR`         | Data feeds, inference engines, and pricing oracles.   | `AGI-OR` → AGI Oracle             |
| Signal       | `SG`         | Alerting, strategy signals, or telemetry dispatchers. | `DC-SG` → Dynamic Capital Signals |
| Governance   | `GV`         | Voting, policy, or treasury oversight modules.        | `DCT-GV` → Governance Layer       |
| Onboarding   | `ON`         | User activation and setup flows.                      | `TT-ON` → TON Onboarding          |
| Verification | `VR`         | Identity, compliance, or proof-of-humanity logic.     | `TT-VR` → TON Verification        |
| Pricing      | `PR`         | Market data valuation and pricing strategies.         | `AGI-PR` → Oracle Pricing         |
| Burn Logic   | `BL`         | Supply contraction mechanics and retirement events.   | `DCT-BL` → DCT Burn Logic         |

> **Metaphorical aliases:** for creative modules, layer in thematic descriptors
> (e.g., `AGI-OR-RES` for "Resonance" analytics, `DCT-BL-REGEN` for regenerative
> burn cycles) so long as the core prefix/function structure remains intact.

## Scope Suffix Options

| Suffix | Layer          | Usage                                                            |
| ------ | -------------- | ---------------------------------------------------------------- |
| `FE`   | Frontend       | Interfaces, dashboards, or mini-app UI packages.                 |
| `SC`   | Smart Contract | On-chain programs, jettons, and treasury logic.                  |
| `API`  | API Layer      | REST, GraphQL, or webhook surfaces.                              |
| `DB`   | Database       | Schema, migrations, analytical warehouses, or Supabase projects. |
| `CFG`  | Config         | Shared configuration, manifests, or infrastructure settings.     |

When multiple scopes apply, chain them from most user-facing to deepest
infrastructure (e.g., `TT-ON-FE-API`).

## Abbreviation Map

The table below documents current high-priority component names and their
purposes. Expand it as new services are introduced.

| Abbreviation | Full Name                            | Purpose                                                                               |
| ------------ | ------------------------------------ | ------------------------------------------------------------------------------------- |
| `DC-CM-API`  | Dynamic Core Module API              | Central orchestration surface exposing protocol capabilities to integrators.          |
| `DC-SG-FE`   | Dynamic Capital Signals Frontend     | Trader- and operator-facing interface for signal visualization.                       |
| `AGI-OR-API` | AGI Oracle API Layer                 | Machine intelligence endpoint delivering forecasts, pricing, and research insights.   |
| `AGI-PR-DB`  | Oracle Pricing Database              | Historical market store backing forecasting and pricing experiments.                  |
| `TT-ON-FE`   | TON Onboarding Frontend              | Guided onboarding experience for Telegram and TON participants.                       |
| `TT-VR-API`  | TON Verification API                 | KYC/AML verification checks interfacing with TON-native identity providers.           |
| `DCT-TK-SC`  | Dynamic Capital Token Smart Contract | Canonical token contract defining total supply, minting rules, and transfer policies. |
| `DCT-BL-SC`  | DCT Burn Logic Smart Contract        | Deflationary jetton logic executing scheduled or event-driven burn mechanics.         |
| `DCT-GV-CFG` | Governance Layer Config              | Policy definitions, quorum thresholds, and treasury rules for on-chain governance.    |

## Stewardship Checklist

1. **Avoid collisions:** Search the codebase and vendor services before
   introducing new abbreviations.
2. **Keep it pronounceable:** Read the full string aloud (`"dee-see-ess-eff-ee"`
   for `DC-SG-FE`). If it is awkward, revisit the function code or add
   hyphenation.
3. **Log metaphors:** Document any thematic suffixes in this file so
   contributors understand the narrative context.
4. **Review quarterly:** During roadmap reviews, audit this table to retire
   unused names and add emerging modules.

Maintaining this map keeps cross-team communication crisp while preserving the
creative tone of the Dynamic Capital ecosystem.

## Dynamic Naming Engine

Use the `DynamicNamingEngine` helper to generate or validate component names in
codebases, scripts, and documentation automation. The engine ships with the
defaults from this framework and can be extended with additional prefixes,
function codes, or scope suffixes.

```ts
import { defaultDynamicNamingEngine } from "../dynamic_naming/engine";

const { code, label } = defaultDynamicNamingEngine.generate({
  prefix: "DCT",
  func: "BL",
  scopes: ["SC"],
  metaphor: "Regen",
});

// code  → "DCT-BL-SC-REGEN"
// label → "Token layer Burn Logic Smart Contract Regen"
```

Call `parse` to break down existing abbreviations, or instantiate
`DynamicNamingEngine` with custom registries when integrating new ecosystems or
experimental metaphors.
