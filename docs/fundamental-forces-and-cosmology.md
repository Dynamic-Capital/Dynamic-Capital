# Fundamental Forces & Cosmology Review Playbook

Dynamic Capital coordinates treasury automation, trading models, and product
delivery across dozens of autonomous agents. Cosmology gives us the
control-system language to keep that universe stable. This playbook binds the
Friedmann equations and their dark-energy parameters to concrete review →
optimize rituals so every squad can detect drift early and respond with
precision.

## Core Equations to Track

| Concept                  | Equation                                                                                              | Dynamic Capital hook                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Friedmann expansion      | \(\left( \tfrac{\dot a}{a} \right)^2 = \tfrac{8\pi G}{3} \rho - \tfrac{k}{a^2} + \tfrac{\Lambda}{3}\) | Relates feature velocity (\(\dot a/a\)) to available resourcing (\(\rho\)), technical debt curvature (\(k\)), and baseline burn (\(\Lambda\)). |
| Equation of state        | \(w = \tfrac{p}{\rho}\)                                                                               | Signals how "stiff" a roadmap is: \(w = -1\) keeps burn constant, \(w < -1\) implies runaway scope, \(w > -\tfrac{1}{3}\) risks collapse.      |
| Critical density         | \(\Omega = \tfrac{\rho}{\rho_c}\), \(\rho_c = \tfrac{3 H^2}{8\pi G}\)                                 | Benchmarks whether our current liquidity and staffing outpace demand (\(\Omega > 1\)) or lag behind (\(\Omega < 1\)).                          |
| Exponential scale factor | Big Freeze: \(a(t) \propto e^{Ht}\)                                                                   | If \(H\) plateaus while \(w = -1\), growth is steady but innovation cools; track this in deployment dashboards.                                |
| Phantom scale factor     | Big Rip: \(a(t) \propto (t_{BR} - t)^{-\alpha}\)                                                      | When \(w < -1\), release velocity diverges—map \(t_{BR}\) to our incident budget.                                                              |

### Instrumentation blueprint

1. **State vector registry:** Mirror the cosmology terms in Supabase
   (`metrics.cosmology_state`) with columns for \(H\), \(\rho\), \(\Omega\), and
   \(w\). Backfill nightly via the analytics pipeline in `dynamic_cosmic`.
2. **Observation adapters:** Combine the Dynamic Playbook engine
   (`dynamic_playbook/engine.py`) with Supabase edge functions (for example
   `supabase/functions/ton-allocator-webhook`) to stream treasury balances,
   deployment cadence, and backlog throughput. Each adapter owns validation
   thresholds so the equivalent of \(\nabla \cdot \mathbf{B} = 0\) holds—no
   silent divergences.
3. **Inference layer:** Run the scenario primitives in
   `dynamic_cosmic/cosmic.py` to update \(H\) and \(\rho\). Persist posterior
   intervals so review owners can distinguish noise from true drift.
4. **Control policy:** Encode guardrails as JSON logic in Supabase config
   (`features:cosmology_guardrails`). Automation bots query these flags before
   scaling spend or launches.

## Weekly Review → Optimize Loop

1. **Review telemetry (Monday, 10:00 UTC):** Export the latest cosmology state,
   deployment frequency, incident counts, and treasury curvature. Highlight any
   desks where \(|w + 1| > 0.05\) or \(|\Omega - 1| > 0.07\).
2. **Model stress test (Monday, 11:00 UTC):** Run the CLI
   (`python -m
   dynamic_cosmic`) with the current posterior configuration.
   Capture Big Freeze, Crunch, and Rip probabilities and expected time horizons.
3. **Decide adjustments (Tuesday stand-ups):** Convert red signals into Linear
   tickets tagged `cosmology-optimize`. Each ticket records the triggering
   metric snapshot and the planned control action.
4. **Implement optimizations (by Thursday):** Ship hedges, roadmap deferrals, or
   rate limits as described in the scenario guardrails below.
5. **Retrospective (Friday async):** Log before/after metrics into Supabase
   (`reviews.cosmology_effects`) to maintain the closed loop.

## Scenario Guardrails

Three cosmological fates translate into the main failure modes for Dynamic
Capital. Treat them as stress lenses for quarterly OKRs and incident drills.

### Big Freeze (Heat Death)

- **Physics trigger:** Dark energy behaves as a cosmological constant; \(w =
  -1\) and \(a(t) \propto e^{Ht}\).
- **Detection checklist:**
  - Rolling 30-day deployment velocity \(H\) is flat while experiment yield
    (profit per release) trends toward zero.
  - Treasury curvature dashboard shows capital spread thinly with low variance
    but low feedback signals.
  - Supabase feature flags indicate automation saturation (multiple
    `auto_approve_*` flags enabled concurrently).
- **Optimization moves:**
  - Consolidate pipelines in `dynamic_playbook` by archiving redundant bots and
    cron jobs; free at least 15% compute budget.
  - Inject exploration budget by toggling
    `features:cosmology_guardrails.discovery_ratio` above 0.25 for one sprint.
  - Pair PM + Research to schedule a "temperature raise" initiative: new
    datasets, new markets, or novel ML models.

### Big Crunch

- **Physics trigger:** \(\Omega > 1\) and \(w > -\tfrac{1}{3}\); expansion
  reverses.
- **Detection checklist:**
  - Roadmap burn-up charts show committed scope exceeding throughput for two
    consecutive sprints.
  - Liquidity ratio in `metrics.treasury_curvature` dips below policy bounds;
    hedges are under-funded.
  - Incident response MTTR grows as shared services queue saturates.
- **Optimization moves:**
  - Sequence launches—update `features:release_plan` so only critical flags stay
    enabled; delay others a full sprint.
  - Rebuild buffers: move 10% of discretionary treasury into hedged reserves;
    staff an on-call buddy for each critical integration.
  - Institute regression gates in `.github/workflows` so every release carries
    rollback metadata.

### Big Rip

- **Physics trigger:** Phantom energy with \(w < -1\); \(H\) diverges as \(t\)
  approaches \(t_{BR}\).
- **Detection checklist:**
  - Release frequency accelerates faster than observability coverage
    (alerts/test ratios falling).
  - Supabase logs show compounding retries or recursive automation loops.
  - Customer support queue time climbs even as new endpoints ship.
- **Optimization moves:**
  - Enforce rate limits and kill switches: ensure `features:safety` flags
    default to "on" and add circuit breakers in `dynamic_proxy`.
  - Expand tracing and metrics via `apps/web/observability/server-metrics.ts`;
    require coverage for every new workflow before rollout.
  - Schedule an emergency chaos drill simulating `t_{BR} - 7 days` to validate
    blast-radius containment.

## Cadence & Ownership

| Artifact                                           | Review owner            | Optimize owner     | Frequency |
| -------------------------------------------------- | ----------------------- | ------------------ | --------- |
| Cosmology state export (`metrics.cosmology_state`) | Strategy + Data Science | Strategy           | Weekly    |
| Treasury curvature dashboard                       | Treasury + Risk         | Treasury           | Daily     |
| Deployment vs. guardrail report                    | Eng Platform            | Eng Platform + PMs | Weekly    |
| Scenario runner outputs                            | Research Guild          | ELT                | Quarterly |
| Cosmology optimization tickets                     | Product Ops             | Responsible squad  | Rolling   |

Document every review snapshot alongside the selected optimization and its
observed effect. That closed loop keeps our universe from freezing, collapsing,
or tearing apart.
