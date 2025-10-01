# Dynamic Capital Milestones

## Purpose

Dynamic Capital measures progress through a ladder of milestones that convert
strategic ambitions into accountable execution. The framework aligns capital
deployment, protocol development, and community adoption, ensuring that each
release cycle compounds previous wins while protecting treasury resiliency.

Use this playbook to coordinate cross-functional delivery, keep contributors
focused on the next irreversible proof point, and decide when to open new risk
envelopes.

## Milestone Ladder

Use the ladder below to decide which investments unlock the next tranche of
resourcing. Each stage has a **horizon** for planning, a **north-star outcome**
to steer tradeoffs, and a **stage-gate review** that confirms readiness to
advance.

| Stage                 | Horizon     | North-Star Outcome                                                                                  | Stage-Gate Review                                                                                                                                                                  |
| --------------------- | ----------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation            | Weeks 0-8   | Unified repo, shared telemetry, and baseline automations supporting bot + Mini App parity.          | Launch readiness review confirming an incident-free rehearsal, ≥95% checklist completion, green CI on guardrails, and support runbooks signed off.                                 |
| Productization        | Months 3-6  | Revenue-grade onboarding, self-serve capital products, and verified settlement pathways.            | Operations & Revenue review demonstrating three capital instruments settling end-to-end with reconciled ledgers, customer SLAs, and on-call rotations documented.                  |
| Network Proof         | Months 6-9  | Community participation loops, builder onboarding funnel, and guardian council operating rhythm.    | Community & Governance review logging two guardian retros, ≥50 active members with milestone attestations, and adoption telemetry trending upward for three consecutive sprints.   |
| Capital Scale         | Months 9-15 | Programmatic liquidity expansion, treasury diversification, and resilience stress testing.          | Risk & Treasury review validating reserves covering 12 weeks of obligations, automated hedging triggers firing in sandboxes, and dual-region infrastructure failover test results. |
| Regenerative Flywheel | Months 15+  | Autonomous incentive adjustments, interoperable data exchange, and reinvestment loops for builders. | Stewardship review confirming quarterly governance upgrades shipped, recurring impact reporting distributed, and ≥70% surplus reinvested into builder grants.                      |

### Stage Readiness Checklists

Use these checklists as the minimum bar before requesting the corresponding
stage-gate review. Capture evidence links in the roadmap entry for the
milestone.

#### Foundation

- Platform runbooks cover deploy, rollback, and incident paging flows.
- Telemetry dashboards track Mini App interactions, bot throughput, and Supabase
  health.
- Release rehearsal artifacts (video or notes) uploaded with sign-offs from
  incident commander and QA lead.
- Keeper rotation and escalation directory posted to the operations channel.

#### Productization

- Customer onboarding journey map updated with service blueprints and
  instrumentation IDs.
- Treasury safe transfer policies and reconciliation SOPs reviewed by
  legal/compliance.
- Post-launch support capacity modeled with staffing plan and paging policy
  updates.
- Billing, KYC, and settlement smoke tests automated in CI with nightly runs
  recorded.

#### Network Proof

- Builder Readiness Index published with scoring rubric linked to backlog
  grooming.
- Guardian council charter ratified, membership roster maintained, and review
  cadence scheduled.
- Community health metrics (activation, retention, referral) tracked weekly with
  threshold alerts.
- Ambassador enablement kit (FAQ, scripts, asset pack) delivered and
  version-controlled.

#### Capital Scale

- Liquidity stress scenarios simulated with treasury coverage reports stored in
  `/data/treasury/`.
- Hedging automation tested in staging with rollback plan documented.
- Infrastructure failover drill executed with recovery timeline captured and
  remediation tasks filed.
- Vendor risk assessments refreshed and mapped to continuity playbooks.

#### Regenerative Flywheel

- Incentive tuning playbook codified with guardrails and automated rollback
  triggers.
- Data interoperability contracts validated via integration tests across
  portfolio surfaces.
- Quarterly impact report template populated with pilot data and distribution
  list confirmed.
- Builder reinvestment policy reviewed with finance & governance signatories
  attached.

## Workstream Alignment

### Platform & Infrastructure

- Harden deployment, observability, and incident response through the Foundation
  stage.
- Expand reliability SLAs once Productization unlocks predictable load profiles.
- Commission multi-region failover before Capital Scale approvals.

### Treasury & Liquidity

- Stand up automated treasury dashboards and safe transfer policies in
  Foundation.
- Unlock programmatic hedging and risk alerts during Capital Scale to sustain
  liquidity promises.
- Diversify reserve assets and document diversification policy revisions in the
  Regenerative Flywheel stage.

### Builder Success

- Publish the Builder Readiness Index and milestone rubrics during
  Productization.
- Require milestone attestations for each builder release in Network Proof.
- Tie reinvestment decisions to longitudinal builder progress once the flywheel
  activates.

### Governance & Compliance

- Form the guardian council charter and review cadence by the end of Network
  Proof.
- Map regulatory obligations to funding instruments during Productization.
- Automate evidence capture (policies, attestations, audits) as Capital Scale
  matures.

### Growth & Community

- Launch narrative arcs and onboarding journeys in Foundation, proving
  message-market fit.
- Establish ambassador tiers and milestone storytelling rituals during Network
  Proof.
- Publish public impact dashboards each quarter once Regenerative Flywheel
  metrics are stable.

### Owner Matrix

| Workstream                | Foundation                                      | Productization                                  | Network Proof                                      | Capital Scale                                     | Regenerative Flywheel                                |
| ------------------------- | ----------------------------------------------- | ----------------------------------------------- | -------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| Platform & Infrastructure | DRI: Platform Lead<br/>QA: Reliability Engineer | DRI: Platform Lead<br/>QA: Release Manager      | Advisor: SRE Guild                                 | DRI: SRE Guild Lead<br/>QA: Infra Program Manager | Advisor: Platform Lead                               |
| Treasury & Liquidity      | DRI: Treasury PM<br/>QA: Finance Ops            | DRI: Treasury PM<br/>QA: Risk Analyst           | Advisor: Guardian Finance Rep                      | DRI: Risk Committee Chair<br/>QA: Internal Audit  | Advisor: Treasury PM                                 |
| Builder Success           | DRI: Builder Ops Lead<br/>QA: Product Marketing | DRI: Builder Ops Lead<br/>QA: Design Researcher | DRI: Community PM<br/>QA: Guardian Liaison         | Advisor: Community PM                             | DRI: Builder Ops Lead<br/>QA: Governance Analyst     |
| Governance & Compliance   | DRI: Compliance Lead<br/>QA: Legal Counsel      | DRI: Compliance Lead<br/>QA: Policy Analyst     | DRI: Guardian Secretary<br/>QA: Governance Analyst | DRI: Compliance Lead<br/>QA: Internal Audit       | DRI: Governance Architect<br/>QA: Guardian Secretary |
| Growth & Community        | DRI: Growth PM<br/>QA: Content Strategist       | DRI: Growth PM<br/>QA: Lifecycle Marketer       | DRI: Community PM<br/>QA: Ambassador Lead          | DRI: Growth PM<br/>QA: PR Lead                    | DRI: Community PM<br/>QA: Analytics Partner          |

## Execution Cadence

- **Quarterly Planning (Stage Steering Committee):** Confirm the upcoming stage
  focus, roll forward incomplete objectives, and surface dependency risks.
  Capture outcomes as roadmap updates with owner acknowledgments.
- **Biweekly Milestone Reviews (Workstream Pods):** Track exit criteria
  progress, unblock owners, and adjust resourcing. Include burndown snapshots,
  risk register deltas, and customer signals in the notes.
- **Weekly Scorecards (Ops Broadcast):** Capture leading indicators (telemetry
  uptime, conversion rates, treasury buffer) alongside decision notes for
  transparency. Publish in the Portfolio app with red/yellow thresholds.
- **Daily Standups (Async Thread):** Use the stage-specific checklist headings
  to report status, blockers, and new evidence links before 15:00 UTC.

## Tooling & Reporting

- Maintain milestone definitions, owners, and due dates in the Dynamic Capital
  Roadmap (`docs/ROADMAP.md`).
- Synchronize milestone status to the shared change log and broadcast updates
  via the Portfolio app.
- Archive retrospectives and guardian council sign-offs in the governance
  knowledge base to close the feedback loop between stages.
- Store review decks and evidence packets under
  `/docs/milestone-reviews/<stage>/<yyyymmdd>/` for auditability.
- Use the `scripts/milestone-scorecard.ts` generator (WIP) to refresh the stage
  scorecard charts before each biweekly review.
