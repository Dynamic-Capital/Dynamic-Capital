# RUNBOOK — Prometheus exporter shutdown (`http: Server closed`)

## Event snapshot

When the metrics endpoint stops serving traffic, logs similar to the following
are emitted:

```json
{
  "event_message": "{\"error\":\"http: Server closed\",\"level\":\"error\",\"msg\":\"prometheus server (0.0.0.0:9122) shut down\",\"time\":\"2025-10-07T11:07:33Z\"}",
  "metadata": [
    {
      "host": "db-qeejuomcapbdlhnjqjcc",
      "level": "error",
      "msg": "prometheus server (0.0.0.0:9122) shut down",
      "error": "http: Server closed"
    }
  ]
}
```

The exporter binds to `0.0.0.0:9122`. When it terminates unexpectedly, Grafana
panels lose new samples and alert rules relying on the scrape target begin to
fail with `context deadline exceeded` or `connection refused`.

## Immediate triage

1. **Confirm the listener really stopped.**
   - `ss -tulpn | grep 9122` should return no rows if the service exited.
   - `curl -sf http://localhost:9122/metrics` will fail when the exporter is
     down.
2. **Check supervising service health.** If systemd manages the binary:
   - `sudo systemctl status prometheus-exporter`
   - `sudo journalctl -u prometheus-exporter --since "15 minutes ago"`
3. **Review recent changes.** A deploy or configuration reload in the last
   15 minutes often introduces invalid flags or port conflicts.

## Recovery steps

1. **Restart the service.**
   - `sudo systemctl restart prometheus-exporter`
   - Re-run `ss` and `curl` to confirm the listener returns and metrics stream.
2. **Validate scrape connectivity.** From the Prometheus server:
   - `curl -sf http://<exporter-host>:9122/metrics`
   - `promtool tsdb analyze` (optional) to ensure data is flowing post-restart.
3. **Check alert status.** Silence any firing alerts once the target is back up
   and the scrape status is `up == 1`.

## Common causes

- **Port collision.** Another process already binds `9122`, causing the exporter
  to exit during startup. Resolve by freeing the port or changing the exporter
  flag (`--web.listen-address`).
- **Uncaught panic inside custom collectors.** A bad instrumentation hook can
  panic during scrape, bringing down the HTTP server. Inspect exporter logs for
  stack traces and roll back the offending change.
- **Container orchestrator restart policy.** If running under Docker/Kubernetes,
  the pod/job might be terminating due to resource limits (OOMKilled) or
  readiness probe failures. Check `kubectl describe pod <name>` or `docker logs`
  for details.

## Preventative actions

- Add a healthcheck hitting `/metrics` (or `/-/healthy` when available) so the
  orchestrator restarts the container automatically.
- Wire the Prometheus target into an uptime probe (e.g. Blackbox exporter) to
  receive earlier notification when the endpoint drops.
- Guard custom collectors with error handling; surface partial failures via
  gauges instead of crashing the exporter.
- Track exporter restarts via metrics (`process_start_time_seconds`) and alert
  on abnormal churn.

## Escalation

Escalate to the Observability on-call if the exporter cannot remain stable after
three restart attempts or if scraping has been interrupted for longer than
15 minutes. Provide:

- Link to the Grafana dashboard panels missing data.
- Journalctl excerpts showing the shutdown reason.
- Summary of config changes or deploys executed prior to the outage.
