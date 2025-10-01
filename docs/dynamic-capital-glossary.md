# Dynamic Capital Glossary

> **Last synchronized:** 2025-09-27 21:01 UTC

This optimized glossary centralizes key Dynamic Capital terminology and calls
out the letter each term starts with, the words that matter most, and any
governing numbers for quick recall while building, operating, or auditing the
platform.

## How to Use This Glossary

- Scan the **Letter** field to jump to related concepts grouped by alphabetical
  proximity.
- Reference the **Keywords** for the essential words that anchor each term's
  context.
- Check **Key Numbers** whenever automation, treasury, or access rules depend on
  explicit quantitative guardrails.
- Pair this glossary with the
  [Trading Glossary Index](./trading-glossary-index.md) for market-structure
  vocabulary and consult the [Dynamic AI Overview](./dynamic-ai-overview.md) or
  [Ecosystem Anatomy](./dynamic-capital-ecosystem-anatomy.md) when extending
  automation or treasury mechanics.

### Quick Letter Index

- [D](#d)
- [E](#e)
- [G](#g)
- [M](#m)
- [S](#s)
- [T](#t)
- [V](#v)

## Glossary by Letter

### D

| Term                             | Letter | Keywords                                               | Key Numbers                                                                            | Summary                                                                                                                                                                              |
| -------------------------------- | ------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dynamic Capital                  | D      | Telegram bot; Next.js mini app; treasury orchestration | 2 core customer surfaces (Telegram bot + mini app)                                     | Telegram-first platform that pairs a TypeScript/Deno Telegram bot with a glass-themed Next.js mini app to streamline deposits, automation enrollment, and shared admin tooling.      |
| Dynamic Capital Token (DCT)      | D      | Utility token; TON; governance                         | 100,000,000 token supply cap held under multisig control                               | On-chain utility asset on The Open Network (TON) that coordinates access, liquidity, and governance for intelligence, execution, and treasury layers while enforcing managed supply. |
| Dynamic AI (DAI)                 | D      | Directional models; sentiment; guardrails              | 4 fused lobes (directional, momentum, sentiment, treasury)                             | Brain layer that produces governed trading recommendations with rationale payloads, confidence scores, and guardrails that feed execution and compliance pathways.                   |
| Dynamic Market Review Automation | D      | Signal aggregation; hedging triggers; telemetry bus    | 3 inbound signal sources (TradingView, Telegram, Supabase)                             | Automation pipeline that merges alerts, notifications, and database events into actionable hedging triggers for operators and bots.                                                  |
| Dynamic Hedge Model              | D      | Risk alignment; treasury guardrails; approval chain    | 2-stage validation (AI output alignment + treasury threshold check)                    | Risk-oriented module that ingests market telemetry and Dynamic AI directives to compute hedging instructions governed by treasury guardrails and operator approvals.                 |
| Dynamic Integration Algo (DIA)   | D      | Integrations; signal routing; platform sync            | Bridges 5 primary platforms (Telegram, Supabase, MT5, TradingView, auxiliary services) | Nervous-system service that maintains resilient connections across messaging, storage, execution, and analytics surfaces to keep signals and governance hooks synchronized.          |
| Dynamic Codex                    | D      | AI-assisted shipping; UI export; automation alignment  | Automates UI updates across 2 Telegram surfaces                                        | AI-supported development workflow that exports UI changes, automates build steps, and keeps Next.js surfaces aligned with repository automation for faster, consistent releases.     |

### E

| Term                            | Letter | Keywords                               | Key Numbers                                             | Summary                                                                                                                                                                   |
| ------------------------------- | ------ | -------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Economic Calendar Edge Function | E      | Macro events; streaming; Supabase Edge | 24/7 macro catalyst stream injected into the signal bus | Supabase Edge Function (`economic-calendar`) that injects macroeconomic events into automation pipelines so dashboards and bots respond immediately to planned catalysts. |

### G

| Term                  | Letter | Keywords                             | Key Numbers                           | Summary                                                                                                                                                                                      |
| --------------------- | ------ | ------------------------------------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Governance Guardrails | G      | Multisig; timelocks; emergency halts | 2-tier approvals (DAO + Risk Council) | Governance controls that combine multisig approvals, timelocks, and emergency stops to protect token supply, price stability, and operational safety during volatility or compliance events. |

### M

| Term                          | Letter | Keywords                             | Key Numbers                                                  | Summary                                                                                                                                                                  |
| ----------------------------- | ------ | ------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Market Intelligence Workspace | M      | Data room; telemetry; deal flow      | 3 unified telemetry streams (automation, trading, investors) | Curated workspace inside the app that consolidates trading data, model outputs, and deal pipelines to deliver shared intelligence for operators and investors.           |
| Multi-LLM Studio Workspace    | M      | OpenAI; Anthropic; Groq benchmarking | Per-model temperature and token limit controls               | In-app environment for comparing OpenAI, Anthropic, and Groq models side-by-side so contributors can benchmark orchestration tweaks before promoting them to automation. |

### S

| Term                  | Letter | Keywords                          | Key Numbers                                                         | Summary                                                                                                                                                              |
| --------------------- | ------ | --------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase Memory Layer | S      | Canonical data; trades; telemetry | 1 canonical store for execution, compliance, and governance records | Primary Supabase-backed data layer capturing trades, metrics, and governance telemetry to give automation, compliance, and analytics teams a shared source of truth. |

### T

| Term                       | Letter | Keywords                                          | Key Numbers                                                              | Summary                                                                                                                                                                                                      |
| -------------------------- | ------ | ------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Telegram Bot Console       | T      | VIP tiers; education packages; security controls  | Tiered rate limits protecting operator + member actions                  | Primary user and admin interface built on the Telegram Bot API with VIP management, education delivery, manual payment intake, broadcast messaging, and layered security controls.                           |
| Telegram Mini App          | T      | Glass theme; TonConnect; safe-area navigation     | Mirrors bot functionality across 1 shared mini app                       | Next.js mini app synchronized with the Telegram bot that delivers deposit workflows, TonConnect deep links, safe-area aware navigation, and unified branding.                                                |
| TonConnect Onboarding Flow | T      | Wallet linking; deep links; session continuity    | 1 authentication handshake reused across devices                         | Wallet connection journey that supplies deep links, QR fallbacks, and guarded session handshakes so traders authenticate once and retain access across devices.                                              |
| Treasury Programs          | T      | Reserve balancing; buybacks; emissions            | Balances DCT, TON, and USDT reserves under governed policies             | Treasury policies that coordinate reserves, direct protocol fees toward buybacks or liquidity, and trigger burns, staking incentives, or emission throttles based on treasury health.                        |
| TradingView → MT5 Bridge   | T      | Alert serialization; webhooks; execution receipts | Relays automation payloads across 3 systems (TradingView, MT5, Supabase) | Integration that serializes Dynamic AI outputs into TradingView alerts, relays them through webhooks, and forwards execution-ready payloads to MT5/Exness endpoints while syncing receipts back to Supabase. |

### V

| Term                  | Letter | Keywords                                                | Key Numbers                                            | Summary                                                                                                                                                                                           |
| --------------------- | ------ | ------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VIP Membership System | V      | Subscription tiers; Supabase backend; automation access | Managed VIP tiers mapped to content and support levels | Subscription layer coordinated by the Telegram bot and Supabase backend to provide differentiated content, support, and automation access.                                                        |
| Voice Layer           | V      | Broadcasts; alerts; dashboards                          | Routes telemetry across 3 communication surfaces       | Communication framework spanning Telegram broadcasts, alerts, and dashboards that keeps operators, token holders, and stakeholders informed with data routed from execution and treasury systems. |
