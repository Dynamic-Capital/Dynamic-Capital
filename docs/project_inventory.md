# Project Inventory Details

## Overview

This document summarizes major subsystems and resource directories in the
Dynamic Capital monorepo. It builds on the high-level inventory and clusters
related assets to simplify discovery and onboarding.

## Core Platform Foundations

- **`core/`** – Foundational libraries, shared abstractions, and utilities
  consumed across many Dynamic Capital services.
- **`shared/`** – Cross-cutting helpers, adapters, and configuration elements
  reused by multiple applications.
- **`src/`** – Primary source modules that expose reusable business logic, data
  models, and service primitives.
- **`integrations/`** – Connectors for third-party services, external APIs, and
  infrastructure providers.
- **`algorithms/` & `dynamic_*/` families** – Algorithm implementations and
  extensive domain-specific packages (e.g., `dynamic_quantum`, `dynamic_memory`,
  `dynamic_blockchain`) that encapsulate specialized capabilities.

## Application and Interface Layers

- **`apps/`** – Bundled user-facing and service applications; includes the
  Next.js front ends in `apps/web` and `apps/landing`.
- **`server.js` & `Procfile`** – Entry points and process descriptors for
  hosting Node-based services in production environments.

## Intelligent Agents and Cognitive Tooling

- **`dynamic_agents/` & `dynamic_bots/`** – Libraries of specialized agents,
  bots, and orchestration logic spanning domains from astronomy to mentorship.
- **`dynamic_thinking/`, `dynamic_creative_thinking/`,
  `dynamic_critical_thinking/`** – Cognitive modeling toolkits that encapsulate
  reasoning and strategy engines.
- **`dynamic_task_manager/` & `dynamic_trainer/`** – Workflow automation, task
  coordination, and iterative training utilities.

## Data, Knowledge, and Learning Assets

- **`data/` & `db/`** – Structured datasets, schema definitions, and migration
  assets supporting persistence layers.
- **`dynamic_memory/` & `dynamic_memory_reconsolidation/`** – Modules dedicated
  to memory storage, retrieval, and reinforcement strategies.
- **`ml/`, `dynamic/models/`, `trainer/`** – Machine learning experiments, trained
  artifacts, and tooling for iterative model development.
- **`docs/`, `_static/`, `content/`** – Documentation, static assets, and
  curated knowledge bases that aid onboarding and research.

## Infrastructure and Operations

- **`docker/`** – Container definitions, runtime environments, and deployment
  scaffolding.
- **`env/`, `project.toml`, `deno.json`, `tsconfig.json`** – Environment
  configuration and project-level metadata for Deno/TypeScript workflows.
- **`scripts/`, `tools/`, `functions/`, `dynamic_tool_kits/`** – Operational
  scripts, serverless functions, and developer utilities that facilitate
  maintenance and monitoring.
- **`supabase/`, `queue/`, `dynamic_message_queue/`** – Managed service
  integrations, messaging infrastructure, and queue management resources.

## Financial and Market Systems

- **`dynamic_accounting/`, `dynamic_forecast/`, `dynamic_wallet/`** –
  Finance-focused automation covering accounting, predictive analytics, and
  wallet management.
- **`dynamic_numbers/`, `dynamic_volume/`, `dynamic_candles/`** – Market data
  processing, numerical analysis, and trading signal generation utilities.
- **`dynamic_contracts/`, `dynamic_stake/`, `dynamic_proof_of_*`** –
  Smart-contract tooling, staking mechanisms, and consensus-model-specific
  implementations (proof of work, stake, history, etc.).

## Observability, Security, and Governance

- **`dynamic_logging/`, `dynamic_firewall/`, `dynamic_encryption/`,
  `dynamic_kyc/`** – Logging pipelines, security operations, encryption suites,
  and regulatory compliance modules.
- **`SECURITY.md`, `CODEOWNERS`** – Governance policies, responsible disclosure
  practices, and code ownership mappings.

## Testing and Quality Assurance

- **`tests/`, `tests_python/`** – Automated test suites covering multiple
  runtime environments (TypeScript, Python, etc.).
- **`fixtures/`, `dynamic_benchmark/`, `dynamic_validator/`** – Benchmarking
  data, validation harnesses, and scenario-based fixtures.
- **Quality gates:** Run `npm run lint`, `npm run typecheck`, and `npm run test`
  as referenced in the repository's contribution guidelines.

## Ancillary Assets

- **`README.md`, `LICENSE`, `SECURITY.md`** – High-level repository
  documentation, licensing, and security guidance.
- **`collect_tradingview.py`, `dynamic_quote/`** – Data collection scripts and
  quote generation utilities related to trading and market intelligence.
- **`index.html`, `lovable-build.js`, `lovable-dev.js`** – Standalone HTML
  artifacts and build tooling for lightweight demos or landing experiences.

## Usage Notes

- The breadth of `dynamic_*` packages reflects the modular nature of the
  platform. Each directory is typically self-contained and aligned with a
  specific capability or conceptual area.
- Contributors should consult individual module README files (where present) for
  deeper implementation details and follow repository-wide guidelines regarding
  TypeScript usage, formatting, and testing.
