# Web Observability SLOs & Alerts

This document defines the production service level objectives (SLOs) for the
Dynamic Capital web application and the alerting policies wired to the new
Prometheus metrics exporter exposed at `/api/metrics`.

## Key Metrics

The OpenTelemetry instrumentation publishes the following Prometheus metrics:

- `http_requests_total` – Counter tracking every API invocation grouped by
  `method`, `route`, and `status`.
- `http_request_errors_total` – Counter for requests that threw exceptions or
  returned 5xx status codes.
- `http_request_duration_seconds` – Histogram describing server processing time
  in seconds with buckets: 50ms, 100ms, 250ms, 500ms, 1s, 2s, 5s, 10s.
- `http_requests_in_flight` – Up/down counter indicating concurrent API work.

These metrics serve the SLO calculations below and are exported via
`https://<domain>/api/metrics` for Prometheus scraping.

## SLO Targets

| Objective        | Target                                     | Measurement                                                                |
| ---------------- | ------------------------------------------ | -------------------------------------------------------------------------- |
| API availability | 99.9% success over a rolling 30-day window | `1 - (sum(http_request_errors_total) / sum(http_requests_total))`          |
| Latency          | P95 ≤ 500ms over a rolling 7-day window    | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))` |
| Saturation       | In-flight requests ≤ 50 across the fleet   | `max_over_time(http_requests_in_flight[5m])`                               |

## Alerting Rules

The following PromQL snippets can be embedded in a `PrometheusRule` CRD or the
equivalent alerting configuration:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dynamic-capital-web
  namespace: monitoring
spec:
  groups:
    - name: web-slo
      rules:
        - alert: WebAvailabilityBudgetBurn
          expr: |
            sum(rate(http_request_errors_total[5m]))
              /
            sum(rate(http_requests_total[5m]))
              > 0.001
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "Dynamic Capital API availability is breaching the 99.9% SLO"
            runbook: "https://github.com/dynamic-capital/docs/blob/main/observability-slos.md"

        - alert: WebLatencyP95High
          expr: |
            histogram_quantile(
              0.95,
              sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route)
            ) > 0.5
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Dynamic Capital API latency P95 above 500ms"

        - alert: WebSaturationHigh
          expr: max_over_time(http_requests_in_flight[5m]) > 50
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Dynamic Capital API concurrency above safe threshold"
```

Adjust thresholds per environment size. Each alert links back to this document
as the runbook for remediation guidance.
