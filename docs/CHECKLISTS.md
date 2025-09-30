# Checklist Directory

Dynamic Capital relies on curated checklists to keep workstreams aligned across
documentation, code, and deployments. This directory groups the major lists by
theme so you can quickly find the right guide and see whether automation is
available.

## How to use automation

Run the helper to explore or execute automation-aware checklists:

```bash
npm run checklists -- --list
npm run checklists -- --checklist <key> [--include-optional]
```

Each key maps to a sequence defined in
[`scripts/run-checklists.js`](../scripts/run-checklists.js). The helper reads
the tables below, resolves the referenced tasks, and runs the associated
commands.

## Prioritized checklist roadmap

Follow the numbered order below when coordinating large efforts. Each entry
links back to the detailed checklist and, where available, the automation helper
key.

| Priority | Checklist                                                                                             | Focus                                      | Run when                                     | Automation key        |
| -------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------- | --------------------- |
| 0        | [`Dynamic Capital Onboarding Checklist`](./onboarding-checklist.md)                                   | Access, tooling, rituals for first 90 days | Start every new collaborator                 | —                     |
| 1        | [`Dynamic Capital Checklist`](./dynamic-capital-checklist.md)                                         | Repo health + automation status            | Launch initiatives or weekly reviews         | `dynamic-capital`     |
| 2        | [`Setup Follow-Ups`](./dynamic-capital-checklist.md#setup-follow-ups)                                 | Supabase CLI + CI parity                   | Finish onboarding and sync with CI           | `setup-followups`     |
| 3        | [`Coding Efficiency Checklist`](./coding-efficiency-checklist.md)                                     | Feature delivery hygiene                   | Ship or review individual updates            | `coding-efficiency`   |
| 4        | [`Dynamic UI Development Checklist`](./dynamic-ui-development-checklist.md)                           | Dynamic UI build guardrails                | Create or refactor UI surfaces               | `dynamic-ui`          |
| 5        | [`Variables and Links Checklist`](./VARIABLES_AND_LINKS_CHECKLIST.md)                                 | Env vars + outbound link audit             | Certify production configs                   | `variables-and-links` |
| 6        | [`Go Live Checklist`](./GO_LIVE_CHECKLIST.md)                                                         | Telegram + Mini App smoke tests            | Validate operations ahead of release         | `go-live`             |
| 7        | [`Launch Checklist`](./LAUNCH_CHECKLIST.md)                                                           | Secrets + keeper workflow                  | Harden Supabase Edge functions before launch | —                     |
| 8        | [`Vercel Production Checklist`](./VERCEL_PRODUCTION_CHECKLIST.md)                                     | Vercel well-architected review             | Audit hosted frontends                       | —                     |
| 9        | [`Automated Trading System Build Checklist`](./automated-trading-checklist.md)                        | TradingView → MT5 pipeline rollout         | Stand up or extend ATS stack                 | —                     |
| 10       | [`TradingView → MT5 Onboarding Checklist`](./TRADINGVIEW_MT5_ONBOARDING_CHECKLIST.md)                 | Cross-team automation onboarding           | Coordinate TradingView/Supabase/MT5 teams    | —                     |
| 11       | [`Dynamic Codex Integration Checklist`](./dynamic_codex_integration_checklist.md)                     | Archive of Codex merge tasks               | Reference historic `/telegram` migration     | —                     |
| 12       | [`Grok-1 Integration Checklist`](./grok-1-integration-checklist.md)                                   | Grok-enabled workflow rollout              | Plan Grok-assisted deliveries                | —                     |
| 13       | [`Git Branch Organization Checklist`](./git-branch-organization-checklist.md)                         | Branch → service alignment                 | Rework branching strategy                    | —                     |
| 14       | [`Investing.com Candlestick Signal Integration`](./investing-com-candlestick-checklist.md)            | Market signal ingestion                    | Execute Investing.com pipeline project       | —                     |
| 15       | [`Dynamic Trading Algo (DTA) Improvement Checklist`](./dynamic-trading-algo-improvement-checklist.md) | Smart Money Concepts tuning                | Iterate on BOS/liquidity heuristics          | —                     |
| 16       | [`ISO 9241 Environment Alignment Checklist`](./iso9241_environment_checklist.md)                      | ISO 9241-110 deployment review             | Audit environment + build hygiene            | —                     |
| 17       | [`CoinGecko Listing Readiness Checklist`](./coingecko-listing-checklist.md)                           | Token listing prep                         | Package materials for CoinGecko submission   | —                     |
| 18       | [`NFT Collectible Launch Checklist`](./nft-collectible-launch-checklist.md)                           | Story-driven NFT launch                    | Plan concept, metadata, and rollout          | `nft-collectible`     |
| 19       | [`Dynamic AI (DAI) Validation`](./dai-dagi-dct-dtl-dta-checklist-review.md#dynamic-ai-dai)            | Dynamic AI telemetry + routing QA          | Run before Brain/orchestrator updates        | `dai`                 |
| 20       | [`Dynamic AGI (DAGI) Oversight`](./dai-dagi-dct-dtl-dta-checklist-review.md#dynamic-agi-dagi)         | DAGI governance + mentorship audit         | Execute ahead of infra/governance changes    | `dagi`                |

## Onboarding (priority 0)

- **[`Dynamic Capital Onboarding Checklist`](./onboarding-checklist.md)** – Run
  this end-to-end for every new collaborator so access provisioning, automation
  walkthroughs, and first-month goals stay aligned.

## Project delivery (priorities 1–3)

### Aggregate & iteration checklists

- **[`Dynamic Capital Checklist`](./dynamic-capital-checklist.md)** – the
  umbrella tracker that collects repo-level action items and links to every
  specialized list. Use it for weekly reviews or when coordinating
  cross-functional workstreams.
- **[`Setup Follow-Ups`](./dynamic-capital-checklist.md#setup-follow-ups)** –
  orchestrates the Supabase CLI workflow alongside the CI parity checks flagged
  in onboarding. Use the `setup-followups` automation key to run the scripted
  sequence end-to-end.
- **[`Coding Efficiency Checklist`](./coding-efficiency-checklist.md)** – a
  reusable template for feature branches. Copy it into issues or PRs to make
  sure implementation, testing, and documentation steps land together.

### UI & shared tooling

- **[`Dynamic UI Development Checklist`](./dynamic-ui-development-checklist.md)**
  – ensures surfaces built on the Dynamic UI design system follow linting,
  testing, and build expectations. Includes optional automation for production
  builds and mini app packaging.
- **[`Podman GitHub Integration Checklist`](./podman-github-integration-checklist.md)**
  – audits Windows-based Podman machine connectivity and documents the
  repository workflow so local development stays aligned with container
  lifecycle tasks. Use the `podman-github` automation key to trigger the machine
  validation helper.

## Launch & production hardening (priorities 5–8)

- **[`Go Live Checklist`](./GO_LIVE_CHECKLIST.md)** – quick Telegram webhook and
  Mini App validation steps. Use alongside the `go-live` automation key for
  repeatable smoke tests.
- **[`Launch Checklist`](./LAUNCH_CHECKLIST.md)** – enumerates Supabase secrets
  and keeper tasks required before exposing the bot to end users.
- **[`Variables and Links Checklist`](./VARIABLES_AND_LINKS_CHECKLIST.md)** –
  covers outbound URLs, hostnames, and environment variable drift. Pair it with
  the automation key `variables-and-links` to run scripted audits.
- **[`Vercel Production Checklist`](./VERCEL_PRODUCTION_CHECKLIST.md)** –
  applies the Vercel Well-Architected review to the hosted frontend. Ideal
  before handoffs or compliance reviews.

## Specialized projects & integrations (priorities 9–12)

- **[`Automated Trading System Build Checklist`](./automated-trading-checklist.md)**
  – sequences the deliverables for the TradingView → Supabase → MetaTrader 5
  automation project, from Pine Script alerts to VPS hardening.
- **[`TradingView → MT5 Onboarding Checklist`](./TRADINGVIEW_MT5_ONBOARDING_CHECKLIST.md)**
  – mirrors the onboarding roadmap so TradingView, webhook, Supabase, and MT5
  teams can work in parallel with clear hand-offs.
- **[`Dynamic Codex Integration Checklist`](./dynamic_codex_integration_checklist.md)**
  – archived after Dynamic Codex was merged into the main `/telegram` route;
  keep for historical context.
- **[`Grok-1 Integration Checklist`](./grok-1-integration-checklist.md)** –
  coordinates research, automation, and delivery changes required to safely roll
  Grok-assisted workflows across the stack.
- **[`Git Branch Organization Checklist`](./git-branch-organization-checklist.md)**
  – guides the restructuring of branches so each deployable service can map to
  its own domain and load-balanced release flow.
- **[`Investing.com Candlestick Signal Integration`](./investing-com-candlestick-checklist.md)**
  – governs the new Investing.com signal ingestion pipeline, Telegram
  broadcasts, and Mini App surfacing workstream.
- **[`ISO 9241 Environment Alignment Checklist`](./iso9241_environment_checklist.md)**
  – keeps environment, branching, build, and configuration workflows aligned
  with ISO 9241-110 usability guidance.
- **[`CoinGecko Listing Readiness Checklist`](./coingecko-listing-checklist.md)**
  – compiles the evidence, documentation, and market data reviewers request
  during the CoinGecko token listing process.
- **[`NFT Collectible Launch Checklist`](./nft-collectible-launch-checklist.md)**
  – orchestrates trait design, storytelling, utility planning, and community
  activation for new NFT collections. Use the `nft-collectible` automation key
  to validate structure and export section-organized task lists.

## Intelligence orchestration domains (priorities 19–20)

- **[`Dynamic AI (DAI) Validation`](./dai-dagi-dct-dtl-dta-checklist-review.md#dynamic-ai-dai)**
  – pairs the DAI operational checklist with the `dai` automation key, running
  architecture and persona regression suites before refreshing the Brain or
  shipping orchestration changes.
- **[`Dynamic AGI (DAGI) Oversight`](./dai-dagi-dct-dtl-dta-checklist-review.md#dynamic-agi-dagi)**
  – uses the `dagi` automation key to execute DAGI oversight tests so
  self-improvement, mentorship, and orchestration feedback stay in sync with the
  governance runbooks.

## Keep documentation in sync

Update checklists when processes change and reference supporting docs such as
[`docs/env.md`](./env.md), [`docs/SETUP_SUMMARY.md`](./SETUP_SUMMARY.md), or
service-specific runbooks. When automation is added for a new workflow, record
the key and linked tasks here so contributors can discover it quickly. Review
the prioritized table at least once per quarter so focus areas and automation
keys stay accurate.
