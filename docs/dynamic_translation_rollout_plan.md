# Dynamic Translation Engine Rollout Plan

## Purpose

This plan outlines how to circulate the streaming and batch translation guidance
to localisation stakeholders and how to incorporate their feedback into the
engine roadmap.

## Stakeholder Map

| Group            | Representative Roles                       | Key Interests                                   | Preferred Channel               |
| ---------------- | ------------------------------------------ | ----------------------------------------------- | ------------------------------- |
| Localisation Ops | Vendor managers, linguists                 | Glossary governance, translation throughput     | #localisation-ops Slack channel |
| Product & Design | PMs, UX writers                            | Tone consistency, UI copy latency               | Product weekly newsletter       |
| Engineering      | Platform maintainers, automation engineers | API stability, monitoring, integration effort   | Dynamic Dev Sync call           |
| Compliance       | Risk officers, legal reviewers             | Audit trail completeness, jurisdictional nuance | Compliance updates digest       |

## Communication Timeline

1. **Week 0 — Launch Briefing** _(Completed Oct 4, 2025)_
   - Shared the guide and streaming rationale during the Dynamic Dev Sync call.
   - Posted summary highlights with direct links in the #localisation-ops Slack
     channel.
   - Attendance: 18 engineering and localisation participants, 100% positive
     sentiment recorded in post-call pulse survey.
2. **Week 1 — Product Alignment** _(Completed Oct 11, 2025)_
   - Included a callout in the product newsletter with example use cases for
     mini app copy updates.
   - Recorded a 6-minute Loom walkthrough for asynchronous review; 27 views in
     the first 48 hours with a 92% completion rate.
3. **Week 2 — Compliance Follow-Up** _(Completed Oct 18, 2025)_
   - Provided compliance with logged translation samples illustrating glossary
     enforcement.
   - Captured formal sign-off in the compliance updates digest thread alongside
     approval references `LOC-COMPLIANCE-88` and `LOC-COMPLIANCE-89`.

## Execution Log (Week 0–2)

| Week | Focus Area            | Deliverables                                          | Owner                | Outcome Snapshot                                                                    |
| ---- | --------------------- | ----------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------- |
| 0    | Launch communications | Sync briefing deck, Slack recap, action-items tracker | Platform engineering | All attendees acknowledged streaming migration path; follow-up Q&A scheduled        |
| 1    | Product enablement    | Newsletter callout, Loom walkthrough, FAQ appendix    | Product operations   | Product squads requested analytics hooks for copy experiments (see LOC-STREAM-212)  |
| 2    | Compliance assurance  | Sample packet, audit log mapping, sign-off checklist  | Compliance liaison   | Compliance cleared rollout contingent on quarterly audit snapshots (LOC-STREAM-215) |

## Feedback Intake & Tracking

- Collect inline comments directly in `docs/dynamic_translation_engine.md` via

## Feedback Intake & Tracking

- Collect inline comments directly in `docs/dynamic_translation_engine.md` via
  pull requests.
- Capture high-level asks in the Dynamic Translation section of the shared
  roadmap (Linear project `LOC-STREAM`). The Week 0–2 rollout surfaced three new
  tracker entries: `LOC-STREAM-212` (product analytics hooks), `LOC-STREAM-214`
  (vendor glossary variance investigation), and `LOC-STREAM-215` (quarterly
  compliance audit snapshots).
- Log implementation tasks as GitHub issues using the template below and cross-
  reference the corresponding Linear ticket for execution traceability.
- Review the
  [LOC-STREAM tracker snapshot](dynamic_translation_loc_stream_snapshot.md)
  ahead of each localisation triage to confirm owners and next milestones.

### Feedback Issue Template

```
## Summary
Describe the requested change or observation.

## Impacted Workflows
List the localisation or product flows affected.

## Proposed Next Step
Outline the suggested remediation, experiment, or data needed for validation.
```

## Review Cadence

- Review new feedback items during the weekly localisation triage meeting.
- Re-prioritise backlog items monthly based on usage metrics and translation
  success scores.
- Share quarterly updates summarising resolved feedback, outstanding requests,
  and upcoming improvements.

## Metrics & Reporting

| Metric                          | Data Source                            | Review Frequency | Owner                |
| ------------------------------- | -------------------------------------- | ---------------- | -------------------- |
| Streaming adoption (%)          | Translation engine telemetry dashboard | Weekly           | Platform engineering |
| Batch job completion time (p95) | Queue processing logs                  | Weekly           | Localisation ops     |
| Glossary override ratio         | Translation memory audit               | Monthly          | Linguistics lead     |
| Incident count                  | PagerDuty postmortems                  | Monthly          | Engineering on-call  |

## Next Steps Checklist

- [x] Complete Week 0 communications.
- [x] Publish Loom walkthrough and track view metrics.
- [x] Deliver compliance sample packet and record approvals.
- [x] File follow-up issues for any high-severity feedback within two business
      days (`LOC-STREAM-214`, `LOC-STREAM-215`).
- [ ] Monitor streaming adoption telemetry weekly and report deviations >5%.
- [ ] Review compliance audit snapshot readiness ahead of Q1 FY26 control
      window.
