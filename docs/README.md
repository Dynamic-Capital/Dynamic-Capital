# Dynamic Capital Documentation Index

This index groups every document in `docs/` by workflow so contributors can
locate the right guide without scanning dozens of filenames. Each table is
numbered for quick reference—use the `Ref` code when coordinating handoffs or
documenting which assets were consulted.

## How to Use This Index

- Start with **Section 1** to understand the platform layout, repo maps, and
  high-level plans.
- Jump to the section that matches your current task (development, deployment,
  trading operations, etc.) and open the linked guides.
- Reference the `Ref` codes in issues/PR descriptions so reviewers know which
  procedures or checklists were followed.
- Regenerate generated documents (e.g., `REPO_SUMMARY.md`) via the scripts noted
  inside them before committing updates.

## 1. Orientation & Repo Maps

| Ref  | Document                                                                           | Summary                                                                                                                    |
| ---- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1.1  | [FLOW_OVERVIEW.md](./FLOW_OVERVIEW.md)                                             | End-to-end map of how the marketing site, Telegram bot, Supabase functions, and Mini App connect.                          |
| 1.2  | [agent.md](./agent.md)                                                             | Behavioral contract for the Dynamic Capital agent across Telegram commands and the Mini App.                               |
| 1.3  | [FEATURES.md](./FEATURES.md)                                                       | Feature catalog outlining customer-facing capabilities and planned enhancements.                                           |
| 1.4  | [ROADMAP.md](./ROADMAP.md)                                                         | Timeline of in-flight and upcoming initiatives with milestone guidance.                                                    |
| 1.5  | [REPO_SUMMARY.md](./REPO_SUMMARY.md)                                               | Generated snapshot of top-level directories, edge functions, and environment keys.                                         |
| 1.6  | [REPO_MAP_OPTIMIZATION.md](./REPO_MAP_OPTIMIZATION.md)                             | Deep dive on code surface responsibilities plus optimization tracker.                                                      |
| 1.7  | [REPO_FILE_ORGANIZER.md](./REPO_FILE_ORGANIZER.md)                                 | Categorized listing of top-level files/folders and their roles.                                                            |
| 1.8  | [REPO_INVENTORY.md](./REPO_INVENTORY.md)                                           | Narrative walkthrough of major directories, Supabase assets, and trading scaffolding.                                      |
| 1.9  | [SETUP_SUMMARY.md](./SETUP_SUMMARY.md)                                             | Generated recap of setup goals, migration highlights, and CI guardrails.                                                   |
| 1.10 | [INVENTORY.csv](./INVENTORY.csv)                                                   | CSV export that tracks documentation counts, line totals, and repo metrics.                                                |
| 1.11 | [CHANGELOG.md](./CHANGELOG.md)                                                     | Chronological release notes maintained by the release automation.                                                          |
| 1.12 | [dynamic-capital-ecosystem-anatomy.md](./dynamic-capital-ecosystem-anatomy.md)     | Biological metaphor guide detailing how every subsystem, feedback loop, and TradingView bridge maps to automation pillars. |
| 1.13 | [dynamic-training-model-architecture.md](./dynamic-training-model-architecture.md) | DAI, DAGI, and DAGS training mesh outline covering cores, capability domains, governance pillars, and phased rollout.      |
| 1.14 | [dynamic-capital-code-of-conduct.md](./dynamic-capital-code-of-conduct.md)         | Community behavior expectations, reporting paths, and enforcement process.                                                 |
| 1.15 | [dynamic-capital-milestones.md](./dynamic-capital-milestones.md)                   | Stage-by-stage milestone ladder aligning infrastructure, treasury, governance, and community outcomes.                     |

## 2. Development Workflow & Standards

| Ref  | Document                                                           | Summary                                                                                              |
| ---- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| 2.1  | [BEST_PRACTICES.md](./BEST_PRACTICES.md)                           | Coding conventions, review expectations, and shared quality bars.                                    |
| 2.2  | [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)               | Local development flow, tooling setup, and day-to-day commands.                                      |
| 2.3  | [HYBRID_DEVELOPMENT_WORKFLOW.md](./HYBRID_DEVELOPMENT_WORKFLOW.md) | Guidance for working across Dynamic, Supabase, and local Next.js surfaces concurrently.              |
| 2.4  | [code-structure.md](./code-structure.md)                           | High-level overview of monorepo structure and module boundaries.                                     |
| 2.5  | [codex_cli_workflow.md](./codex_cli_workflow.md)                   | Commands, flags, general knowledge, and GitHub handoff loop for the Codex CLI helper.                |
| 2.6  | [CLEANUP_AND_CODEMODS.md](./CLEANUP_AND_CODEMODS.md)               | Strategy for running codemods and debt cleanups safely.                                              |
| 2.7  | [NEXTJS_BUILD_CACHE_TASK.md](./NEXTJS_BUILD_CACHE_TASK.md)         | Instructions for the Next.js build cache maintenance task.                                           |
| 2.8  | [ton-ide-plugins.md](./ton-ide-plugins.md)                         | Official TON IDE plugins for JetBrains, VS Code, and the Web IDE with install checklists.            |
| 2.9  | [onedrive-sync-integration.md](./onedrive-sync-integration.md)     | GitHub and Supabase adapter guide for working with Microsoft OneDrive assets inside Codex workflows. |
| 2.10 | [open-source-ai-crawlers.md](./open-source-ai-crawlers.md)         | Comparison of AI-driven crawling frameworks with implementation and selection guidance.              |

## 3. Environment & Configuration

| Ref | Document                                                 | Summary                                                                  |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------------ |
| 3.1 | [CONFIG.md](./CONFIG.md)                                 | Central list of configuration surfaces and how they map to environments. |
| 3.2 | [CONFIG_SECRETS.md](./CONFIG_SECRETS.md)                 | Playbook for syncing sensitive configuration between environments.       |
| 3.3 | [env.md](./env.md)                                       | Environment variable reference with default values and usage notes.      |
| 3.4 | [SECRETS.md](./SECRETS.md)                               | Supabase Edge secret handling patterns and guard tasks.                  |
| 3.5 | [GITHUB_PAT.md](./GITHUB_PAT.md)                         | Requirements for generating and using GitHub Personal Access Tokens.     |
| 3.6 | [SUPABASE_LOG_STREAMING.md](./SUPABASE_LOG_STREAMING.md) | Steps to forward Supabase logs to external aggregators.                  |

## 4. Deployment & Infrastructure

| Ref  | Document                                                                   | Summary                                                                                |
| ---- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 4.1  | [DEPLOYMENT.md](./DEPLOYMENT.md)                                           | End-to-end deployment procedure for the Next.js app, Mini App, and Supabase functions. |
| 4.2  | [INCREMENTAL_MIGRATION_TO_VERCEL.md](./INCREMENTAL_MIGRATION_TO_VERCEL.md) | Guide for migrating workloads into Vercel iteratively.                                 |
| 4.3  | [DIGITALOCEAN_APP_LOGS.md](./DIGITALOCEAN_APP_LOGS.md)                     | Collecting and analyzing DigitalOcean App Platform logs.                               |
| 4.4  | [DUCKDNS_NGINX_CERTBOT.md](./DUCKDNS_NGINX_CERTBOT.md)                     | DuckDNS and Certbot automation notes for the hardened Nginx proxy.                     |
| 4.5  | [NETWORKING.md](./NETWORKING.md)                                           | DNS, domain, and origin configuration for the platform.                                |
| 4.6  | [VERCEL_PROJECT_SETTINGS.md](./VERCEL_PROJECT_SETTINGS.md)                 | Recommended Vercel project settings matching the checked-in config.                    |
| 4.7  | [VERCEL_PRODUCTION_CHECKLIST.md](./VERCEL_PRODUCTION_CHECKLIST.md)         | Well-architected review for Vercel deployments.                                        |
| 4.8  | [postgres-upgrade.md](./postgres-upgrade.md)                               | Steps to upgrade PostgreSQL safely to the latest patched release.                      |
| 4.9  | [ton-web3-guidelines.md](./ton-web3-guidelines.md)                         | TON DNS, storage, and site operations playbook linking contracts and Supabase assets.  |
| 4.10 | [on-chain-flows.md](./on-chain-flows.md)                                   | Mermaid diagram and contract references for the subscription → swap → burn automation. |
| 4.11 | [ton-dns-renewal-log.md](./ton-dns-renewal-log.md)                         | Renewal ledger for `.ton` domains with event-level breakdowns.                         |

## 5. Telegram & Mini App Delivery

| Ref  | Document                                                   | Summary                                                                                                                |
| ---- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 5.1  | [MINI_APP_FLOW.md](./MINI_APP_FLOW.md)                     | Overview of the Telegram Mini App user journey and technical hooks.                                                    |
| 5.2  | [MINI_APP_ON_SUPABASE.md](./MINI_APP_ON_SUPABASE.md)       | Wiring the Mini App to Supabase auth, storage, and edge functions.                                                     |
| 5.3  | [MINI_APP_URL_SETUP.md](./MINI_APP_URL_SETUP.md)           | URL, domain, and configuration requirements for the Mini App host.                                                     |
| 5.4  | [MINI_APP_VERIFY.md](./MINI_APP_VERIFY.md)                 | Verification checklist to confirm the Mini App build is production-ready.                                              |
| 5.5  | [MINIAPP_DEPLOYMENT.md](./MINIAPP_DEPLOYMENT.md)           | Deployment plan for packaging and shipping the Mini App.                                                               |
| 5.6  | [MAKE_INITDATA.md](./MAKE_INITDATA.md)                     | Procedure for generating Telegram Mini App `initData` payloads.                                                        |
| 5.7  | [VERIFY_INITDATA.md](./VERIFY_INITDATA.md)                 | Steps to validate Telegram `initData` signatures.                                                                      |
| 5.8  | [TELEGRAM_WEBHOOK_KEEPER.md](./TELEGRAM_WEBHOOK_KEEPER.md) | Bot keeper that maintains webhook health and retries updates.                                                          |
| 5.9  | [webhook.md](./webhook.md)                                 | Telegram webhook configuration, rotation, and troubleshooting guide.                                                   |
| 5.10 | [LINKAGE_CHECKLIST.md](./LINKAGE_CHECKLIST.md)             | Audit to ensure bot, Mini App, and Supabase edge functions share consistent hosts/secrets.                             |
| 5.11 | [tonkeeper-deep-linking.md](./tonkeeper-deep-linking.md)   | Deep link reference covering wallet schemes, dynamic link builders, and back-to-back flow optimizations for Tonkeeper. |

## 6. Trading & Financial Operations

<!-- deno-fmt-ignore -->
| Ref  | Document                                                                             | Summary                                                                        |
| ---- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| 6.1  | [automated-trading-checklist.md](./automated-trading-checklist.md)                   | Project plan for delivering the TradingView → Supabase → MT5 automation.       |
| 6.2  | [TRADINGVIEW_TO_MT5_BRIDGE_CHECKLIST.md](./TRADINGVIEW_TO_MT5_BRIDGE_CHECKLIST.md)   | Detailed bridge build between TradingView alerts and MetaTrader 5.             |
| 6.3  | [TRADINGVIEW_MT5_ONBOARDING_CHECKLIST.md](./TRADINGVIEW_MT5_ONBOARDING_CHECKLIST.md) | Cross-team onboarding workflow for the TradingView/MT5 stack.                  |
| 6.4  | [investing-com-candlestick-checklist.md](./investing-com-candlestick-checklist.md)   | Checklist for ingesting Investing.com candlestick signals.                     |
| 6.5  | [trading-runbook.md](./trading-runbook.md)                                           | Day-to-day trading operations, monitoring, and model lifecycle steps.          |
| 6.6  | [private-fund-pool.md](./private-fund-pool.md)                                       | Architecture and database design for the private fund pool service.            |
| 6.7  | [index-advisor.md](./index-advisor.md)                                               | Using Supabase Index Advisor to tune query performance.                        |
| 6.8  | [WRAPPERS_INTEGRATION.md](./WRAPPERS_INTEGRATION.md)                                 | How to connect external services via Postgres foreign data wrappers.           |
| 6.9  | [trading-data-organization.md](./trading-data-organization.md)                       | Folder taxonomy for templates, journals, KPIs, and backtests across each horizon bucket. |
| 6.10 | [dai-webhook-routing.md](./dai-webhook-routing.md)                                   | Options for single-endpoint vs. auto-provisioned TradingView webhook routes managed by DAI. |
| 6.11 | [dynamic-market-notes.md](./dynamic-market-notes.md)                                 | Dynamic Market stack overview covering DMDA feeds, DMM quoting levers, and treasury coordination notes. |
| 6.12 | [onedrive-shares/ekqbarlpv7hljyb9tgpdmqcbzpxonb18k7rhjp2iv6ofmq-folder.md](./onedrive-shares/ekqbarlpv7hljyb9tgpdmqcbzpxonb18k7rhjp2iv6ofmq-folder.md) | Share metadata, Graph helpers, and access notes for the trading PDF OneDrive folder. |
| 6.13 | [onedrive-shares/eu8_trb65jdbrll39t1gvwqbaiebw24rkuu17wcuk-c_qa-folder.md](./onedrive-shares/eu8_trb65jdbrll39t1gvwqbaiebw24rkuu17wcuk-c_qa-folder.md) | Datasets share identifiers and Graph commands for refreshing training corpora. |
| 6.14 | [onedrive-shares/eiqlwt1h9xpjk-7gpxzswqubhctetgb-e1khqcgjdyowjw-folder.md](./onedrive-shares/eiqlwt1h9xpjk-7gpxzswqubhctetgb-e1khqcgjdyowjw-folder.md) | Documentation PDFs share metadata and retrieval notes for the trading agent. |
| 6.15 | [onedrive-shares/eq5pnm_tcvdnggzwqer7mzubpqvlwljacc8dt8ike04u9a-folder.md](./onedrive-shares/eq5pnm_tcvdnggzwqer7mzubpqvlwljacc8dt8ike04u9a-folder.md) | Knowledge base share identifiers for syncing reference materials. |
| 6.16 | [onedrive-shares/ejhj6-c4fjdopaw-phw5zl8bwumo2lyzhwbrhbknd4gvbq-folder.md](./onedrive-shares/ejhj6-c4fjdopaw-phw5zl8bwumo2lyzhwbrhbknd4gvbq-folder.md) | Combined logs and model artifacts share metadata for telemetry/model reconciliation. |
| 6.17 | [onedrive-shares/eskwdphqepxihqmatzjdduubkm_lsdxt-jvm-1smjjgfea-folder.md](./onedrive-shares/eskwdphqepxihqmatzjdduubkm_lsdxt-jvm-1smjjgfea-folder.md) | Trading reports share identifiers for ingesting supplemental analytics. |
| 6.18 | [onedrive-shares/etoelnepqhhhiis2vl7qe_abz618nqf2vgnrykcx0prhwa-file.md](./onedrive-shares/etoelnepqhhhiis2vl7qe_abz618nqf2vgnrykcx0prhwa-file.md) | Standalone `read_me.md` text share metadata for onboarding notes. |
| 6.19 | [agi_integration_strategies.md](./agi_integration_strategies.md)                       | AGI-driven integration plan aligning DTL, DTA, execution, and learning loops. |
| 6.20 | [knowledge-base-training-drop.md](./knowledge-base-training-drop.md)                  | Checklist for syncing the OneDrive knowledge base dataset drops into Supabase and local experiments. |

## 7. Operational Runbooks & Launch Phases

| Ref  | Document                                                             | Summary                                                                   |
| ---- | -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 7.1  | [GO_LIVE_CHECKLIST.md](./GO_LIVE_CHECKLIST.md)                       | Pre-launch smoke tests for Telegram webhook flows and Mini App readiness. |
| 7.2  | [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)                         | Secrets, keeper setup, and production readiness tasks before launch.      |
| 7.3  | [RUNBOOK_start-not-responding.md](./RUNBOOK_start-not-responding.md) | Incident response for the Telegram `/start` command failing.              |
| 7.4  | [PHASE_03_CHECKOUT.md](./PHASE_03_CHECKOUT.md)                       | Launch program phase covering checkout automation and payment flows.      |
| 7.5  | [PHASE_04_ADMIN.md](./PHASE_04_ADMIN.md)                             | Phase plan for admin tooling rollout.                                     |
| 7.6  | [PHASE_05_ADMIN_UI.md](./PHASE_05_ADMIN_UI.md)                       | UI hardening tasks for the admin console.                                 |
| 7.7  | [PHASE_06_OPS.md](./PHASE_06_OPS.md)                                 | Operational readiness workstream for post-launch support.                 |
| 7.8  | [PHASE_07_QA.md](./PHASE_07_QA.md)                                   | QA strategy including automation coverage and manual validation.          |
| 7.9  | [PHASE_08_GROWTH.md](./PHASE_08_GROWTH.md)                           | Growth experiments and marketing activation plan.                         |
| 7.10 | [PHASE_09_SECURITY.md](./PHASE_09_SECURITY.md)                       | Security hardening checklist for the launch program.                      |
| 7.11 | [PHASE_10_AUTOVERIFY.md](./PHASE_10_AUTOVERIFY.md)                   | Automated verification tasks to keep the stack healthy post-launch.       |

## 8. Security, Compliance & Legal

| Ref  | Document                                                                               | Summary                                                                        |
| ---- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 8.1  | [secrets-checklist.md](./secrets-checklist.md)                                         | Environment-specific secret coverage required before shipping.                 |
| 8.2  | [SECURITY_service-role.md](./SECURITY_service-role.md)                                 | Handling and rotation procedures for the Supabase service-role key.            |
| 8.3  | [supabase-audit-report.md](./supabase-audit-report.md)                                 | Generated audit of Supabase tables, policies, functions, and indexes.          |
| 8.4  | [content-policy.md](./content-policy.md)                                               | Content moderation rules governing bot responses and marketing copy.           |
| 8.5  | [compliance/README.md](./compliance/README.md)                                         | Entry point for compliance evidence and certification summaries.               |
| 8.6  | [compliance/gdpr.md](./compliance/gdpr.md)                                             | GDPR compliance posture and required controls.                                 |
| 8.7  | [compliance/hipaa.md](./compliance/hipaa.md)                                           | HIPAA considerations for handling sensitive financial data.                    |
| 8.8  | [compliance/iso-27001.md](./compliance/iso-27001.md)                                   | ISO 27001 control mapping for the project.                                     |
| 8.9  | [compliance/pci-dss-level1.md](./compliance/pci-dss-level1.md)                         | PCI DSS Level 1 checklist tailored to the bot workflow.                        |
| 8.10 | [compliance/soc1-type2.md](./compliance/soc1-type2.md)                                 | SOC 1 Type II readiness documentation.                                         |
| 8.11 | [compliance/soc2-type2.md](./compliance/soc2-type2.md)                                 | SOC 2 Type II readiness documentation.                                         |
| 8.12 | [compliance/dpf.md](./compliance/dpf.md)                                               | Digital Platform Fairness compliance overview.                                 |
| 8.13 | [compliance/certificates.json](./compliance/certificates.json)                         | Machine-readable compliance certificates referenced by audits.                 |
| 8.14 | [legal/README.md](./legal/README.md)                                                   | Legal documentation index for licensing obligations.                           |
| 8.15 | [legal/THIRD_PARTY_LICENSES.md](./legal/THIRD_PARTY_LICENSES.md)                       | Third-party license disclosures bundled with the project.                      |
| 8.16 | [security/open-source-ai-defense-stack.md](./security/open-source-ai-defense-stack.md) | Layered plan for deploying open-source adversarial, privacy, and LLM defenses. |

## 9. Checklists & Automation

| Ref | Document                                                                           | Summary                                                                     |
| --- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 9.1 | [CHECKLISTS.md](./CHECKLISTS.md)                                                   | Master directory of automation-aware checklists with priority guidance.     |
| 9.2 | [dynamic-capital-checklist.md](./dynamic-capital-checklist.md)                     | Umbrella repo health tracker covering setup, automation, and QA.            |
| 9.3 | [coding-efficiency-checklist.md](./coding-efficiency-checklist.md)                 | Repeatable template for feature delivery hygiene.                           |
| 9.4 | [git-branch-organization-checklist.md](./git-branch-organization-checklist.md)     | Steps for aligning Git branches with deployable services.                   |
| 9.5 | [dynamic-ui-development-checklist.md](./dynamic-ui-development-checklist.md)       | Checklist for Dynamic UI powered surfaces (landing, dashboard, Mini App).   |
| 9.6 | [VARIABLES_AND_LINKS_CHECKLIST.md](./VARIABLES_AND_LINKS_CHECKLIST.md)             | Environment variable and outbound link audit.                               |
| 9.7 | [dynamic_codex_integration_checklist.md](./dynamic_codex_integration_checklist.md) | Historic plan for folding Dynamic Codex into the monorepo.                  |
| 9.8 | [project-updater.md](./project-updater.md)                                         | Automation suite that regenerates release docs and project metadata.        |
| 9.9 | [whitepaper-pipeline.md](./whitepaper-pipeline.md)                                 | Workflow for generating whitepapers from JSON configs and review checklist. |

## 10. Reference, Content & Growth

| Ref  | Document                                                                   | Summary                                                                            |
| ---- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 10.1 | [BOT_CONTENT.md](./BOT_CONTENT.md)                                         | Default Telegram bot content keys and override instructions.                       |
| 10.2 | [MENTORSHIP — Pricing Strategy](./mentorship/pricing-strategy.md)          | Pricing, positioning, and enrollment plan for the mentorship offering.             |
| 10.3 | [ict-terminology-cheatsheet.md](./ict-terminology-cheatsheet.md)           | Glossary of ICT/market structure terminology used across docs.                     |
| 10.4 | [api-documentation.md](./api-documentation.md)                             | Supabase edge function API reference optimised for AI-assisted development.        |
| 10.5 | [dynamic-mental-operating-system.md](./dynamic-mental-operating-system.md) | Daily algorithm for aligning purpose, decisions, and compounding action.           |
| 10.6 | [dynamic-capital-wisdom-playbook.md](./dynamic-capital-wisdom-playbook.md) | Fibonacci-inspired mindset compass for pattern recognition and balanced execution. |

## 11. Human Resources & Compensation

| Ref  | Document                                                                             | Summary                                                                                      |
| ---- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 11.1 | [human-resources/trading-compensation.md](./human-resources/trading-compensation.md) | Compensation policy covering salaries, profit sharing, IB commissions, and bonus governance. |
