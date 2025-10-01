# ChatAgent Blueprint: Beginner-Friendly & Informative

## Overview

This blueprint defines the learning-first experience for a Maldivian retail
trader exploring algorithmic markets with a conversational agent. It aligns
persona-specific guidance, feedback loops, and multimodal context ingestion into
a cohesive service roadmap.

## 1. User Modes

1. **Beginner Mode**
   - [ ] Simplify jargon with glossary overlays and localized metaphors.
   - [ ] Surface foundational concepts (risk management, order types) before
         advanced insights.
   - [ ] Limit automation suggestions to simulated or demo-account workflows.
2. **Mentor Mode**
   - [ ] Unlock advanced tooling (strategy backtesting, portfolio optimization
         prompts).
   - [ ] Enable deep-dive explanations with citations to market data or on-chain
         metrics.
   - [ ] Provide co-creation workflows where the agent and user refine
         hypotheses together.
3. **Analyst Mode**
   - [ ] Assume technical fluency; prioritize signal evaluation and execution
         triggers.
   - [ ] Surface ensemble forecasts, alert logs, and recommended hedging
         actions.
   - [ ] Offer programmatic exports (JSON, CSV) for downstream quant pipelines.

### Mode Switching

- Automatic handoff rules score intent and confidence from conversational cues,
  user history, and AGI feedback.
- Manual override buttons allow users to downgrade/upgrade modes without leaving
  the session.
- Transitions preserve context while recalibrating explanation depth, UI
  affordances, and tool availability.

## 2. Core Functions

1. **Learning Companion**
   - Presents layered explanations (summary → analogy → numeric example →
     checklist).
   - Injects mini quizzes to reinforce retention and unlock mentor badges upon
     mastery.
2. **Trading Copilot**
   - Interprets TradingView alerts, MT5 logs, and portfolio exposure to deliver
     situational guidance.
   - Recommends playbooks (e.g., “surf the current” trend-following or “reef
     shield” hedging) with localized metaphors.
3. **Mentor Feedback Engine**
   - Scores question quality, trade outcomes, and learning velocity to adapt
     coaching tone.
   - Routes to human mentors when risk thresholds or anomaly flags fire.
4. **Knowledge Orchestrator**
   - Harmonizes knowledge across LLM ensemble outputs, curated glossaries, and
     regulatory updates.
   - Maintains explainability trail—each recommendation links to data sources
     and model lineage.

## 3. UX Enhancements

1. **Glossary Popups**
   - [ ] Ship hover/tap microcards with definitions, pronunciation, and quick
         analogies (e.g., “pip” → “wavelet on the ocean’s surface”).
   - [ ] Enable offline mode via cached glossary manifests and schedule daily
         multilingual syncs.
2. **Mini Quizzes**
   - [ ] Deliver one-question pulse checks after major topics with adaptive
         difficulty based on AGI score trends.
   - [ ] Display badge progress bars showing proximity to “Atoll Analyst” or
         “Reef Risk Manager” status.
3. **Mentor Badges**
   - [ ] Award badges for insightful questions, high quiz accuracy, or
         disciplined trade journaling.
   - [ ] Unlock perks such as mentor AMA sessions, advanced simulations, or
         reduced platform fees.
4. **Localized Metaphors**
   - [ ] Inject Maldivian cultural references (surfing currents, navigating
         reefs, monsoon cycles) into content templates.
   - [ ] Run A/B tests to verify metaphors aid comprehension without degrading
         analytical rigor.

## 4. Backend Integration

1. **LLM Ensemble Router**
   - [ ] Route beginner queries to distilled models that emphasize pedagogy and
         safety.
   - [ ] Direct mentor/analyst queries to larger contextual models with tool
         access and chain-of-thought auditing.
   - [ ] Monitor real-time latency and select fallback models when primary
         models breach SLA.
2. **Signal Sync Layer**
   - [ ] Stand up webhook listeners for TradingView alerts and cron workers to
         tail MT5 logs.
   - [ ] Normalize events into a unified timeline with confidence, instrument,
         and strategy tags.
   - [ ] Stream context features to the conversation engine for proactive
         nudges.
3. **AGI Feedback Loop**
   - [ ] Compute composite engagement scores from question complexity, outcome
         attribution, and quiz cadence.
   - [ ] Adjust tone (encouraging, cautionary, technical) and recommendation
         aggressiveness accordingly.
   - [ ] Surface mentor escalations and compliance checks inside internal
         dashboards.
4. **Data Governance & Observability**
   - [ ] Enforce role-based access for logs, alerts, and mentor review notes.
   - [ ] Run continuous evaluation (shadow deployments, prompt drift alerts) on
         quiz accuracy and response latency.
   - [ ] Maintain audit trails for each recommendation, binding user mode, data
         inputs, and model outputs.

## Implementation Roadmap

1. **MVP (Weeks 0–4)**
   - [ ] Implement beginner mode conversational flow with glossary popups and
         basic quizzes.
   - [ ] Integrate TradingView webhook ingestion and surface alerts in chat
         context.
   - [ ] Launch AGI feedback scoring MVP for question quality.
2. **Growth (Weeks 5–8)**
   - [ ] Add mentor mode with ensemble routing and localized metaphor engine.
   - [ ] Expand badge system with analytics dashboard for user progression.
   - [ ] Introduce MT5 log sync and proactive risk alerts.
3. **Optimization (Weeks 9–12)**
   - [ ] Deploy analyst mode with exportable insights and SLA-aware model
         switching.
   - [ ] Automate compliance audits and mentor escalations.
   - [ ] Run A/B tests on quizzes and metaphor framing to tune learning
         outcomes.

## Success Metrics

- ≥80% quiz accuracy among active users after two weeks of onboarding.
- 30% faster resolution of beginner questions versus baseline FAQ flows.
- ≥90% positive sentiment in post-interaction surveys citing clarity and
  cultural resonance.
- <2s median response latency for mentor/analyst mode exchanges with ensemble
  routing enabled.

## Risks & Mitigations

- **Model Overload:** Mitigate with dynamic throttling, caching, and fallback
  models.
- **Data Drift:** Monitor alert ingestion quality; auto-retrain parsers when
  schema deviations occur.
- **Cultural Misalignment:** Co-design metaphors with local experts and review
  feedback loops monthly.
- **Compliance Breach:** Enforce audit logging, run regular access reviews, and
  integrate policy lints into CI.

## Next Steps

- [ ] Validate blueprint with Maldivian focus groups and gather qualitative
      feedback.
- [ ] Prototype glossary + quiz UI within the existing chat surface.
- [ ] Draft service-level agreements for LLM ensemble latency and data
      synchronization.
