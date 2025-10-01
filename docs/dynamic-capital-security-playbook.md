# Dynamic Capital Security Playbook

## Executive Summary

Dynamic Capital protects high-sensitivity trading and research platforms that
require near-zero downtime and rigorous regulatory compliance. This playbook
defines the process to deploy, operate, and continually improve the enterprise
endpoint security stack with emphasis on automation, low-latency performance,
and rapid incident containment. It translates strategic objectives into concrete
implementation steps, checklists, and accountability measures so that security
engineering, IT operations, and governance stakeholders can act in lockstep.

## Scope, Goals, and Principles

- **Scope:** User workstations, research laptops, trading desktops, jump hosts,
  and supported mobile devices (iOS, Android). Linux servers that host trading
  algorithms consume the same monitoring stack but follow separate hardening
  guides.
- **Primary Goals:**
  - Maintain real-time protection coverage with <2% non-compliant endpoints at
    any time.
  - Detect and contain endpoint-driven attacks within 15 minutes; restore to
    steady state within 2 hours.
  - Preserve trading performance by keeping agent CPU <5% and memory <300 MB
    outside of full-scan windows.
- **Guiding Principles:** Least privilege by default, automation-first
  operations, tamper-resistant configurations, and evidence-driven tuning.

## Stakeholders & Responsibilities (RACI)

| Activity                                | Security Engineering | Threat Operations | IT Operations | Compliance & Risk | Procurement |
| --------------------------------------- | -------------------- | ----------------- | ------------- | ----------------- | ----------- |
| Platform selection & vendor negotiation | A                    | C                 | C             | C                 | R           |
| Policy design & maintenance             | R                    | C                 | C             | I                 | I           |
| Agent deployment & lifecycle            | C                    | I                 | R             | I                 | I           |
| Alert triage & escalation               | C                    | R                 | C             | I                 | I           |
| Automation & SOAR integration           | R                    | C                 | C             | I                 | I           |
| Metrics & reporting                     | R                    | C                 | C             | A                 | I           |
| Governance reviews & audits             | C                    | C                 | C             | R                 | I           |

> **Legend:** R = Responsible, A = Accountable, C = Consulted, I = Informed.

## Technology Stack & Coverage

| Platform / Persona              | Primary Control                                    | Key Capabilities                                                                                                     | Integrations                                             | Owner                |
| ------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------- |
| Trading desktops (Windows)      | Kaspersky Endpoint Security + Kaspersky EDR Expert | Real-time/on-access scanning, behavioral detection, exploit prevention, network attack blocking, ransomware rollback | SIEM (Chronicle), SOAR (Tines), MDM (Intune), ServiceNow | Security Engineering |
| Research laptops (macOS)        | Kaspersky Security for Mac                         | Behavioral analytics, web protection, device control                                                                 | Jamf Pro, Chronicle, ServiceNow                          | IT Operations        |
| Back-office endpoints (Windows) | Kaspersky Endpoint Security Cloud                  | Smart updates, anti-phishing, firewall policies                                                                      | Intune, Chronicle, ServiceNow                            | IT Operations        |
| Mobile devices (iOS/Android)    | Kaspersky Endpoint Security for Business Mobile    | Mobile AV, phishing defense, VPN, compliance posture                                                                 | Intune, MobileIron, ServiceNow                           | Security Engineering |
| Linux research servers          | Kaspersky Endpoint Security for Linux              | Real-time scanning, exploit mitigation, tamper protection                                                            | Ansible, Chronicle, ServiceNow                           | Security Engineering |

## Control Objectives & Implementation Notes

| Feature                                           | Objective                                            | Implementation Actions                                                                                                                                                          |
| ------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real-time protection / on-access scanning         | Block malicious activity as it executes.             | Enable default real-time scanning with policy-based exclusions for trading software; deploy health-check script to verify service status every 5 minutes.                       |
| Behavioral / heuristic / anomaly detection        | Catch zero-day and unknown threats.                  | Enable adaptive anomaly detection; ingest detections into SIEM with enriched process lineage; review alerts daily via SOAR task queue.                                          |
| Exploit / vulnerability protection                | Thwart attacks leveraging unpatched vulnerabilities. | Enforce exploit prevention module for browsers, Office, and proprietary tools; integrate with patch SLAs (critical ≤48h, high ≤7d); run monthly controlled exploit simulations. |
| Firewall / network protection                     | Control inbound/outbound network flows.              | Apply zero-trust outbound policies, auto-quarantine on command-and-control detection; log to firewall analytics dashboard.                                                      |
| Ransomware / anti-tampering                       | Prevent data encryption and unauthorized changes.    | Lock critical file paths in protected folders; enable rollback snapshots; configure tamper password rotation every 90 days with HSM storage.                                    |
| Anti-phishing / web protection                    | Reduce credential theft and drive-by attacks.        | Enforce safe browsing module, integrate with secure web gateways; block malicious URLs via shared threat feed updated hourly.                                                   |
| Smart updates / frequent signatures               | Ensure near-real-time intelligence.                  | Set update frequency to hourly with randomized jitter; track compliance via daily report; fail non-compliant endpoints into remediation queue.                                  |
| Cross-platform / multi-device support             | Provide consistent protections.                      | Automate enrollment via Intune/Jamf APIs; reconcile CMDB inventory weekly; require compliance before granting VPN access.                                                       |
| Additional value-add (VPN, password manager, DLP) | Extend coverage to user data and privacy.            | Enable password vault for privileged users, integrate VPN with identity provider for MFA, roll out lightweight DLP policies for PCI/PII datasets.                               |
| Low system impact / performance optimization      | Maintain trading workstation responsiveness.         | Baseline CPU/RAM impact per persona; run synthetic trading workload tests pre-rollout; adjust scan windows to off-market hours.                                                 |

## Implementation Program

### Phase 0 – Readiness (Weeks 0–1)

- Finalize asset inventory, segment by persona, and identify unsupported OS
  versions.
- Confirm procurement terms, licensing counts, and support SLAs.
- Configure staging environments mirroring trading and research workloads.
- Define rollback and communication plan; schedule change windows with trading
  leadership.

**Exit Criteria:** Inventory accuracy ≥99%, change plan approved by CISO and
CTO.

### Phase 1 – Baseline Configuration (Weeks 1–2)

- Install management consoles (Kaspersky Security Center & EDR) in HA mode.
- Build gold policy templates for each persona with tamper protection enabled.
- Integrate authentication with Okta SSO and set up role-based access control.
- Connect consoles to SIEM, SOAR, and ticketing via API service accounts.

**Exit Criteria:** Policies peer-reviewed, integrations verified with test
events, RBAC validated.

### Phase 2 – Pilot Deployment (Weeks 2–4)

- Select 10% representative endpoints per persona; obtain user consent and
  scheduling.
- Deploy agents via Intune/Jamf/Ansible; verify connectivity and telemetry.
- Run performance benchmarks versus baseline; gather user feedback within 48
  hours.
- Execute simulated malware, phishing, exploit, and ransomware scenarios.

**Exit Criteria:** ≥95% pilot endpoints healthy, zero critical issues,
performance impact ≤ target.

### Phase 3 – Controlled Rollout (Weeks 4–7)

- Expand deployment in weekly cohorts (30%, 60%, 100%) with automated enrollment
  scripts.
- Monitor health dashboard hourly; trigger rollback for failure rate >3% in any
  cohort.
- Conduct weekly go/no-go meetings with stakeholders; communicate status to
  trading desks.
- Update CMDB and asset compliance tags automatically via API.

**Exit Criteria:** 100% in-scope endpoints onboarded, compliance ≥98%, no
unresolved P1 incidents.

### Phase 4 – Automation & Hardening (Week 7 onward)

- Enable auto-isolation workflows in SOAR leveraging EDR APIs.
- Build remediation scripts for common alerts (malicious doc, lateral movement
  attempt, ransomware encryption attempt).
- Set up data leak monitoring and VPN enforcement modules for privileged users.
- Transition project artifacts to steady-state operations with documented SOPs.

**Exit Criteria:** Automation playbooks tested, SOPs signed off, ownership
transitioned to operations teams.

## Integrations & Automation Blueprint

- **SIEM (Chronicle):** Centralize alerts, annotate with asset criticality,
  forward to SOAR.
- **SOAR (Tines):** Automate containment, enrichment (VirusTotal, GreyNoise),
  and ticket creation.
- **MDM / Configuration Management:** Enforce agent presence; non-compliant
  devices lose VPN access via conditional access policies.
- **ServiceNow:** Auto-generate incident and change tickets tied to playbook
  workflows.
- **ChatOps (Slack):** Real-time notifications for high-severity detections with
  acknowledgment tracking.

## Operational Runbooks

### Daily Operations Checklist

1. Review high and critical alerts in SOAR queue; confirm auto-containment
   results.
2. Validate endpoint update compliance report; remediate stale signatures within
   4 hours.
3. Spot-check 5 random trading endpoints for performance metrics and policy
   adherence.
4. Verify last successful backup snapshot for ransomware-protected assets.

### Weekly Tasks

- Tune behavioral detection thresholds based on false positives; document
  rationale.
- Audit newly onboarded assets to confirm correct persona policy and SIEM
  telemetry.
- Review quarantine inventory, releasing or reimaging devices as necessary.
- Update ChatOps on notable trends and remediation actions.

### Monthly Tasks

- Present control effectiveness metrics to security steering committee.
- Reconcile CMDB vs. management console inventory; investigate deltas >1%.
- Conduct phishing simulation; ensure anti-phishing modules block malicious
  links.
- Test rollback and recovery workflow on one non-production asset.

### Quarterly Tasks

- Execute purple-team exercises targeting phishing, ransomware, and exploit
  vectors.
- Validate full incident response end-to-end, including SOAR automation and
  backup restoration.
- Rotate tamper protection passwords and service account credentials.
- Review vendor roadmap and apply relevant feature updates or policy
  adjustments.

### Endpoint Onboarding Runbook

1. Asset created in CMDB → triggers ServiceNow task.
2. IT Ops assigns persona and installs base image with agent pre-packaged.
3. MDM enrollment applies policy, verifies tamper protection, and registers
   health check.
4. Automation posts onboarding summary in Slack; Threat Operations validates
   telemetry within 24 hours.

### Exception Handling Runbook

- User submits exception via ServiceNow form with business justification and
  duration.
- Security Engineering reviews within 1 business day; Threat Ops validates risk
  and compensating controls.
- Approved exceptions auto-expire after set duration with reminder notifications
  3 days prior.
- Exceptions older than 30 days are escalated to Compliance and flagged in
  monthly report.

## Incident Response Play

1. **Detection:** SOAR receives alert, auto-enriches with process lineage, MITRE
   mapping, and asset criticality.
2. **Triage:** Threat Operations validates severity within 10 minutes. If
   confirmed malicious, they trigger containment.
3. **Containment:** SOAR isolates device (network quarantine, VPN revocation)
   and collects triage artifacts (memory dump, volatile logs).
4. **Eradication:** Security Engineering runs vendor removal toolkit; IT Ops
   restores from last clean snapshot if required.
5. **Recovery:** Reconnect network access post-health check, force password
   resets for impacted identities, and monitor for recurrence for 72 hours.
6. **Post-Incident Review:** Within 48 hours, run RCA session, capture lessons
   learned, update detections/policies, and close in GRC system.

## Metrics & Reporting

| Metric              | Definition                                                | Target               | Data Source                            | Owner                |
| ------------------- | --------------------------------------------------------- | -------------------- | -------------------------------------- | -------------------- |
| Endpoint coverage   | % of in-scope assets reporting healthy status in last 24h | ≥98%                 | Kaspersky console, CMDB                | IT Operations        |
| MTTD / MTTR         | Minutes to detect/respond to confirmed endpoint incidents | MTTD ≤15, MTTR ≤120  | SOAR, ServiceNow                       | Threat Operations    |
| False-positive rate | % of alerts downgraded after triage                       | ≤5%                  | SOAR analytics                         | Threat Operations    |
| Performance impact  | Avg CPU/RAM usage per persona outside scans               | CPU ≤5%, RAM ≤300 MB | Endpoint telemetry                     | Security Engineering |
| Exception backlog   | # of exceptions >30 days old                              | 0                    | ServiceNow                             | Compliance           |
| Patch alignment     | % of exploitable CVEs remediated within SLA               | ≥95%                 | Vulnerability scanner, patch dashboard | IT Operations        |

## Governance & Review

- **Playbook Review Cadence:** Every six months or after material
  incidents/tooling changes; chaired by CISO.
- **Documentation:** Store signed approvals, risk assessments, pilot results,
  and exercise reports in the GRC platform under "Endpoint Security Program"
  collection.
- **Training:** Annual refresher for operators on console usage, SOAR workflows,
  and tamper protection protocols.
- **Continuous Improvement:** Feed lessons learned from incidents and exercises
  into backlog; prioritize automation opportunities and control enhancements
  quarterly.

## Appendices

- **Reference Architecture Diagram:** Maintain updated network and data flow
  diagram in the shared architecture repository (link referenced in CMDB).
- **Change Calendar Template:** Include maintenance windows, responsible
  contacts, and rollback criteria for each rollout wave.
- **Checklist Repository:** Store detailed SOP checklists in Confluence,
  synchronized with this playbook and linked in ServiceNow runbooks.
