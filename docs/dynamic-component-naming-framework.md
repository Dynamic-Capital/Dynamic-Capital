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

| Function                  | Abbreviation | Description                                                           | Example Name                                    |
| ------------------------- | ------------ | --------------------------------------------------------------------- | ----------------------------------------------- |
| Version Sequence          | `00`         | Release metadata and baseline numbering for intelligence services.    | `AGI-00` → AGI Baseline Release                 |
| Core Module               | `CM`         | Foundational service or orchestrator logic.                           | `DC-CM` → Dynamic Core Module                   |
| Token                     | `TK`         | Fungible or non-fungible token artifacts.                             | `DCT-TK` → Dynamic Capital Token                |
| Oracle                    | `OR`         | Data feeds, inference engines, and pricing oracles.                   | `AGI-OR` → AGI Oracle                           |
| Signal                    | `SG`         | Alerting, strategy signals, or telemetry dispatchers.                 | `DC-SG` → Dynamic Capital Signals               |
| Governance                | `GV`         | Voting, policy, or treasury oversight modules.                        | `DCT-GV` → Governance Layer                     |
| Onboarding                | `ON`         | User activation and setup flows.                                      | `TT-ON` → TON Onboarding                        |
| Verification              | `VR`         | Identity, compliance, or proof-of-humanity logic.                     | `TT-VR` → TON Verification                      |
| Pricing                   | `PR`         | Market data valuation and pricing strategies.                         | `AGI-PR` → Oracle Pricing                       |
| Burn Logic                | `BL`         | Supply contraction mechanics and retirement events.                   | `DCT-BL` → DCT Burn Logic                       |
| AGI-to-AGS Evolution      | `AGS`        | Transition programs guiding AGI toward superintelligence milestones.  | `AGI-AGS` → AGI to AGS Evolution Initiative     |
| GDPR Compliance           | `GDPR`       | EU General Data Protection Regulation controls and attestations.      | `DC-GDPR-2024` → GDPR Compliance Program        |
| HIPAA Compliance          | `HIPAA`      | Healthcare data privacy and security safeguards for HIPAA workloads.  | `DC-HIPAA-2024` → HIPAA Compliance Program      |
| ISMS Governance           | `ISMS`       | ISO 27001-aligned information security management system operations.  | `DC-ISMS-27001-2024` → ISMS Governance Stack    |
| PCI Security              | `PCI`        | Payment Card Industry Data Security Standard enforcement activities.  | `DC-PCI-2024-L1` → PCI DSS Level 1 Operations   |
| SOC 1 Assurance           | `SOC1`       | Financial control design, evidence gathering, and audit coordination. | `DC-SOC1-2024-T2` → SOC 1 Type 2 Readiness      |
| SOC 2 Assurance           | `SOC2`       | Trust Services Criteria monitoring and attestation programs.          | `DC-SOC2-2024-T2` → SOC 2 Type 2 Readiness      |
| TON Liquidity             | `TON`        | Bridges, liquidity pools, and trading venues for the TON ecosystem.   | `DCT-TON` → DCT / TON Liquidity Pair            |
| Generic Payment Reference | `XXXXXX`     | Placeholder identifiers ingested from partner banking artefacts.      | `DC-XXXXXX` → External Payment Reference Intake |

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

| Abbreviation         | Full Name                            | Purpose                                                                               |
| -------------------- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| `AGI-00`             | AGI Baseline Release Sequence        | Versioned metadata pipeline for AGI dictionary and research intelligence outputs.     |
| `AGI-AGS`            | AGI to AGS Evolution Initiative      | Quantum-native training and evaluation program guiding AGI toward AGS milestones.     |
| `AGI-OR-API`         | AGI Oracle API Layer                 | Machine intelligence endpoint delivering forecasts, pricing, and research insights.   |
| `AGI-PR-DB`          | Oracle Pricing Database              | Historical market store backing forecasting and pricing experiments.                  |
| `DC-CM-API`          | Dynamic Core Module API              | Central orchestration surface exposing protocol capabilities to integrators.          |
| `DC-GDPR-2024`       | GDPR Compliance Program 2024         | EU GDPR evidence pack, audits, and reporting automation.                              |
| `DC-HIPAA-2024`      | HIPAA Compliance Program 2024        | Healthcare data privacy and security attestation workflow.                            |
| `DC-ISMS-27001-2024` | ISMS Governance Stack 2024           | ISO 27001-aligned information security management controls and reviews.               |
| `DC-PCI-2024-L1`     | PCI DSS Level 1 Operations 2024      | Cardholder data environment hardening and auditor coordination.                       |
| `DC-SG-FE`           | Dynamic Capital Signals Frontend     | Trader- and operator-facing interface for signal visualization.                       |
| `DC-SOC1-2024-T2`    | SOC 1 Type 2 Readiness 2024          | Financial control testing and evidence management for SOC 1 reports.                  |
| `DC-SOC2-2024-T2`    | SOC 2 Type 2 Readiness 2024          | Trust Services Criteria monitoring, alerting, and compliance documentation.           |
| `DC-XXXXXX`          | External Payment Reference Intake    | Placeholder capture for transaction codes sourced from partner banking slips.         |
| `DCT-BL-SC`          | DCT Burn Logic Smart Contract        | Deflationary jetton logic executing scheduled or event-driven burn mechanics.         |
| `DCT-GV-CFG`         | Governance Layer Config              | Policy definitions, quorum thresholds, and treasury rules for on-chain governance.    |
| `DCT-TK-SC`          | Dynamic Capital Token Smart Contract | Canonical token contract defining total supply, minting rules, and transfer policies. |
| `DCT-TON`            | DCT / TON Liquidity Pair             | Liquidity routing, market making, and settlement support for the TON pair.            |
| `TT-ON-FE`           | TON Onboarding Frontend              | Guided onboarding experience for Telegram and TON participants.                       |
| `TT-VR-API`          | TON Verification API                 | KYC/AML verification checks interfacing with TON-native identity providers.           |

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

## Missing Component Name Scan

Run the repository-wide scan to identify component codes that reference
undefined prefixes, functions, or scopes:

```bash
npm exec deno run -- --allow-read dynamic_naming/scan_missing_names.ts
```

The latest scan now completes without unresolved codes after registering the
compliance, liquidity, and release functions:

```bash
npm exec deno run -- --allow-read dynamic_naming/scan_missing_names.ts
No missing component names detected for discovered codes.
```
