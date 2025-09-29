# DAI, DAGI, DCT, DTL, and DTA Checklist Review

This quick-reference audit links each requested domain to its primary checklist,
clarifying the operational focus areas that remain active for the Dynamic
Capital stack.

## Dynamic AI (DAI)

- **Source:** [`docs/dynamic-ai-overview.md`](./dynamic-ai-overview.md)
- **Operational highlights:**
  - Validate persona routing, guardrail rehearsals, and replay audits before
    shipping new orchestration changes.【F:docs/dynamic-ai-overview.md†L57-L85】
  - Maintain versioning hygiene so prompt templates, lobe parameters, and
    toggles stay reproducible across
    environments.【F:docs/dynamic-ai-overview.md†L81-L85】
- **Supabase integration:** Domain catalogues register `routine_prompts`,
  `analyst_insights`, and `user_analytics` tables alongside the
  `analysis-ingest`, `analytics-collector`, `lorentzian-eval`, and
  `web-app-analytics` Edge Functions so Dynamic AI telemetry is persisted and
  queryable via the Supabase
  engine.【F:dynamic_supabase/domain_catalogue.py†L71-L126】【F:supabase/migrations/20251102090000_add_routine_prompts_table.sql†L1-L29】【F:supabase/migrations/20251101090000_add_analyst_insights_and_human_node.sql†L3-L40】【F:supabase/migrations/20250907200029_95f54b34-d037-442a-be55-a41af9d3955c.sql†L1-L28】【F:supabase/functions/analysis-ingest/index.ts†L1-L120】【F:supabase/functions/analytics-collector/index.ts†L1-L120】【F:supabase/functions/lorentzian-eval/index.ts†L1-L160】【F:supabase/functions/web-app-analytics/index.ts†L1-L160】
- **Automation helper:** Run `npm run checklists -- --checklist dai` to execute
  the Dynamic AI regression suite (architecture plus persona/fusion tests)
  before shipping orchestrator or Brain
  updates.【F:scripts/run-checklists.js†L52-L86】【F:scripts/run-checklists.js†L300-L307】

## Dynamic AGI (DAGI)

- **Source:**
  [`docs/dynamic-agi-modular-framework.md`](./dynamic-agi-modular-framework.md)
- **Operational highlights:**
  - Complete module-specific integrations across science, business, human,
    security, finance, knowledge, workflow, sustainability, and conceptual
    domains.【F:docs/dynamic-agi-modular-framework.md†L371-L417】
  - Harden shared infrastructure by validating telemetry pipelines, symbolic
    constraint libraries, and security guardrails across the AGI
    mesh.【F:docs/dynamic-agi-modular-framework.md†L371-L412】
- **Supabase integration:** The catalogued blueprint ties DAGI oversight to
  `infrastructure_jobs`, `node_configs`, and `mentor_feedback` storage plus the
  `ops-health`, `system-health`, `linkage-audit`, and `intent` Edge Functions so
  orchestration health and intent envelopes are synchronised with Supabase
  primitives.【F:dynamic_supabase/domain_catalogue.py†L128-L176】【F:supabase/resource-plan.ts†L3-L111】【F:supabase/migrations/20251101090000_add_analyst_insights_and_human_node.sql†L24-L66】【F:supabase/migrations/20251022090000_add_mentor_feedback_table.sql†L1-L15】【F:supabase/functions/ops-health/index.ts†L1-L160】【F:supabase/functions/system-health/index.ts†L1-L158】【F:supabase/functions/linkage-audit/index.ts†L1-L160】【F:supabase/functions/intent/index.ts†L1-L160】
- **Automation helper:** Use `npm run checklists -- --checklist dagi` to run the
  DAGI oversight tests covering self-improvement, mentorship, and orchestration
  diagnostics before infrastructure
  updates.【F:scripts/run-checklists.js†L70-L86】【F:scripts/run-checklists.js†L308-L314】

## Dynamic Capital Treasury (DCT)

- **Source:**
  [`docs/dct-intelligence-driven-tokenomics.md`](./dct-intelligence-driven-tokenomics.md)
- **Operational highlights:**
  - Define canonical schemas and monitoring pipelines so intelligence metrics
    directly inform burn and buyback
    executors.【F:docs/dct-intelligence-driven-tokenomics.md†L104-L111】
  - Ship simulation tooling and dashboards to stress test proposals and surface
    tokenomics deltas for
    operators.【F:docs/dct-intelligence-driven-tokenomics.md†L111-L113】

## Dynamic Trading Logic (DTL)

- **Source:**
  [`docs/agi_integration_strategies.md`](./agi_integration_strategies.md)
- **Operational highlights:**
  - Progress the implementation table covering integration, execution, logic,
    feedback, and learning tracks for the Strategy Router and telemetry
    mesh.【F:docs/agi_integration_strategies.md†L198-L207】
  - Close mentorship feedback loops and intelligence oracle triggers that feed
    backlog grooming and treasury
    coordination.【F:docs/agi_integration_strategies.md†L176-L195】
  - **Supabase integration:** Trading logic catalogues align the `market_news`,
    `sentiment`, and `cot_reports` tables with the `collect-market-news`,
    `collect-market-sentiment`, `market-movers-feed`, and `trading-signal` Edge
    Functions to fuel hypothesis generation and signal review
    pipelines.【F:dynamic_supabase/domain_catalogue.py†L178-L223】【F:supabase/migrations/20251020090000_market_intelligence_tables.sql†L1-L60】【F:supabase/functions/collect-market-news/index.ts†L1-L160】【F:supabase/functions/collect-market-sentiment/index.ts†L1-L180】【F:supabase/functions/market-movers-feed/index.ts†L1-L140】【F:supabase/functions/trading-signal/index.ts†L1-L160】

## Dynamic Trading Algo (DTA)

- **Source:**
  [`docs/dynamic-trading-algo-improvement-checklist.md`](./dynamic-trading-algo-improvement-checklist.md)
- **Operational highlights:**
  - Enforce Smart Money Concepts hygiene across data feeds, analyzer logic, and
    configuration
    governance.【F:docs/dynamic-trading-algo-improvement-checklist.md†L8-L55】
  - Maintain execution discipline, deployment coordination, and retrospective
    feedback loops after each analyzer
    update.【F:docs/dynamic-trading-algo-improvement-checklist.md†L57-L96】
  - **Supabase integration:** Execution blueprints bind the `trading_accounts`,
    `signals`, `signal_dispatches`, `trades`, `hedge_actions`, and
    `mt5_trade_logs` tables to the `dynamic-hedge`, `mt5`, `trade-helper`, and
    `ton-allocator-webhook` Edge Functions so routing, fills, and hedging stay
    observable
    end-to-end.【F:dynamic_supabase/domain_catalogue.py†L225-L295】【F:supabase/migrations/20250920000000_trading_signals_pipeline.sql†L40-L170】【F:supabase/migrations/20251103090000_add_hedge_actions_table.sql†L1-L40】【F:supabase/migrations/20251023090000_mt5_trade_logs.sql†L2-L30】【F:supabase/functions/dynamic-hedge/index.ts†L1-L320】【F:supabase/functions/mt5/index.ts†L1-L160】【F:supabase/functions/trade-helper/index.ts†L1-L200】【F:supabase/functions/ton-allocator-webhook/index.ts†L1-L200】
