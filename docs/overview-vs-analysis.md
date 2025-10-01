# Overview vs. Analysis Guidelines for Dynamic Capital

Maintaining clear distinctions between overviews and analyses helps the Dynamic
Capital team produce investor updates, product briefs, and research memos that
move quickly from context to actionable insight. Use this guide whenever you
structure documentation, dashboards, or stakeholder communications.

## Overview Fundamentals

- **Purpose**: Deliver the big picture without deep detail so readers orient
  themselves before they encounter specifics.
- **Tone**: Neutral and high-level, communicating scope, goals, and audience
  value.
- **Placement**: Open product specs, release briefs, investor notes, and team
  updates with an overview so stakeholders know what problem the artifact
  addresses.

### Dynamic Capital Use Cases

| Artifact                 | Overview Focus                                | Typical Length    |
| ------------------------ | --------------------------------------------- | ----------------- |
| Investor memo            | Market shift, treasury posture, runway impact | 2–3 paragraphs    |
| Product release note     | Feature summary, target user, success metrics | 5–7 bullet points |
| Trading strategy outline | Objective, allocation, risk guardrails        | One short section |
| Runbook or SOP           | Scope, triggers, related systems              | 3–4 sentences     |

### Common Overview Types

- **Topic Overview**: Supplies foundational background when introducing a new
  market, regulation, or partner.
- **Report Overview**: Summarizes the sections inside longer docs, making it
  easy for contributors to scan responsibilities.
- **Executive Overview**: Highlights key findings and asks for decision-maker
  action in investor or leadership briefs.
- **Literature Overview**: Synthesizes external research when evaluating new
  capital models or hedging strategies.

## Analysis Fundamentals

- **Purpose**: Break information into components to interpret drivers, evaluate
  trade-offs, and surface insights that shape decisions.
- **Tone**: Critical but balanced—clarify assumptions, limitations, and
  reliability of data.
- **Placement**: Follow the overview with analysis in strategy docs, risk
  reviews, and telemetry retrospectives.

### Dynamic Capital Use Cases

| Artifact                | Analysis Emphasis                                       | Decision Enabled           |
| ----------------------- | ------------------------------------------------------- | -------------------------- |
| Treasury risk review    | Liquidity ratios, counterparty exposure, stress tests   | Adjust reserve allocations |
| Trading post-mortem     | Entry/exit timing, signal reliability, slippage         | Improve guardrails         |
| Product adoption report | Cohort retention, funnel drop-off, support load         | Prioritize roadmap         |
| Incident retrospective  | Root causes, mitigation effectiveness, follow-up owners | Harden operations          |

### Common Analysis Types

- **Descriptive Analysis**: Presents what happened using factual data (e.g.
  daily inflow/outflow logs, bot uptime metrics).
- **Comparative Analysis**: Contrasts segments, time periods, or strategies to
  show relative performance (e.g. L2 vs. L1 payment settlement speed).
- **Critical Analysis**: Evaluates strengths, weaknesses, and risks to guide a
  go/no-go call.
- **Thematic Analysis**: Identifies recurring user feedback themes or trading
  anomalies.
- **Quantitative/Statistical Analysis**: Applies statistical methods to pricing
  signals, treasury hedges, or cohort behavior to validate confidence.

## Stitching the Narrative Together

1. **Overview** — Set context: what problem, audience, and desired outcome.
2. **Summary** — Condense key findings, decisions needed, or KPIs in two to five
   bullets or sentences.
3. **Analysis** — Dive into supporting evidence, assumptions, and competing
   interpretations.
4. **Recommendations** — Translate analysis into clear next steps, owners, and
   timelines.
5. **Referencing** — Cite data sources, dashboards, and research so others can
   trace evidence.
6. **Indexing or Navigation** — Provide quick links, anchors, or checklists for
   longer docs in Notion, GitHub, or the Telegram mini app.
7. **Quality Review** — Request grading or sign-off from the relevant owner
   (product, treasury, ops) before distribution.

## Example: Dynamic Capital Investor Brief

- **Overview**: "Dynamic Capital is expanding USDC settlement into LATAM
  corridors to capture fintech partners seeking same-day cross-border payroll."
- **Summary**: Bullet the core metrics (pipeline size, expected ARR, risk
  exposure) and highlight the decision request (e.g. approve dedicated growth
  budget).
- **Analysis**: Outline adoption forecasts, capital requirements, partner risk
  scoring, and scenario sensitivity.
- **Recommendations**: List immediate next steps, accountable owners, and
  deadlines.
- **References**: Link to Supabase dashboards, ledger exports, regulatory memos,
  or partner diligence notes.

## Quick Takeaways

- **Overview** = Context + scope tailored to the audience.
- **Summary** = Concise highlights and required decisions.
- **Analysis** = Evidence-backed interpretation driving action.
- **Recommendation** = Action plan rooted in analysis, pointing to references.

Together, these components keep Dynamic Capital communications fast, reliable,
and decision-ready.
