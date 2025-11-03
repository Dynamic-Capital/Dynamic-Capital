# Dynamic Capital Operating Model Atlas

The Dynamic Capital operating model treats the ecosystem as a living organism so
every contributor can trace how intelligence, execution, risk, incentives, and
communications flow through the
stack.【F:docs/dynamic-capital-ecosystem-anatomy.md†L5-L132】 This atlas
distills that organism view into practitioner checklists that link the flagship
automations, governance rails, and treasury mechanics.

## Layer Summary

| Layer                         | Primary Function                                                                                                                                                                                                                   | Signature Programs                                                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Brain — Dynamic AI (DAI)**  | Fuses multi-lobe perception into governed trading recommendations that downstream services can trust.【F:docs/dynamic-capital-ecosystem-anatomy.md†L14-L39】【F:docs/dynamic-ai-overview.md†L1-L23】                               | Dynamic Learning Algo (DLA), Dynamic Analysis Algo (DAA), Dynamic Prediction Algo (DPA), Dynamic Optimization Algo (DOA).                                                   |
| **Hands — Dynamic Algo (DA)** | Converts approved logic into broker-ready orders while enforcing risk boundaries and feeding telemetry back upstream.【F:docs/dynamic-capital-ecosystem-anatomy.md†L41-L59】【F:docs/dynamic-trading-algo-vs-logic.md†L3-L37】     | Dynamic Trading Algo (DTA), Dynamic Execution Algo (DEA), Dynamic Risk Algo (DRA), Dynamic Allocation Algo (DAL), Dynamic Scalper Algo (DSA), Dynamic Position Algo (DPA2). |
| **Eyes & Ears**               | Eyes supply market structure, depth, and sentiment data; Ears contextualize macro events so signals stay regime-aware.【F:docs/dynamic-capital-ecosystem-anatomy.md†L60-L80】                                                      | Dynamic Market Data Algo (DMDA), Dynamic Volume Algo (DVA), Dynamic Sentiment Algo (DSentA), Dynamic News Algo (DNA), Dynamic Event Algo (DEA2).                            |
| **Heart — Treasury Control**  | Balances reserves, burn schedules, and incentive payouts to protect solvency and align capital with strategy needs.【F:docs/dynamic-capital-ecosystem-anatomy.md†L81-L90】【F:docs/dct-intelligence-driven-tokenomics.md†L5-L112】 | Dynamic Treasury Algo (DTA), Dynamic Burn Algo (DBA), Dynamic Reward Algo (DRA2).                                                                                           |
| **Blood — DCT Token**         | Routes value, governance authority, and stability levers across the protocol’s economic surfaces.【F:docs/dynamic-capital-ecosystem-anatomy.md†L91-L110】【F:docs/dynamic-capital-ton-whitepaper.md†L8-L56】                       | Dynamic Governance Algo (DGA2), Dynamic Compliance Algo (DCA2), DCT price and emissions programs.                                                                           |
| **Nervous System**            | Bridges intelligence outputs into integrations, automation, and telemetry streams that synchronize the stack.【F:docs/dynamic-capital-ecosystem-anatomy.md†L111-L133】                                                             | Dynamic Integration Algo (DIA), Dynamic Monitoring Algo (DMA), Dynamic Automation Algo (DAutoA).                                                                            |
| **Memory**                    | Captures every decision, trade, and policy artifact for replay, compliance, and model retraining loops.【F:docs/dynamic-capital-ecosystem-anatomy.md†L134-L153】                                                                   | Supabase Memory, Dynamic Knowledge Algo (DKA), Dynamic Telemetry Algo (DTA3).                                                                                               |
| **Voice**                     | Keeps operators and stakeholders informed with real-time alerts, reports, and human override channels.【F:docs/dynamic-capital-ecosystem-anatomy.md†L154-L172】                                                                    | Telegram VIP Bot, Dynamic Broadcast Algo (DBA2), Dynamic Status Algo (DSA3).                                                                                                |
| **Legs — Infrastructure**     | Provides resilient, low-latency deployment fabric that closes the loop between venues and automation planes.【F:docs/dynamic-capital-ecosystem-anatomy.md†L174-L183】                                                              | Multi-cloud Fabric, Dynamic Infra Algo (DIA2), Dynamic Latency Algo (DLA2).                                                                                                 |
| **Immune & Hormonal System**  | Detects abuse, modulates incentives, and evolves policies as market or community conditions shift.【F:docs/dynamic-capital-ecosystem-anatomy.md†L184-L194】                                                                        | Dynamic Immune Algo (DIA3), Dynamic Hormone Algo (DHA), Dynamic Evolution Algo (DEA3).                                                                                      |

## Decision-to-Execution Flow

1. **Perception** — Eyes/Ears feed price, liquidity, sentiment, and event
   context into DAI’s lobes so fusion starts with regime-aware
   evidence.【F:docs/dynamic-capital-ecosystem-anatomy.md†L60-L80】【F:docs/dynamic-ai-overview.md†L15-L23】
2. **Reasoning** — DAI scores the opportunity, calibrates confidence, and
   publishes structured rationales for downstream
   review.【F:docs/dynamic-ai-overview.md†L7-L33】
3. **Logic vs. Execution** — Deterministic Tradecraft Logic decides _why_ to
   act, while Dynamic Trade Automation handles the _how_, keeping strategy
   research and order routing loosely
   coupled.【F:docs/dynamic-trading-algo-vs-logic.md†L3-L37】
4. **Risk & Treasury Checks** — Hands-layer guardrails (DRA, DAL) validate
   drawdowns, exposure, and liquidity before orders leave the runway, consulting
   Heart-layer reserves when capital is
   constrained.【F:docs/dynamic-capital-ecosystem-anatomy.md†L41-L90】
5. **Execution & Telemetry** — Orders flow through TradingView, MT5, and
   exchange adapters via the Nervous System while Memory captures receipts for
   audit and
   retraining.【F:docs/dynamic-capital-ecosystem-anatomy.md†L111-L153】
6. **Token Responses** — Profit, loss, or governance triggers activate treasury
   burns, reward adjustments, and compliance broadcasts so Blood and Voice keep
   stakeholders
   aligned.【F:docs/dynamic-capital-ecosystem-anatomy.md†L91-L172】【F:docs/dct-intelligence-driven-tokenomics.md†L10-L112】

## Governance Spine

Dynamic Capital’s governance spine sits inside the Distributed Autonomous
Governance System (DAGS) so every automation inherits the same guardrails,
approval tiers, and audit discipline.【F:docs/dynamic-ags-playbook.md†L24-L130】
Roles (Owner, Operator, Reviewer, Agents) mirror the organism metaphor:
operators supervise Hands and Voice, while governance policies throttle Heart
and Blood actions during high-risk
events.【F:docs/dynamic-ags-playbook.md†L50-L119】 Synchronization patterns
enforce consistent timestamps, idempotent task processing, and structured event
schemas so Memory and Nervous System remain truthful sources of
record.【F:docs/dynamic-ags-playbook.md†L76-L108】

## Treasury & Token Mechanics

The Heart and Blood layers keep the organism solvent by tying treasury behavior
to intelligence and revenue signals. Intelligence-linked burns retire supply
when AGI performance improves, while buybacks recycle protocol revenue back into
DCT to reinforce price
stability.【F:docs/dct-intelligence-driven-tokenomics.md†L10-L51】 Coordinated
market making, synced pricing, and reporting cadences extend those guardrails to
on-chain markets, ensuring liquidity and governance levers stay synchronized
with treasury
buffers.【F:docs/dct-intelligence-driven-tokenomics.md†L52-L112】【F:docs/dynamic-capital-ton-whitepaper.md†L8-L56】

## Memory, Voice, and Compliance Feedback

Supabase-backed Memory archives telemetry, approvals, and audit trails so the
organism can reconstruct any decision or incident
end-to-end.【F:docs/dynamic-capital-ecosystem-anatomy.md†L134-L153】 Voice
surfaces that context through Telegram bots and broadcast automations, giving
humans the ability to pause, adjust, or escalate when anomalies
appear.【F:docs/dynamic-capital-ecosystem-anatomy.md†L154-L172】 Compliance
agents monitor the same feeds, applying AML/KYC and governance policies before
Voice delivers updates to the broader
community.【F:docs/dynamic-capital-ecosystem-anatomy.md†L91-L172】【F:docs/dynamic-ags-playbook.md†L24-L119】

## Inter-layer Feedback Loops

- **Brain ↔ Hands** — Execution receipts throttle signal cadence when slippage
  or drawdown breaches occur, forcing DOA retunes before new strategies
  deploy.【F:docs/dynamic-capital-ecosystem-anatomy.md†L195-L207】
- **Heart ↔ Blood** — Treasury adjustments inform burns, rewards, and liquidity
  levers while token health metrics influence treasury hedging
  strategy.【F:docs/dynamic-capital-ecosystem-anatomy.md†L200-L207】【F:docs/dct-intelligence-driven-tokenomics.md†L10-L112】
- **Nervous System ↔ Memory** — Integration pipelines continuously serialize
  state into Supabase, enabling incident reconstruction and compliance
  proofs.【F:docs/dynamic-capital-ecosystem-anatomy.md†L111-L153】【F:docs/dynamic-ags-playbook.md†L104-L139】
- **Voice ↔ Governance** — Governance outcomes announced via Voice trace back to
  immutable Skeleton records, keeping public messaging synchronized with
  policy.【F:docs/dynamic-capital-ecosystem-anatomy.md†L205-L207】【F:docs/dynamic-ags-playbook.md†L24-L119】

## Operating Model Usage Patterns

Use this atlas to:

1. Map new features to the correct subsystem, ensuring they reuse existing
   automation primitives and respect governance
   tiers.【F:docs/dynamic-capital-ecosystem-anatomy.md†L209-L223】【F:docs/dynamic-ags-playbook.md†L24-L119】
2. Run risk reviews by tracing how perception flows into execution, treasury,
   and token dynamics during stress
   scenarios.【F:docs/dynamic-capital-ecosystem-anatomy.md†L209-L223】
3. Draft tokenomics or treasury proposals that prove how DCT adjustments
   interact with Heart and Blood
   safeguards.【F:docs/dct-intelligence-driven-tokenomics.md†L10-L112】【F:docs/dynamic-capital-ton-whitepaper.md†L8-L56】
4. Onboard collaborators by sharing the organism map, the governance spine, and
   the decision-to-execution lifecycle for rapid
   orientation.【F:docs/dynamic-capital-ecosystem-anatomy.md†L5-L223】【F:docs/dynamic-ags-playbook.md†L24-L139】

With these references, the entire operating model stays legible, auditable, and
ready to scale as new strategies, venues, and automation planes come online.
