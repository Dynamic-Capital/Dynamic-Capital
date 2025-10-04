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

1. **Week 0 — Launch Briefing**
   - Share the guide and streaming rationale during the Dynamic Dev Sync call.
   - Post summary highlights with direct links in the #localisation-ops Slack
     channel.
2. **Week 1 — Product Alignment**
   - Include a callout in the product newsletter with example use cases for mini
     app copy updates.
   - Record a short Loom walkthrough for asynchronous review.
3. **Week 2 — Compliance Follow-Up**
   - Provide compliance with logged translation samples illustrating glossary
     enforcement.
   - Capture formal sign-off in the compliance updates digest thread.

## Feedback Intake & Tracking

- Collect inline comments directly in `docs/dynamic_translation_engine.md` via
  pull requests.
- Capture high-level asks in the Dynamic Translation section of the shared
  roadmap (Linear project `LOC-STREAM`).
- Log implementation tasks as GitHub issues using the template below.

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

- [ ] Complete Week 0 communications.
- [ ] Publish Loom walkthrough and track view metrics.
- [ ] Deliver compliance sample packet and record approvals.
- [ ] File follow-up issues for any high-severity feedback within two business
      days.
