# Dynamic ChatKit Integration Plan

> **Status:** Proposed roadmap to migrate Dynamic Chat onto the OpenAI ChatKit
> advanced reference stack while preserving existing Dynamic Capital safeguards.

## Objectives

- Replace bespoke Dynamic Chat transport with ChatKit's typed, tool-aware
  channel while maintaining TON-admin access controls.
- Leverage the ChatKit FastAPI reference backend for tool orchestration and
  streaming, adapting it to our quantum finance copilot catalogue.
- Ship a responsive React client shell that embeds ChatKit widgets within the
  Next.js `DynamicChatLanding` workspace without regressions to admin telemetry.

## Key References

- [OpenAI ChatKit Advanced Samples](https://github.com/openai/openai-chatkit-advanced-samples)
  - `backend/`: FastAPI service scaffolding with ChatKit Python SDK + Agents SDK
  - `frontend/`: Vite + React reference UI, custom widgets, and client tool
    wiring
  - `examples/`: Domain-specific UX patterns (customer support, knowledge
    assistant, marketing assets)

## Inspiration Map for Dynamic AGI Chat

### Backend Building Blocks to Reuse

| ChatKit asset                                          | Why it helps                                                                                                                     | Dynamic AGI adaptation                                                                                                                                                              |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/app/chat.py` multi-tool agent orchestration   | Demonstrates how to translate structured tool outputs, hidden context streaming, and client tool callbacks into ChatKit threads. | Split our Bull/Bear debate agents into individual `Agent` implementations and use `stream_agent_response` to broadcast debate turns, tagging metadata for the multi-agent mind log. |
| `backend/app/memory_store.py` + `facts.py`             | Provides a lightweight async persistence layer for facts learned in-session.                                                     | Swap for Supabase vector storage to capture AGI insights; extend schema with confidence, market regime tags, and provenance for self-monitoring.                                    |
| `backend/app/sample_widget.py` weather widget renderer | Shows how server-rendered widgets can be pushed into the chat stream.                                                            | Replace with live market snapshot + volatility radar widgets generated from `/api/market`, including parameters for asset class and time horizon per AGI strategy module.           |
| `backend/app/constants.py` instruction bundling        | Centralizes system prompts, tools, and persona settings.                                                                         | Map to our Quantum Finance directives so each cognitive module (First-Principles, Pattern Synthesis, Creativity) can inject contextual instructions without duplicating strings.    |

### Frontend & UX Assets to Borrow

| Component / hook                                           | Key capability                                                                    | Planned usage inside `DynamicChatLanding`                                                                                                                                     |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/components/ChatKitPanel.tsx`                 | Encapsulates ChatKit theming, client tool handling, and response lifecycle hooks. | Wrap inside a Next.js client component that synchronizes Dynamic theme tokens, exposes `onResponseEnd` for Signals telemetry, and pipes client tool events to AGI dashboards. |
| `frontend/src/hooks/useFacts.ts`                           | Normalizes fact ingestion and deduplication via refs.                             | Convert to `useInsights` to sync AGI-generated theses into our research timeline and trigger strength/volatility meter updates.                                               |
| `frontend/src/hooks/useColorScheme.ts` + `ThemeToggle.tsx` | Implements reactive theme switching with persisted preference.                    | Merge with Dynamic `ThemeProvider` so ChatKit respects admin theme overrides and accessibility high-contrast mode.                                                            |
| `frontend/src/components/FactCard.tsx`                     | Example of surfacing structured agent output alongside chat.                      | Adapt for "Strategy Snapshot" cards summarizing Bull vs Bear positions, including risk metrics sourced from AGI simulations.                                                  |

### Operational Patterns to Mirror

- **Environment-driven config (`frontend/src/lib/config.ts`):** Use similar
  helper to hydrate domain key, API URL, and AGI persona metadata from
  `NEXT_PUBLIC_*` variables.
- **Thread lifecycle hooks (`onThreadChange`, `onClientTool`):** Instrument to
  reset debate context, commit session transcripts, and flag anomalies for
  compliance review.
- **Examples directory blueprints:** Reuse marketing assistant prompt strategies
  for investor-relations tone, and knowledge assistant flows for compliance Q&A.

## Dynamic AGI Enhancements & Opportunities

1. **Multi-Agent Debate Surface**
   - Instantiate dedicated ChatKit threads for Bull Analyst, Bear Analyst, and
     Moderator agents using the backend sample's agent runner.
   - Stream debate turns as separate participants with color-coded metadata;
     feed consensus summaries into Dynamic's Strength Meter.

2. **Adaptive Strategy Memory**
   - Extend the memory store pattern to record hypotheses, risk flags, and
     market regimes with timestamps.
   - Trigger self-monitoring jobs when conflicting hypotheses are stored,
     enabling the AGI oversight module to reconcile.

3. **Live Market Widgets as Tools**
   - Replace the weather widget template with reusable builders for live market
     snapshots, volatility radar, and liquidity stress gauges.
   - Accept parameters for asset universe, timeframe, and scenario to support
     curiosity-driven exploration routines.

4. **Observability & Security Hardening**
   - Reuse ChatKit server logging hooks to emit audit events tagged with agent
     role, debate round, and tool invocation latency.
   - Apply domain key rotation and per-session signed metadata to align with
     Dynamic Capital compliance posture.

5. **Human Oversight Controls**
   - Mirror the start screen prompt system to surface oversight playbooks (e.g.,
     "Launch Circuit Breaker Review") triggered via client tool calls.
   - Integrate ThemeToggle semantics into accessibility controls so human
     reviewers can switch to high-contrast + condensed views quickly.

### Action Items to Fold into Workstreams

- Add a Backend deliverable to port the sample `Agent` abstraction into a
  reusable `DynamicQuantumAgent` base class with hooks for bias detection
  metrics.
- Introduce a Frontend task to embed ChatKit widgets within our existing Market
  Review panel using the panel component as scaffolding.
- Expand the Data Integration workstream to include schema design for AGI
  insight storage inspired by the facts persistence layer.
- Schedule a design spike to align ChatKit start screen assets with Dynamic AGI
  activation protocol copy.

## Workstreams & Deliverables

### 1. Discovery & Architecture Alignment

- [ ] Audit the current Dynamic Chat data flow (Next.js → API routes → LLM
      services) and produce a sequence diagram.
- [ ] Document auth surfaces (TON mini-app, admin tokens, session storage) and
      map them to ChatKit's domain key, session key, and user metadata model.
- [ ] Decide on hosting topology: co-locate FastAPI ChatKit backend within our
      existing Supabase/Vercel deployment or isolate as a containerized
      microservice (preferred for zero-downtime swaps).

### 2. Backend Foundation (FastAPI + ChatKit)

- [ ] Fork `openai-chatkit-advanced-samples` into `integrations/chatkit/` for
      controlled customization.
- [ ] Convert `backend/app/main.py` into a reusable module
      (`dynamic_chatkit.app`) and encapsulate uvicorn entrypoints for deployment
      via Procfile/PM2.
- [ ] Extend the default tools:
  - [ ] Port Dynamic Capital toolchain (market review fetcher, trade dispatcher,
        compliance notifier) as ChatKit tool functions with structured schemas.
  - [ ] Register long-running tasks through Agents SDK streaming hooks to
        maintain existing “automation route” progress updates.
- [ ] Secure ingress:
  - [ ] Enforce TON admin auth by validating signed payloads before issuing
        ChatKit session tokens.
  - [ ] Inject audit logging (Supabase table) for each tool invocation.
- [ ] Observability:
  - [ ] Pipe ChatKit backend logs to our centralized logging (Datadog/Supabase)
        with correlation IDs from `DynamicCommandBar` invocations.

### 3. Frontend Embedding (Next.js)

- [ ] Create a `@/lib/chatkit/client.ts` wrapper that proxies ChatKit client
      initialization, sourcing config from environment variables
      (`NEXT_PUBLIC_CHATKIT_DOMAIN_KEY`, `NEXT_PUBLIC_CHATKIT_API_URL`).
- [ ] Mirror the React providers from the Vite sample inside a new
      `DynamicChatProvider` client component compatible with Next.js streaming
      boundaries.
- [ ] Replace the existing `DynamicChat` dynamic import with a ChatKit-powered
      container that:
  - [ ] Mounts ChatKit `ChatWindow` and custom widgets using our design system
        tokens.
  - [ ] Bridges session telemetry to `SignalsWidget` via context.
  - [ ] Surfaces loading/error states using existing skeleton + fallback
        patterns.
- [ ] Localize ChatKit strings and comply with current accessibility contract
      (ARIA labels, `VisuallyHidden` usage).

### 4. Data & Tooling Integration

- [ ] Build adapters between ChatKit tool responses and our live market APIs
      (`/api/market`, signals, automation routes) to avoid duplicate fetches.
- [ ] Define JSON schema contracts for market snapshot widgets so ChatKit tool
      output feeds them directly.
- [ ] Add regression tests covering:
  - [ ] Session bootstrap with valid/invalid TON signatures.
  - [ ] Tool execution happy-path & error handling.
  - [ ] Widget rendering when data streams are delayed (fallback copy vs.
        loading skeletons).

### 5. Security & Compliance

- [ ] Threat-model ChatKit deployment (spoofed domain keys, replayed session
      tokens, tool abuse).
- [ ] Implement rate limiting and anomaly detection on the ChatKit FastAPI
      routes.
- [ ] Ensure all outbound tool calls honor data governance (PII scrubbing,
      secrets vault integration).
- [ ] Run accessibility audit (axe) and performance check (Lighthouse) against
      the embedded chat pane.

### 6. Rollout & Change Management

- [ ] Stage ChatKit backend behind feature flag (`dynamicChat.chatkitEnabled`).
- [ ] Provide runbooks for:
  - [ ] Local developer setup using `npm run backend`/`npm run frontend` scripts
        from the reference repo.
  - [ ] Production deploy via CI/CD (container build + migrations).
- [ ] Conduct parallel-run with the legacy chat for one sprint, capturing
      qualitative feedback from desk operators.
- [ ] Finalize migration by removing legacy transport code once success metrics
      hit targets (latency, session stability, tool success rate).

## Timeline & Ownership

| Phase            | Duration | Owner(s)              | Exit Criteria                                         |
| ---------------- | -------- | --------------------- | ----------------------------------------------------- |
| Discovery        | 1 week   | Platform Architecture | Approved architecture & auth mapping                  |
| Backend          | 2 weeks  | Platform + AI Systems | ChatKit backend running in staging with Dynamic tools |
| Frontend         | 2 weeks  | Web Experience        | ChatKit UI embedded in Next.js behind flag            |
| Integration & QA | 1 week   | Platform QA           | Passing tests + telemetry baseline                    |
| Rollout          | 1 week   | Program Mgmt          | Feature flag enabled for all admins                   |

## Open Questions

- How do we harmonize ChatKit session persistence with existing Supabase auth
  tokens?
- Do we need multi-region ChatKit replicas to meet current RTO/RPO targets?
- Can we reuse the reference widgets or should we rebuild them with Dynamic UI
  primitives for pixel parity?

## Next Steps

1. Schedule discovery workshop with AI Systems, Security, and Web Experience
   squads.
2. Spin up sandbox deployment of the ChatKit reference backend to validate TON
   auth adapter design.
3. Draft detailed technical specifications for backend and frontend modules
   before implementation sprint.
