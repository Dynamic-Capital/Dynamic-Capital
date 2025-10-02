# Telegram Data Exposure Response Plan

## Summary

Recent scans identified multiple exposure vectors involving Telegram identifiers
and user telemetry. Treat the following items as confirmed incident scope until
proven otherwise:

- **Customer Telegram IDs and activity patterns leaked publicly.** Logs and
  exports contain direct mappings between Telegram accounts and engagement data.
- **Student personal information at risk.** Education tables reference Telegram
  IDs alongside student records, enabling potential deanonymization.
- **Bot user records observable externally.** REST endpoints and cached admin
  exports risk revealing bot usage timelines.
- **Browser extension published publicly.** The Dynamic Capital helper extension
  includes privileged API references.
- **Outdated Postgres release.** Managed Postgres hosts lag vendor security
  patches.
- **Anonymous access policies too permissive.** Legacy `anon` role grants allow
  metadata discovery across sensitive schemas.

This document drives the containment, remediation, and follow-up actions
required to close the exposures. Use it alongside the master incident checklist
and the communications plan.

## Detection & Triage (0-1 hour)

1. **Confirm indicators of compromise (IOCs)**
   - Capture URLs, object keys, and query patterns that exposed Telegram
     identifiers.
   - Save hashes of leaked CSV/JSON artifacts to track accidental
     redistribution.
2. **Snapshot current state**
   - Export RLS policies, Supabase configuration, and extension store metadata
     for forensic comparison.
   - Take application and database metric snapshots to establish a baseline for
     later monitoring.
3. **Escalate incident channel**
   - Page the on-call security engineer and open the incident room in
     Slack/Teams.
   - Assign an incident commander (IC) and deputy; document roles in the
     ticketing system.

## Containment Checklist (0-4 hours)

1. **Lock down data exports**
   - Freeze public dashboards and revoke presigned URLs tied to Telegram
     analytics buckets.
   - Invalidate cached CSV exports in storage; purge CDN layers serving
     `bot_users` activity reports.
2. **Disable anonymous Supabase channels**
   - Revoke `anon` API keys used outside the mini-app.
   - Temporarily disable the Supabase REST endpoint via the dashboard if
     regeneration is delayed.
3. **Pull the browser extension**
   - Set the extension listing to private and submit takedown requests on
     mirrored stores.
   - Rotate any embedded secrets referenced by the extension manifest.
4. **Alert stakeholders**
   - Notify security@dynamic.capital, compliance, and customer success leads.
   - File an incident ticket with severity **High** and begin hourly status
     updates.

## Remediation Plan (0-7 days)

### Data Minimization

- Partition Telegram identifiers into a hardened schema with RLS default-deny
  policies.
- Introduce surrogate identifiers (hashed Telegram IDs) for analytics use cases.
- Update Supabase functions to request hashed values and drop plaintext Telegram
  IDs from responses.

### Policy Hardening

- Audit all RLS policies granting `anon` role read access; replace with
  service-role proxies and signed function calls.
- Enforce `SECURITY DEFINER` functions to gate mini-app reads through token
  validation.
- Add automated regression tests that fail if new tables expose Telegram
  identifiers without explicit allowlists.

### Application Changes

- Replace raw Telegram ID logging with salted hashes; ensure structured logs
  omit usernames.
- Update admin dashboards to require elevated JWT claims before rendering bot
  activity timelines.
- Ship a patched browser extension referencing tokenless telemetry endpoints and
  publish a post-mortem.

### Platform Upgrades

- Schedule a zero-downtime Postgres minor version upgrade that includes the
  latest security patches.
- Enable pgAudit for `bot_users`, `user_sessions`, and `education_enrollments`
  tables with 30-day retention.
- Configure automated dependency checks for Supabase Edge Functions handling
  Telegram data flows.

### Root Cause Analysis & Documentation

- Correlate Supabase audit logs with leaked artifacts to map the precise data
  flow.
- Identify missing change management steps that allowed anonymous access
  policies to persist.
- Document timeline entries (discovery → containment → remediation) and capture
  all decisions in the incident ticket.

## Validation & Monitoring (Day 7+)

- Execute privacy regression tests verifying no REST endpoints return raw
  Telegram IDs for anonymous users.
- Review pgAudit and Supabase access logs for unauthorized queries following the
  fix deployment.
- Run continuous scanning on extension bundles to detect accidental publication
  of privileged scopes.
- Track incident metrics (MTTD, MTTR, records exposed) and document in the
  compliance GRC portal.

## Communication

- Issue customer notifications under GDPR and regional privacy obligations when
  impact analysis confirms exposure.
- Publish a summarized incident report in the trust center once remediation is
  complete and validated.
- Provide regulators with remediation evidence packets, including RLS policy
  diffs and Postgres patch confirmation.

## Post-Incident Hardening

- Schedule a tabletop exercise focused on Telegram data handling to validate the
  updated playbook.
- Add continuous verification checks (CI linting, schema tests) that fail builds
  when new tables include raw Telegram IDs.
- Backfill training for developers and support staff on proper handling of
  messaging identifiers and associated privacy rules.

## Ownership

| Workstream                   | Lead Team            | Due Date |
| ---------------------------- | -------------------- | -------- |
| Data containment & log scrub | Data Platform        | +24 hrs  |
| RLS policy overhaul          | Database Engineering | +3 days  |
| Application updates          | App Platform         | +5 days  |
| Browser extension takedown   | Security Engineering | +2 days  |
| Postgres patch rollout       | Infrastructure       | +7 days  |
| Customer & regulator comms   | Compliance & Legal   | +7 days  |

Keep this plan updated as tasks close. Document lessons learned during the
post-incident review to strengthen preventative controls.
