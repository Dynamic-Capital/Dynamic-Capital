# Dynamic Capital TON Coin Status Report

## Current Mission & Utility

Dynamic Capital Token (DCT) operates as the proof-of-contribution asset for the Dynamic Capital intelligence network on The Open Network (TON). It unlocks AI-assisted trading intelligence, execution tooling, and liquidity programs across the protocol's intelligence, execution, and liquidity layers, tying contributor incentives to measurable platform improvements.【F:docs/dynamic-capital-ton-whitepaper.md†L3-L32】

## Economics & Governance Snapshot

- **Supply policy:** DCT supply is permanently capped at 100,000,000 tokens with emissions governed by a timelocked multisig and three proof-of-contribution pools that decay over phased release schedules.【F:docs/dynamic-capital-ton-whitepaper.md†L34-L61】
- **Genesis circulation:** 13% of supply enters circulation at launch, spanning community quests, TON liquidity, partnership pilots, and the strategic reserve, while team, investor, and ecosystem allocations vest on-chain with transparent cliffs.【F:docs/dynamic-capital-ton-whitepaper.md†L44-L51】
- **Treasury routing:** Operating, auto-invest, and buyback budgets default to a 60/30/10 split with configurable guardrails (operations 40–75%, auto-invest 15–45%, buyback 5–20%).【F:dynamic-capital-ton/config.yaml†L1-L14】
- **Staking tiers:** Bronze, Silver, and Gold locks span 3, 6, and 12 months with multiplier boosts of 1.2×, 1.5×, and 2.0× respectively.【F:dynamic-capital-ton/config.yaml†L16-L20】
- **Governance safety rails:** The Tonstarter treasury multisig enforces a 48-hour timelock on administrative changes, complemented by DAO oversight of liquidity, buybacks, and emission throttles.【F:dynamic-capital-ton/config.yaml†L26-L29】【F:docs/dynamic-capital-ton-whitepaper.md†L89-L116】

## Deployment & Infrastructure Readiness

- **Contracts:** The jetton master, wallet, allocator, and theme pass contracts are defined in `dynamic-capital-ton/contracts`, with deployment checklists covering multisig configuration, genesis minting, and governance opcodes.【F:dynamic-capital-ton/contracts/README.md†L1-L52】
- **Network config:** Global and lite server endpoints are pre-configured to connect to TON infrastructure, enabling validator, DNS, and multisig operations out of the box.【F:dynamic-capital-ton/global.config.json†L1-L158】
- **Theme passes:** Governance-managed NFT theme passes have preset content URIs and royalty routing for Genesis, Growth, and Community drops, all anchored in the configuration manifest.【F:dynamic-capital-ton/config.yaml†L31-L49】

## Application Surface Status

- **Telegram Mini App:** A Next.js mini app integrates TON Connect, wallet linking, and Supabase-powered subscription processing. Local environment variables and verification steps document how to exercise the Supabase proxy routes end-to-end.【F:dynamic-capital-ton/apps/miniapp/README.md†L1-L45】
- **Testing Harness:** Deno-based allocator tests cover timelock enforcement, swap accounting, jetton transfer handling, and withdrawal safety checks, ensuring allocator logic is validated even before on-chain deployment.【F:dynamic-capital-ton/apps/tests/pool_allocator.test.ts†L45-L190】

## Outstanding Workstreams

- **Allocator compliance:** The pool allocator still requires a TIP-3 parsing overhaul so deposits forward the declared `forward_ton_amount`, emit events from parsed data, and validate opcodes before accepting transfers.【F:dynamic-capital-ton/IMPLEMENTATION_PLAN.md†L5-L66】【F:dynamic-capital-ton/IMPLEMENTATION_PLAN.md†L74-L85】
- **Regression coverage:** Follow-up work must extend allocator tests to simulate compliant TIP-3 transfers and rejection scenarios, then run the formatting, linting, and contract suites captured in the implementation plan’s housekeeping step.【F:dynamic-capital-ton/IMPLEMENTATION_PLAN.md†L56-L71】【F:dynamic-capital-ton/IMPLEMENTATION_PLAN.md†L82-L100】

## Launch Monitoring Priorities

The launch playbook emphasizes market structure discipline—dual exchange listings, guarded Dutch auction mechanics, and ongoing buyback/burn levers—paired with real-time analytics that broadcast price bands, depth, supply, and burn totals to governance and market-ops teams.【F:docs/dynamic-capital-ton-whitepaper.md†L63-L133】
