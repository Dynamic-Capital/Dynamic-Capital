# RUNBOOK — Prometheus exporter shutdown (`http: Server closed`)

## Overview

| Field                  | Details                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| **Primary service**    | Prometheus exporter serving metrics on `0.0.0.0:9122`                                          |
| **Typical alert**      | `PrometheusTargetMissing` (severity=page) for exporter job                                     |
| **Related dashboards** | Grafana → Observability → _Exporter Availability_                                              |
| **Customer impact**    | Metrics missing from dashboards and alerting gaps for any automation depending on the exporter |
| **Log signature**      | `{"error":"http: Server closed","msg":"prometheus server (0.0.0.0:9122) shut down"}`           |

When the exporter process exits or stops listening, Prometheus scrapes begin to
fail with `context deadline exceeded` or `connection refused`. The event payload
above usually appears in Loki/CloudWatch shortly after the final successful
scrape.

## Detection

- **Pager alert** – `PrometheusTargetMissing` or `PrometheusScrapeErrors` firing
  for more than two consecutive evaluation intervals.
- **Internal dashboards** – Red status badge on the exporter panel in the
  _Exporter Availability_ Grafana dashboard.
- **CLI confirmation** – On the exporter host, `ss -tulpn | grep 9122` returns
  no listener and `curl -sf http://localhost:9122/metrics` exits non-zero.

## Impact assessment

1. Check Grafana → Dashboards → _Exporter Availability_ for data gaps. Confirm
   whether downstream alerts (SLOs, autoscaling, billing) depend on this target.
2. Ask the on-call of the consuming team whether they see degraded functionality
   (e.g. missing business KPIs, stale automation triggers).
3. Document the time of the last successful scrape from Prometheus UI → _Status_
   → _Targets_ so we understand data loss duration.

## Triage checklist (first 5 minutes)

1. **Is the process still running?**
   - `systemctl status prometheus-exporter`
   - `ps -ef | grep prometheus-exporter`
2. **Did something else take the port?**
   - `sudo ss -tulpn | grep 9122`
   - `sudo lsof -i :9122`
3. **Was there a recent change?**
   - Check deploy channels/slack for releases in the last 30 minutes.
   - Review `/etc/prometheus-exporter/config.yml` (or Helm values) for edits.
4. **Is the host healthy?**
   - `dmesg | tail` for OOM events.
   - `kubectl describe pod <exporter-pod>` (if running in Kubernetes) for
     restart counts and probe failures.

Escalate immediately if triage indicates a widespread host failure (e.g. disk
full, node drain) affecting multiple exporters.

## Deep diagnostics

- **Service logs**: `journalctl -u prometheus-exporter --since "30 minutes ago"`
  or `kubectl logs <exporter-pod>` for stack traces and panic messages.
- **Binary healthcheck**: run `prometheus-exporter --version` and
  `prometheus-exporter --help` to ensure the binary is not corrupted.
- **Resource pressure**: inspect `top`, `free -m`, and `df -h`. Sustained memory
  pressure often manifests as `signal: killed` in logs.
- **Configuration validation**: if config is generated, re-run the templating
  command (for example `helm template` or `ansible-playbook --check`) to verify
  flags resolve to the expected values.

## Remediation steps

1. **Restart or redeploy the exporter.**
   - `sudo systemctl restart prometheus-exporter` for bare-metal/VM setups.
   - `kubectl rollout restart deploy/prometheus-exporter` for Kubernetes.
   - Wait 30 seconds, then confirm `curl -sf http://localhost:9122/metrics`.
2. **Clear port collisions.** If another process holds `9122`, stop it or update
   the exporter flag `--web.listen-address=:<new-port>` and align Prometheus
   scrape configs (`/etc/prometheus/prometheus.yml`).
3. **Fix crashing collectors.** For panics in custom collectors, roll back the
   latest change set or disable the offending module via configuration toggle.
4. **Restore host resources.** If the exporter was OOMKilled, increase memory
   limits/requests, clear noisy co-located workloads, or right-size the node.

## Verification

- Prometheus UI → _Status_ → _Targets_ shows the exporter as `State = up` with
  `Last scrape < 60s`.
- `curl -sf http://<exporter-host>:9122/metrics` succeeds from both the exporter
  host and the Prometheus server.
- Pager alerts auto-resolve within two evaluation cycles (usually ≤5 minutes).
- Grafana dashboards display fresh datapoints (no red gaps) after refresh.

## Post-incident follow-up

- Create an incident ticket capturing root cause, duration, and remediation.
- If the exporter crashed, capture the panic stack trace or core dump for the
  owning team to debug.
- Ensure alerts were meaningful; adjust alert thresholds or labels if noise was
  observed.
- Update runbooks/config management repositories with any new recovery steps.

## Preventative actions

- Add a readiness/liveness probe hitting `/metrics` or `/-/healthy` so the
  orchestrator can restart the container automatically.
- Instrument exporter restarts (`process_start_time_seconds`) and alert on
  abnormal churn.
- Implement pre-deploy validation that verifies the exporter can bind to the
  desired port (CI smoke test or healthcheck job).
- Add synthetic monitoring (e.g. Blackbox exporter) from another region to catch
  future regressions quickly.

## Escalation

Escalate to the Observability on-call if any of the following occur:

- More than three restart attempts in 15 minutes without a stable listener.
- Scrape downtime exceeds 15 minutes or impacts customer-facing SLIs.
- The exporter binary appears corrupted or fails integrity checks.

When escalating, provide:

- Links to Grafana panels showing gaps or red status.
- Relevant log excerpts (`journalctl`, `kubectl logs`, panic stack traces).
- Summary of recent deploys/config changes and which mitigation steps were
  attempted.
- Current hypothesis for root cause and any blockers to full recovery.
