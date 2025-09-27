# Team Operations Algorithms

Operational algorithms for Dynamic Capital's core roles. Each playbook defines
objectives, required inputs, deterministic workflows, and automation leverage
points.

## Operating Rhythm and SOP Governance

- **SOP ownership:** Each team lead maintains the SOPs below, reviews them
  bi-weekly, and documents deltas in the change log. Changes flow through a
  lightweight approval: proposer → adjacent stakeholders → ops lead sign-off.
- **Cadence layers:** Tasks are grouped into Daily, Weekly, and
  Monthly/Quarterly motions so teams can plug procedures into calendar cadences
  without reworking the algorithm itself.
- **Escalation tiers:** Every SOP references the primary escalation path (direct
  lead → cross-functional lead → exec) and includes automated triggers where
  feasible.
- **Quality gates:** All workflows must surface clear entry criteria
  (prerequisites satisfied) and exit criteria (artifact delivered, stakeholder
  notified) to preserve determinism.
- **Automation audit:** Quarterly, the ops lead evaluates automation cues for
  tooling or scripts that can shift manual steps to self-serve workflows.
- **Algorithm sync:** Every team contributes to a centralized algorithm roadmap
  that captures optimizations, dependency impacts, and upgrade timing. Items are
  tagged by owning squad but groomed together during the cross-team sync.

### Algorithm Lifecycle Sync

1. **Intake:** Capture proposed algorithm updates (new model, rule change,
   automation) in the shared backlog with owner, rationale, target KPI, and
   downstream dependencies.
2. **Triage:** Ops lead, Data Analyst, and relevant team leads meet twice weekly
   to prioritize requests using impact × effort and dependency readiness.
3. **Development:** Owning team executes build/test workflow while notifying
   impacted squads via the shared change log and embedding observers in
   milestone reviews.
4. **Integration testing:** Before rollout, run multi-team validations (e.g.,
   marketing + community + data) against staging datasets or sandboxes to catch
   regression risk.
5. **Rollout & measurement:** Launch with feature flags or phased deployment,
   monitor agreed guardrail metrics, and document learnings in the algorithm
   knowledge base.
6. **Retrospective:** Within one week of launch, conduct a brief retro to log
   performance vs. hypothesis, outstanding work, and next optimization
   candidates.

### SOP Implementation Checklist

1. Confirm prerequisites and dependencies are documented in the `Inputs` list.
2. Translate the workflow into calendar reminders or project-management
   templates aligned with the cadence bullets.
3. Configure automations or alerts noted in the `Automation Cues` section.
4. Archive run artifacts (briefs, reports, logs) in the shared knowledge base
   with searchable tags.
5. Capture retro notes on bottlenecks; feed improvements back into the SOP
   during the bi-weekly review.

## How to Use This Document

1. **Gather inputs:** Confirm prerequisite dashboards, briefs, and tooling are
   accessible.
2. **Follow the workflow:** Execute the ordered steps. Conditional logic is
   indented beneath the triggering action.
3. **Log outputs:** Every run should produce the listed artifacts or updates.
4. **Automate when possible:** Suggested automations reduce manual effort and
   enforce consistency.
5. **Link algorithm updates:** When executing a workflow that changes or
   consumes another team’s algorithm, cross-reference the Algorithm Lifecycle
   Sync to ensure dependencies and rollback plans are covered.

---

## Cross-Team Algorithm Optimization Pod

- **Purpose:** Maintain a unified roadmap for algorithm maintenance,
  development, and upgrades spanning growth, community, product, and support
  teams.
- **Membership:** Ops lead (facilitator), Data Analyst (instrumentation owner),
  Marketing Strategist, Community Manager, Front-End and Back-End Developers,
  Blockchain Developer (as needed), and rotating representatives from Legal,
  DevOps, and Support.
- **Cadence:**
  - **Twice-Weekly Working Session (45 min):** Review new intake, groom backlog,
    assign discovery spikes, and confirm readiness of in-flight upgrades.
  - **Weekly Demo Review (30 min):** Showcase algorithm changes, validate
    instrumentation, and confirm downstream content or communication updates.
  - **Monthly Roadmap Reset (60 min):** Align on upcoming upgrade windows,
    resource allocation, and dependency sequencing.
- **Key Artifacts:** Unified algorithm backlog, dependency matrix, testing
  calendar, rollout/rollback playbooks, and performance scorecards.
- **Communication Channels:** Dedicated `#algo-sync` Slack channel for async
  updates, shared dashboard with guardrail metrics, and automated digest
  summarizing changes shipped and pending.

### Pod Workflow

1. **Discovery & Framing:** Owner drafts opportunity brief with problem
   statement, target KPIs, affected teams, and proposed experimentation path.
   Pod validates feasibility and data requirements.
2. **Design & Spec:** Collaboratively define algorithm logic, data schema
   impacts, compliance considerations, and integration points. Designers and PMs
   update user-facing flows where applicable.
3. **Build & QA:** Engineering squads implement changes following their team
   algorithms while pairing with Data Analyst on instrumentation and Legal on
   compliance gates.
4. **Cross-Team Simulation:** Run synthetic or sandbox scenarios with Marketing,
   Community, and Support to ensure messaging, escalations, and handoffs are
   prepped.
5. **Launch Governance:** Assign launch captain, confirm monitoring dashboards,
   and circulate pre-launch briefing outlining guardrails, communication plan,
   and rollback triggers.
6. **Post-Launch Optimization:** Monitor metrics daily for first week, queue
   follow-up enhancements, and archive learnings in the knowledge base with
   clear ownership for next iteration.

## 1. Marketing Team

### 1.1 Marketing Strategist

- **Objective:** Align channel squads on growth targets and capital allocation.
- **Inputs:** Weekly KPI dashboard, OKR tracker, budget ledger, pipeline
  forecast, leadership priorities.
- **Primary Outputs:** Weekly strategy brief, updated OKR status, budget
  allocation log, opportunity/risk register.
- **Cadence & SOPs:**
  - **Daily:** Monitor KPI deltas and urgent leadership directives; push
    escalations to the channel leads room.
  - **Weekly:** Issue the strategy brief, run mid-cycle KPI check, and refresh
    the opportunity/risk register.
  - **Monthly/Quarterly:** Facilitate OKR planning, consolidate lessons learned,
    and update budget envelopes with finance.
- **Workflow Algorithm:**
  1. Pull the latest KPI dashboard and compute week-over-week deltas.
     - If any KPI deviates ±10% from target, flag it in the opportunity/risk
       register.
  2. Review leadership directives and pipeline forecast; annotate must-win
     initiatives.
  3. Rank flagged opportunities/risks using impact × confidence scoring.
  4. Draft a strategy brief containing top three focus areas, channel targets,
     budget envelopes, and success metrics.
  5. Circulate the brief to channel leads and collect acknowledgement within 12
     hours.
     - If acknowledgement is missing, trigger automated reminder at hour 10 and
       escalate to VP Growth at hour 14.
  6. Mid-cycle, refresh KPI deltas; if deviation persists beyond tolerance,
     issue a course-correction memo with updated targets.
  7. End-of-cycle, archive learnings as hypothesis → result → decision log and
     tag Data Analyst for validation.
- **Automation Cues:** Connect BI tool to auto-calculate deltas; use workflow
  automation to chase acknowledgements and escalate overdue tasks.
- **KPIs Monitored:** Pipeline velocity, CAC, budget burn vs. plan, campaign
  ROI.

### 1.2 Content Creator / Copywriter

- **Objective:** Deliver on-brand assets mapped to funnel stages and compliance
  requirements.
- **Inputs:** Strategist brief, content calendar, persona library, brand voice
  guide, legal checklist.
- **Primary Outputs:** Approved copy/assets, metadata tags in CMS, performance
  annotations.
- **Cadence & SOPs:**
  - **Daily:** Work the content backlog, move drafts through the approval
    pipeline, and action reviewer notes within the same day.
  - **Weekly:** Sync with strategist and social manager, publish performance
    annotations, and document learnings in the knowledge base.
  - **Monthly/Quarterly:** Refresh persona insights with research and coordinate
    compliance audits on evergreen assets.
- **Workflow Algorithm:**
  1. Parse strategist brief; map requested assets to funnel stage and target
     persona.
  2. For each asset:
     1. Draft outline including headline, hook, CTA, SEO keywords, and visual
        direction.
     2. Run brand voice checklist and legal compliance scan.
        - If non-compliant, revise before proceeding.
     3. Submit draft to CMS with metadata (persona, funnel stage, target
        metric).
     4. Route through approval workflow (Draft → Review → Approved → Scheduled).
        - If reviewer rejects, capture feedback and loop back to step 2.1.
  3. After publishing, log performance snapshot (CTR, conversions, engagement)
     within 48 hours of data availability.
  4. Push notable learnings into the knowledge base and tag strategist + social
     manager.
- **Automation Cues:** Use AI drafting for first-pass copy, CMS automations for
  approval reminders, and analytics hooks for automatic performance tagging.
- **KPIs Monitored:** Asset velocity, approval cycle time, CTR, conversion rate
  per asset.

### 1.3 Social Media Manager

- **Objective:** Maximize reach, engagement, and attributable conversions across
  social channels.
- **Inputs:** Approved content assets, social scheduling tool, historical
  engagement benchmarks, UTM generator, escalation matrix.
- **Primary Outputs:** Scheduled content calendar, daily engagement log, weekly
  performance summary.
- **Cadence & SOPs:**
  - **Daily:** Monitor dashboards in 2-hour intervals, respond to escalations,
    and capture anomalies in the engagement log.
  - **Weekly:** Publish the performance digest, recalibrate posting windows, and
    align with strategist on experiments.
  - **Monthly/Quarterly:** Audit channel mix, update escalation thresholds, and
    report growth insights to leadership.
- **Workflow Algorithm:**
  1. Import approved assets and create channel-specific variants (copy length,
     hashtag sets, creative crops).
  2. Batch-schedule posts during optimal send windows determined by past
     engagement data.
  3. Attach tracked URLs and ensure attribution parameters are correct.
  4. Monitor live dashboards in 2-hour intervals.
     - If sentiment drops below threshold or high-priority mentions arise,
       respond or escalate within SLA defined in escalation matrix.
  5. At end of day, capture anomalies or viral spikes with screenshots and
     context notes.
  6. Publish weekly performance digest summarizing reach, engagement rate,
     top-performing posts, and next experiments.
- **Automation Cues:** Deploy sentiment alerts, auto-routing for escalations,
  and auto-generated weekly digests using analytics exports.
- **KPIs Monitored:** Engagement rate, share of voice, follower growth,
  conversion-attributed clicks.

### 1.4 Influencer and Partnerships Manager

- **Objective:** Source, activate, and scale high-ROI partnerships.
- **Inputs:** Partner CRM, campaign brief, historical performance scorecards,
  legal templates, budget tracker.
- **Primary Outputs:** Shortlist, outreach sequences, signed agreements,
  performance recap deck.
- **Cadence & SOPs:**
  - **Daily:** Advance live negotiations, confirm asset delivery, and clear CRM
    follow-up tasks.
  - **Weekly:** Refresh the ranked shortlist, run performance reviews on active
    partners, and share updates with finance/legal.
  - **Monthly/Quarterly:** Host partnership retrospectives, renew or sunset
    agreements, and adjust partner scoring criteria.
- **Workflow Algorithm:**
  1. Filter partner CRM by campaign fit, past ROI, and audience overlap; produce
     ranked shortlist.
  2. Personalize outreach sequences with value propositions and expected
     deliverables; launch cadence in CRM.
     - If no response after sequence completion, mark as dormant and schedule
       quarterly re-touch.
  3. Negotiate deliverables and compensation, logging terms and deadlines in
     CRM.
  4. Coordinate asset delivery and approvals; verify creators received briefs
     and tracking links.
  5. During campaign, collect performance metrics (reach, conversions, CPA) and
     update partner scorecards.
  6. After campaign, host retrospective with stakeholders and document decisions
     (renew, nurture, drop).
- **Automation Cues:** Use CRM automations for follow-ups, contract e-sign
  flows, and auto-generated performance scorecards.
- **KPIs Monitored:** Partner activation rate, cost per acquisition, retention
  of top-tier partners, campaign ROI.

### 1.5 SEO and Paid Ads Specialist

- **Objective:** Drive qualified traffic and conversions at efficient cost.
- **Inputs:** Keyword rankings, paid media dashboards, change logs, landing page
  audit queue, experimentation backlog.
- **Primary Outputs:** Optimization backlog, change log updates, A/B test
  reports, budget reallocation notes.
- **Cadence & SOPs:**
  - **Daily:** Review performance dashboards, adjust bids or budgets within
    guardrails, and document urgent changes.
  - **Weekly:** Prioritize backlog items, launch/monitor experiments, and file
    the optimization report.
  - **Monthly/Quarterly:** Recalibrate guardrails, audit landing pages, and
    align spend strategy with leadership.
- **Workflow Algorithm:**
  1. Sync keyword and paid media dashboards; identify anomalies or opportunities
     exceeding ±15% variance.
  2. Prioritize actions using impact vs. effort framework and update backlog
     with owners and deadlines.
  3. Execute technical fixes, bid adjustments, or creative refreshes; document
     each change in the log with timestamp and hypothesis.
  4. Launch experiments with defined success metrics and monitoring windows.
     - If experiment underperforms past the guardrail, auto-pause and trigger
       review.
  5. Monitor spend daily; reallocate budget from underperforming campaigns to
     top performers.
  6. Compile weekly optimization report for strategist and data analyst.
- **Automation Cues:** Integrate auto-bidding, anomaly detection alerts, and
  automatic change log sync with BI dashboards.
- **KPIs Monitored:** Organic traffic growth, quality score, CPA/ROAS,
  experiment win rate.

---

## 2. Community Management Team

### 2.1 Community Manager

- **Objective:** Maintain healthy community sentiment and growth.
- **Inputs:** Marketing roadmap, product release schedule, sentiment dashboard,
  escalation playbooks, event calendar.
- **Primary Outputs:** Community calendar, incident reports, weekly health
  digest, advocacy opportunities list.
- **Cadence & SOPs:**
  - **Daily:** Track sentiment, respond to escalations, and update the event
    prep checklist.
  - **Weekly:** Host moderator sync, publish the health digest, and push
    feedback into product/marketing queues.
  - **Monthly/Quarterly:** Run playbook drills, refresh FAQ packets, and assess
    community goals vs. KPIs.
- **Workflow Algorithm:**
  1. Update the community calendar with upcoming launches, AMAs, and events;
     assign owners and deadlines.
  2. Preload FAQ packets and asset folders for each scheduled announcement.
  3. Monitor sentiment dashboard daily.
     - If negative sentiment rises >10% in 24 hours, activate incident playbook
       (assemble huddle, craft statement, coordinate mitigation).
  4. Host weekly sync with moderators and support specialists to resolve
     escalations and share insights.
  5. Capture community feedback and route actionable items to product or
     marketing backlogs.
  6. Publish weekly health digest summarizing growth metrics, top discussions,
     escalations, and next actions.
- **Automation Cues:** Use keyword alerts, auto-generated digests, and calendar
  reminders for event prep.
- **KPIs Monitored:** Sentiment index, community growth rate, escalation
  resolution time, advocacy conversions.

### 2.2 Moderator

- **Objective:** Enforce community guidelines quickly and consistently.
- **Inputs:** Moderation ruleset, coverage schedule, flagged content queue,
  ban/mute matrix, translation tool.
- **Primary Outputs:** Cleared flag queue, incident log, policy improvement
  suggestions.
- **Cadence & SOPs:**
  - **Daily/Shift:** Sweep flagged content every 30 minutes, action incidents,
    and log outcomes.
  - **Weekly:** Review escalation patterns with the community manager and
    suggest policy updates.
  - **Monthly/Quarterly:** Participate in incident response drills and
    recalibrate the ban/mute matrix.
- **Workflow Algorithm:**
  1. Every 30 minutes, sweep flagged content queue sorted by severity.
  2. For each item:
     1. Review context and apply action per policy matrix (warn, mute, ban,
        escalate).
        - If classification is ambiguous, escalate to community manager within
          10 minutes.
     2. Capture evidence (screenshots, links) and attach to incident log.
  3. At shift end, verify pending reversals (unmutes, appeals) and close
     outstanding actions.
  4. Submit shift summary with incident counts, repeat offender list, and
     suggested policy updates.
- **Automation Cues:** Implement auto-translation for multilingual content,
  keyword filters, and scheduled reminders for appeal follow-up.
- **KPIs Monitored:** Queue response time, recurrence rate, policy breach
  frequency, appeal turnaround.

### 2.3 Customer Support Specialist

- **Objective:** Resolve user issues rapidly and surface actionable feedback.
- **Inputs:** Ticketing system, knowledge base, SLA matrix, product release
  notes, feedback tags.
- **Primary Outputs:** Resolved tickets, escalations log, weekly trends report,
  updated FAQs.
- **Cadence & SOPs:**
  - **Daily:** Clear assigned tickets within SLA, document escalations, and log
    CSAT responses.
  - **Weekly:** Compile the trends report, refresh macros, and propose knowledge
    base updates.
  - **Monthly/Quarterly:** Audit ticket taxonomy, align on product releases, and
    review SLA adherence with ops.
- **Workflow Algorithm:**
  1. Auto-triage new tickets by severity and category; claim tickets within SLA.
  2. Respond using macros or personalized replies referencing knowledge base
     articles.
  3. If ticket is P0/P1, escalate immediately to DevOps/Product channel and
     record timestamp.
  4. After resolution, confirm with user, capture satisfaction rating, and close
     ticket with feedback tag.
  5. Review closed tickets weekly to identify FAQ gaps and propose knowledge
     base updates.
  6. Publish weekly trends report summarizing top issues, product feedback, and
     SLA adherence.
- **Automation Cues:** Deploy AI triage suggestions, auto-satisfaction surveys,
  and notification workflows for escalations.
- **KPIs Monitored:** First response time, resolution time, CSAT, escalation
  rate.

---

## 3. Development Team

### 3.1 Front-End Developer

- **Objective:** Ship accessible, performant user experiences backed by
  automated tests.
- **Inputs:** Sprint backlog, design specs, component library, QA test plans,
  feature flags.
- **Primary Outputs:** Merged PRs, test artifacts, changelog entries, demo
  notes.
- **Cadence & SOPs:**
  - **Daily:** Advance in-flight tickets, run lint/type/test before pushes, and
    respond to code review within SLA.
  - **Weekly:** Demo completed work, reconcile feature flags, and update the
    changelog.
  - **Monthly/Quarterly:** Review tech debt backlog, audit accessibility
    metrics, and participate in incident drills.
- **Workflow Algorithm:**
  1. Select top-priority ticket; clarify acceptance criteria with PM and
     designer.
  2. Break work into sub-tasks (UI, state, integration) and create checklist in
     issue tracker.
  3. Implement UI using shared components and design tokens; run accessibility
     linting.
  4. Write unit/integration tests covering new logic and edge cases.
  5. Execute lint, typecheck, and test suites locally.
     - If any suite fails, fix before proceeding.
  6. Capture before/after screenshots or lightweight demo video and attach to
     PR.
  7. Submit PR with feature flag plan and rollout notes; respond to review
     feedback within 24 hours.
  8. After merge, verify staging deployment and update changelog with
     user-facing notes.
- **Automation Cues:** Integrate visual regression tests, bundle-size alerts,
  and auto-generated changelog entries.
- **KPIs Monitored:** Lead time for changes, PR review turnaround, test
  coverage, accessibility compliance.

### 3.2 Back-End Developer

- **Objective:** Deliver reliable, scalable services with observability baked
  in.
- **Inputs:** Technical specs, API contracts, database schema, load thresholds,
  monitoring dashboards.
- **Primary Outputs:** Service updates, migration scripts, API documentation,
  runbook revisions.
- **Cadence & SOPs:**
  - **Daily:** Inspect service dashboards, progress assigned stories, and sync
    with DevOps on incidents.
  - **Weekly:** Execute load/performance validation, review telemetry, and
    update documentation after releases.
  - **Monthly/Quarterly:** Refresh threat models, run failover tests, and groom
    technical debt roadmap.
- **Workflow Algorithm:**
  1. Evaluate proposed change for schema or contract impact; document plan with
     rollback steps.
  2. Implement code with comprehensive unit and integration tests, including
     negative paths.
  3. Add instrumentation (metrics, logs, traces) aligned with SLOs.
  4. Run load/performance tests on critical endpoints.
     - If performance regression exceeds 5%, optimize before shipping.
  5. Deploy through CI/CD with progressive rollout (canary → staged → full) and
     monitor telemetry.
  6. Update API documentation and communicate breaking changes ahead of release
     completion.
  7. Record lessons learned and update service runbooks.
- **Automation Cues:** Automated schema diffing, canary analysis, and error
  budget dashboards tied to incidents.
- **KPIs Monitored:** Error rate, latency, deployment frequency, change failure
  rate.

### 3.3 Blockchain Developer

- **Objective:** Create secure, auditable smart contracts with minimal gas
  usage.
- **Inputs:** Protocol requirements, threat models, audit checklist, testnet
  environment, on-chain monitoring tools.
- **Primary Outputs:** Contract code, unit/property tests, audit reports,
  deployment scripts, monitoring alerts.
- **Cadence & SOPs:**
  - **Daily:** Implement contract tasks, run static analysis, and review
    monitoring alerts.
  - **Weekly:** Sync with security on audit findings, execute testnet
    simulations, and update documentation.
  - **Monthly/Quarterly:** Conduct invariant reviews, refresh incident response
    drills, and recalibrate gas benchmarks.
- **Workflow Algorithm:**
  1. Draft contract architecture with explicit invariants and upgrade strategy;
     review with security specialist.
  2. Implement contracts using defensive patterns and inline documentation.
  3. Build unit tests, property-based tests, and invariant checks.
  4. Run static analysis, linting, and fuzzing; address findings before testnet
     deployment.
  5. Deploy to testnet using scripts; execute scenario simulations.
     - If any invariant fails, halt progression and remediate.
  6. Coordinate internal/external audits; track findings to closure within
     defined SLA.
  7. Deploy to mainnet with multisig approval; set up real-time monitoring for
     critical metrics (gas usage, anomalous activity).
  8. Maintain post-deployment response plan for incidents.
- **Automation Cues:** Continuous fuzzing pipelines, automated gas cost
  regression reports, alerting hooks into monitoring dashboard.
- **KPIs Monitored:** Audit finding closure rate, gas efficiency, incident
  response time, contract uptime.

### 3.4 UI/UX Designer

- **Objective:** Produce user-validated designs aligned with design system
  tokens.
- **Inputs:** Product brief, research insights, design system library,
  accessibility checklist, usability testing panel.
- **Primary Outputs:** Wireframes, prototypes, design specs, usability reports,
  token updates.
- **Cadence & SOPs:**
  - **Daily:** Progress assigned flows, partner with developers on
    implementation questions, and capture quick user feedback.
  - **Weekly:** Run usability sessions, deliver design reviews, and ensure
    design tokens are synchronized.
  - **Monthly/Quarterly:** Audit accessibility compliance, refresh the design
    knowledge base, and iterate on component usage data.
- **Workflow Algorithm:**
  1. Translate product brief into user flows and low-fidelity wireframes; review
     with stakeholders for alignment.
  2. Upgrade approved flows to high-fidelity prototypes using design system
     tokens.
  3. Conduct usability tests with target personas; capture
     qualitative/quantitative findings.
     - If usability score < benchmark, iterate prototypes and re-test.
  4. Package design specs (layouts, tokens, interaction notes) for handoff to
     front-end developer.
  5. Pair with front-end during implementation review to ensure
     pixel/interaction fidelity.
  6. Archive final assets and document learnings in design knowledge base.
- **Automation Cues:** Token sync plugins, automated accessibility audits within
  design tool, research repository tagging.
- **KPIs Monitored:** Usability score, design cycle time, handoff quality
  (defect rate), component reuse rate.

### 3.5 DevOps Engineer

- **Objective:** Ensure resilient infrastructure and frictionless releases.
- **Inputs:** Monitoring dashboards, incident tickets, infrastructure-as-code
  repo, release calendar, security scan outputs.
- **Primary Outputs:** Updated pipelines, deployment runbooks, incident
  postmortems, compliance reports.
- **Cadence & SOPs:**
  - **Daily:** Review alerts, triage incidents, and verify infrastructure health
    dashboards.
  - **Weekly:** Prep release windows, run security scans, and update deployment
    runbooks.
  - **Monthly/Quarterly:** Lead game days, evaluate cost optimization
    opportunities, and refresh compliance evidence.
- **Workflow Algorithm:**
  1. Review real-time alerts and incident backlog; prioritize remediation based
     on severity and SLA.
  2. Audit upcoming releases for infrastructure dependencies; update IaC modules
     or environment variables accordingly.
  3. Run security and compliance scans; log and prioritize findings.
  4. During release windows, monitor SLO dashboards; if error budget consumption
     spikes, initiate rollback protocol.
  5. Post-release, document outcomes, update runbooks, and schedule resilience
     tests if gaps surfaced.
  6. Conduct weekly capacity and cost review; recommend optimization actions.
- **Automation Cues:** Auto-scaling policies, drift detection, automated
  incident timeline generation, continuous compliance scanning.
- **KPIs Monitored:** System uptime, deployment success rate, MTTR,
  infrastructure cost efficiency.

---

## 4. Administrative and Support Team

### 4.1 Project Manager

- **Objective:** Coordinate roadmap execution, resource alignment, and risk
  mitigation.
- **Inputs:** Strategic roadmap, sprint backlog, resource allocation matrix,
  risk register, stakeholder roster.
- **Primary Outputs:** Sprint plan, dependency tracker, status updates,
  retrospective notes, risk updates.
- **Cadence & SOPs:**
  - **Daily:** Clear blockers, update status dashboards, and confirm critical
    dependencies are on track.
  - **Weekly:** Facilitate planning/review ceremonies, deliver stakeholder
    updates, and reconcile the risk register.
  - **Monthly/Quarterly:** Run capacity planning, refresh operating cadences,
    and audit cross-team dependencies.
- **Workflow Algorithm:**
  1. Consolidate roadmap and backlog; score initiatives using impact vs. effort
     and strategic alignment.
  2. Validate resource availability; adjust scope or negotiate trade-offs as
     needed.
  3. Run sprint/OKR kickoff with clear milestones, owners, and communication
     cadence.
  4. Maintain real-time status dashboard; if progress slips >10% against plan,
     trigger unblock session and update risk register.
  5. Facilitate weekly stakeholder update summarizing wins, blockers, decisions,
     and next steps.
  6. Lead retrospectives capturing action items; assign owners and due dates,
     logging completion in tracker.
- **Automation Cues:** Automated status rollups from project management tool,
  dependency alerts, and risk register reminders.
- **KPIs Monitored:** On-time delivery rate, blocker resolution time,
  stakeholder satisfaction, action item completion rate.

### 4.2 Data Analyst

- **Objective:** Deliver trustworthy insights and automated reporting.
- **Inputs:** Analytics request queue, data warehouse models, quality monitors,
  BI tooling, experiment logs.
- **Primary Outputs:** Validated datasets, dashboards, insight briefs, data
  dictionary updates, automation scripts.
- **Cadence & SOPs:**
  - **Daily:** Triage new requests, monitor data freshness alerts, and resolve
    high-priority defects.
  - **Weekly:** Ship dashboards/analyses, host insight reviews, and update
    automation scripts.
  - **Monthly/Quarterly:** Conduct data quality audits, expand the data
    dictionary, and review analytics roadmap with stakeholders.
- **Workflow Algorithm:**
  1. Intake requests via ticket form; clarify business question, required
     metrics, and deadline.
  2. Audit source data for freshness and quality; log anomalies in quality
     monitor.
     - If quality fails threshold, pause request and open remediation task with
       owning team.
  3. Build or update data models with version control, including tests for
     schema and logic.
  4. Develop dashboards or analyses with defined metric owners and
     documentation.
  5. Review insights with stakeholders; capture decisions and follow-up actions.
  6. Automate recurring analyses via scheduled jobs and update data dictionary
     entries.
- **Automation Cues:** Data quality alerts, scheduled pipeline runs, automated
  insight digests, lineage tracking.
- **KPIs Monitored:** Dashboard adoption, data freshness SLA, defect rate,
  insight-to-action conversion.

### 4.3 Legal Advisor

- **Objective:** Safeguard compliance and mitigate legal risks across
  initiatives.
- **Inputs:** Regulatory updates, contract queue, campaign briefs, risk matrix,
  outside counsel notes.
- **Primary Outputs:** Reviewed contracts, compliance guidance, risk mitigation
  plans, training materials.
- **Cadence & SOPs:**
  - **Daily:** Screen regulatory feeds, clear high-priority contract reviews,
    and log escalations.
  - **Weekly:** Issue compliance guidance summaries, align with
    marketing/product on active campaigns, and track remediation tasks.
  - **Monthly/Quarterly:** Deliver training sessions, refresh playbooks, and
    recalibrate the risk matrix with leadership.
- **Workflow Algorithm:**
  1. Monitor regulatory feeds; log relevant changes in compliance tracker and
     brief affected teams.
  2. Prioritize contract reviews by risk/urgency; apply standardized risk
     checklist.
     - If high-risk clause detected, escalate to outside counsel and mark as
       pending.
  3. Issue mitigation guidance with required disclosures and approval steps.
  4. Track implementation of legal recommendations and confirm completion before
     launch.
  5. Maintain compliance repository and deliver quarterly training updates.
  6. Review incident reports or escalations; update risk matrix and playbooks
     accordingly.
- **Automation Cues:** Contract lifecycle management notifications, regulatory
  alert feeds, automated training reminders.
- **KPIs Monitored:** Review turnaround time, compliance incident rate, training
  completion, risk mitigation adherence.

---

## 5. Optional Roles (Scaling and Expansion)

### 5.1 Growth Hacker

- **Objective:** Validate high-leverage growth experiments rapidly and
  systematically.
- **Inputs:** Experiment backlog, analytics dashboards, user research insights,
  resource availability, guardrail metrics.
- **Primary Outputs:** Prioritized experiment queue, experiment briefs, win/loss
  documentation, integrated playbooks.
- **Cadence & SOPs:**
  - **Daily:** Monitor experiment guardrails, unblock dependencies, and log new
    ideas.
  - **Weekly:** Re-rank backlog, launch/close experiments, and distribute
    decision memos.
  - **Monthly/Quarterly:** Consolidate learnings, refresh guardrail metrics, and
    sync on strategic growth bets with leadership.
- **Workflow Algorithm:**
  1. Score backlog weekly using ICE/RICE and strategic alignment; publish ranked
     queue.
  2. For top experiments, define hypothesis, success metric, guardrails, and
     required resources.
  3. Align stakeholders and secure resources; log approvals before launch.
  4. Launch experiment with tracking plan; monitor leading indicators daily.
     - If guardrail breached, auto-stop experiment and issue incident note.
  5. At decision date, run statistical analysis, determine outcome (ship,
     iterate, kill).
  6. Archive results with playbook-ready documentation and feed validated
     tactics into roadmap.
- **Automation Cues:** Experiment dashboard with automated significance testing,
  alerting on guardrail breaches, and auto-generated recap templates.
- **KPIs Monitored:** Experiment velocity, win rate, incremental growth impact,
  time-to-decision.

### 5.2 Security Specialist

- **Objective:** Maintain strong security posture and rapid incident response.
- **Inputs:** Vulnerability scans, penetration test results, incident tickets,
  asset inventory, compliance requirements.
- **Primary Outputs:** Remediation plan, incident reports, security posture
  dashboard, training updates.
- **Cadence & SOPs:**
  - **Daily:** Review vulnerability alerts, coordinate remediation actions, and
    watch incident queues.
  - **Weekly:** Run incident readiness checks, track remediation SLAs, and
    publish posture updates.
  - **Monthly/Quarterly:** Lead tabletop exercises, refresh response playbooks,
    and align with legal/compliance on regulatory shifts.
- **Workflow Algorithm:**
  1. Review vulnerability feeds and scan outputs; prioritize based on severity
     and exploitability.
  2. Assign remediation tasks to owning teams; enforce SLA tracking.
  3. Conduct quarterly penetration tests or tabletop exercises; log findings and
     action items.
  4. Update incident response playbooks and coordinate drills with DevOps and
     Legal.
  5. During incidents, lead triage, containment, and communication workflows;
     document timeline and lessons learned.
  6. Publish monthly security posture report and training updates.
- **Automation Cues:** Continuous scanning, automated ticket creation for
  vulnerabilities, secret rotation scripts, incident response bots.
- **KPIs Monitored:** Mean time to remediate, incident frequency, compliance
  score, training completion.

### 5.3 Translator / Local Community Leads

- **Objective:** Localize growth and community engagement in priority regions.
- **Inputs:** Regional performance data, localization backlog, cultural
  playbooks, translation memory, local partner directory.
- **Primary Outputs:** Localized assets, regional event plans, feedback reports,
  glossary updates.
- **Cadence & SOPs:**
  - **Daily:** Translate queued assets, validate cultural context with
    reviewers, and share urgent regional feedback.
  - **Weekly:** Reconcile localization backlog, plan regional events, and sync
    with central marketing/community leads.
  - **Monthly/Quarterly:** Evaluate regional KPIs, refresh glossary entries, and
    update partner directories.
- **Workflow Algorithm:**
  1. Rank regions/languages by adoption potential and strategic priority.
  2. Pull localization backlog; assign tasks based on regional expertise and
     timelines.
  3. Translate and culturally adapt assets (marketing, product, support);
     validate with native reviewers.
     - If reviewer flags issues, iterate until quality benchmark is met.
  4. Coordinate regional events or partnerships; align logistics with central
     teams.
  5. Collect regional insights (user feedback, market trends) and share with
     marketing, product, and community managers.
  6. Update shared glossary and translation memory with approved terminology.
- **Automation Cues:** Translation management system with glossary enforcement,
  automated QA checks, and regional performance dashboards.
- **KPIs Monitored:** Localization cycle time, regional engagement growth,
  translation quality score, partner activation rate.

---

## 6. Human Resources Team

### 6.1 Compensation Operations Lead

- **Objective:** Execute trading team compensation cycles while honoring
  investor-first payout sequencing and governance controls.
- **Inputs:** Monthly trading P&L reconciliation, investor distribution ledger,
  HRIS salary roster, compliance attestations, referral CRM export, KPI-based
  bonus matrices.
- **Primary Outputs:** Approved compensation packet,
  payroll/profit-sharing/commission payment files, updated performance fee
  tracker, governance log with decisions and exceptions.
- **Workflow Algorithm:**
  1. Lock the accounting period and reconcile trading P&L with finance; if
     variance exceeds 1% of desk P&L, pause the run and escalate to the CFO.
  2. Verify investor payouts (64%) and reinvestment transfers (16%) from the
     private fund pool ledger; defer compensation if settlement proof is
     missing.
  3. Refresh the performance fee balance (20%) and subtract pending carryovers,
     clawbacks, or prior approvals to determine available headroom.
  4. Generate the fixed salary payroll batch, investigate ±5% variance against
     prior month, and secure HRBP sign-off for any adjustments.
  5. Calculate trader and analyst profit shares based on tiered percentages;
     hold payouts lacking compliance attestations and re-route to remediation.
  6. Aggregate profit-sharing totals and ensure they do not exceed remaining
     performance fee headroom; if they do, pro-rate or defer according to
     governance policy and log the decision.
  7. Import IB referral data, filter for cleared clawback windows, compute
     commissions (percentage plus per-lot), and reconcile totals against
     Supabase events with ±2% tolerance.
  8. For quarterly or annual cycles, confirm bonus pool funding (5%–10% of
     annual profits) fits within remaining performance fee headroom, then
     distribute using KPI score weights and capture approvals.
  9. Compile the compensation packet summarizing fixed, variable, and reserved
     amounts plus residual performance fee balance; route to COO, CFO, and
     compliance for signatures.
  10. After approval, release payment batches via payroll/treasury systems,
      archive confirmations in the HR compliance vault, and update the
      performance fee tracker with post-run headroom.
  11. Document exceptions (deferrals, clawbacks, compliance holds), assign
      owners, and schedule a retro review to feed improvements into the
      compensation policy.
- **Automation Cues:** Scripted performance fee headroom calculator, HRIS →
  payroll batch sync, Supabase referral reconciliation automation, electronic
  approval workflow with audit trails.
- **KPIs Monitored:** Compensation run cycle time, variance between forecasted
  and actual performance fee usage, count of compliance holds, accuracy of
  referral attribution.

---

## Change Log Management

- **Owners:** Project Manager & Data Analyst.
- **Process:** Update this document when workflows change by submitting PRs with
  before/after rationale and communicating updates in the weekly operations
  sync.

## Cross-Team SOP Sync

- **Facilitator:** Ops lead.
- **Cadence:** Monthly cross-functional review focused on inter-team handoffs
  (e.g., marketing → community, product → support).
- **Agenda Template:** Review outstanding action items, inspect high-friction
  handoffs, confirm automation opportunities, assign new owners/deadlines, and
  summarize updates for leadership within 24 hours.
