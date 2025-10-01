# TON Theme Pass Audit & Implementation Plan

## Executive Summary

- Theme Pass coverage stops at metadata URIs; the project has no built-in
  awareness of on-chain collection or item addresses for the three planned mints
  (`Genesis`, `Growth`, `Community`).
- Recently observed live NFTs (e.g., the Tonviewer item at
  `EQADj0c2ULLRZBvQlWPrjJnx6E5ccusPuP3FNKRDDxTBtTNo`) cannot be traced back to
  this repository because there is no sanctioned registry tying live addresses
  to mint indices.
- The absence of canonical storage across configuration, contracts, and Supabase
  assets leaves operations, bots, and audits without a dependable Theme Pass
  source of truth.

## Current Repository State

- `dynamic-capital-ton/config.yaml` enumerates the planned Theme Pass entries
  but records only metadata URIs.
- The contract deployment guide designates `config.yaml` as the authoritative
  manifest for mint ordering, implying that on-chain addresses also belong
  alongside this file for parity.
- Application utilities (`importDynamicBranding`, `normalizeThemePassTokens`)
  rely solely on metadata and tests; they never ingest deployed collection or
  item IDs.
- The `theme_collection.tact` contract secures DAO-only content management but
  ships without a deployment manifest that could inform indexers about the real
  NFT accounts.
- Supabase seeds cover multisigs, jettons, and routers; no tables or migrations
  exist for Theme Pass tracking.

## Gaps & Risks

- **Operational blind spot:** Without live addresses, operations and
  customer-support teams cannot confirm whether a discovered NFT is legitimate.
- **Indexing friction:** Mini apps, bots, and Supabase-backed services have no
  schema to resolve minted passes, reducing governance transparency.
- **Documentation drift:** Contributors must manually reconcile on-chain
  observations with the planned mint list, a process prone to error.

## Prioritized Implementation Plan

| Priority | Focus Area                 | Key Actions                                                                                                                                                                                              | Owners / Systems   |
| -------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| P0       | Configuration parity       | Extend each Theme Pass entry in `dynamic-capital-ton/config.yaml` with `collectionAddress` and optional `itemAddress`. Update `contracts/README.md` and any deployment SOPs to reference the new fields. | Contracts, DevOps  |
| P0       | Data persistence           | Create a `theme_passes` table (mint index, addresses, metadata URI, status) in Supabase with seed data synced from the configuration manifest.                                                           | Supabase, Data Eng |
| P1       | Application validation     | Update the `ThemePassSchema` (apps/web) and downstream utilities to accept the address fields, preserving backward-compatible optionality and adding targeted unit tests.                                | Web App, QA        |
| P1       | Observability & automation | Build a CLI under `dynamic-capital-ton/apps` that fetches Tonviewer data, validates it against the manifest, and updates Supabase. Wire basic alerts for mismatches.                                     | Tooling, Ops       |
| P2       | Documentation & runbooks   | Publish an operational checklist describing reconciliation, approval flow for new addresses, and Tonviewer verification steps.                                                                           | Documentation      |

## Verification Matrix

| Scope         | Command                                    | Purpose                                                            |
| ------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| Repo linting  | `npm run lint`                             | Ensure updated schemas and utilities honor lint rules.             |
| Type safety   | `npm run typecheck`                        | Catch schema evolution regressions.                                |
| Unit coverage | `npm run test`                             | Validate UI/business logic for Theme Pass consumers.               |
| TON tooling   | `deno test dynamic-capital-ton/apps/tests` | Confirm automation scripts continue to run after manifest changes. |
