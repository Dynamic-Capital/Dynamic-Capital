# Runbook — System HALT Activation

## Trigger
- Manual kill-switch activation request from PolicyGuard
- Automated HALT due to critical breach (drawdown, compliance, security)
- Chaos exercise verifying HALT channel

## Preconditions
- Verify HALT intent received on `system.halt.intent`
- Confirm at least two agents acknowledge receipt in traces

## Procedure

1. **Triage.**
   - Check Grafana dashboard `MAS-Overview` for agent heartbeat status.
   - Inspect Kafka consumer lag on critical topics.
   - Validate PolicyGuard decision logs for triggering event.

2. **Containment.**
   - Ensure all trading agents transition to safe mode (no new intents).
   - Pause canary publishers to avoid test noise.
   - Notify stakeholders via ReporterAgent emergency channel.

3. **Diagnosis.**
   - Pull DLQ samples associated with correlation ID.
   - Review recent schema or policy changes in Git commit history.
   - Cross-reference risk metrics for threshold breaches.

4. **Remediation.**
   - Apply policy rollback or hotfix via control plane.
   - Replay halted intents in staging simulation before production resume.
   - Issue `system.resume.intent` only after approvals from Risk + Compliance leads.

5. **Post-Incident.**
   - File post-mortem within 48 hours.
   - Add regression test to `sim/trace_replay` suite.
   - Update SLO dashboards if thresholds adjusted.

## Verification
- Confirm no new `order.intent` after HALT until resume command.
- Ensure ReporterAgent publishes incident summary.
- Validate audit topic contains signed HALT entries.

