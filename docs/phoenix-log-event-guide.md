# Phoenix Log Event Guide

## Summary

This guide explains how to interpret the Phoenix logger event emitted when an
endpoint finishes processing an HTTP request and how to turn the metadata into
actionable performance optimizations. The sample payload is taken from a real
log entry:

```json
{
  "event_message": "Sent 200 in 3079ms",
  "id": "3772f36f-e251-4ad4-b5e1-d28fb312662d",
  "metadata": [
    {
      "context": [
        {
          "application": "phoenix",
          "domain": ["elixir"],
          "file": "lib/phoenix/logger.ex",
          "function": "phoenix_endpoint_stop/4",
          "line": 231,
          "mfa": ["Elixir.Phoenix.Logger", "phoenix_endpoint_stop", "4"],
          "module": "Elixir.Phoenix.Logger",
          "time": 1759820853592775
        }
      ],
      "level": "info",
      "project": "qeejuomcapbdlhnjqjcc",
      "region": "ap-southeast-1",
      "request_id": "GGwjvVcrkAy1jdtWvA1I"
    }
  ],
  "timestamp": 1759820853592000
}
```

## Key Fields

| Field                       | Purpose                                                              | Optimization Trigger                                                                                                                    |
| --------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **`event_message`**         | Status string with HTTP code and total request duration.             | Investigate durations above ~2000 ms or any non-`200` status returned by a critical endpoint.                                           |
| **`timestamp`**             | Microseconds since the Unix epoch marking request completion.        | Correlate slow responses with deploys or infrastructure events to spot systemic regressions.                                            |
| **`id`**                    | Unique identifier for the log event.                                 | Use for deduplication when enriching logs in downstream observability tools.                                                            |
| **`metadata[].context[]`**  | Logger stack metadata (`application`, `module`, `function`, `line`). | Profile the function (`Phoenix.Logger.phoenix_endpoint_stop/4`) and any custom plugs when the same path repeatedly generates slow logs. |
| **`metadata[].level`**      | Log severity (`info`, `warn`, `error`).                              | Escalate and capture diagnostics whenever slow requests coincide with `warn`/`error` levels.                                            |
| **`metadata[].request_id`** | Trace identifier propagated across plugs and services.               | Replay the request across proxies, databases, and background jobs to uncover downstream blockers.                                       |
| **`metadata[].region`**     | Hosting region where the request completed.                          | Validate routing rules and CDN coverage if slow logs cluster in a particular geography.                                                 |

## Operational Guidance

1. Monitor the distribution of `event_message` durations. Create alerts for
   sustained periods where the p95 exceeds service-level objectives.
2. Use `request_id` to join the Phoenix log with reverse proxies, database logs,
   or analytics dashboards when tracing slow requests.
3. When latency spikes occur, capture a Phoenix LiveDashboard or telemetry dump
   to identify slow plugs, overloaded nodes, or downstream dependencies.
4. Confirm that instrumentation forwards `metadata[].context` so observability
   tools can surface the exact Elixir module and function for on-call engineers.
5. Document remediation steps after resolving latency outliers to build a
   playbook for future incidents.

## Optimization Playbook

Follow this checklist when a Phoenix endpoint starts emitting slow `Sent ... in`
events:

1. **Quantify the blast radius.** Use `request_id` to determine whether the
   slowdown is isolated to a single user journey or affects many concurrent
   sessions.
2. **Inspect upstream dependencies.** Align the `timestamp` with database,
   cache, or external API logs and look for matching latency spikes.
3. **Profile the endpoint.** Enable function-level tracing (e.g. `:telemetry`
   events or `:fprof`) for the module shown in `metadata[].context` to surface
   slow plugs or expensive computations.
4. **Tune Phoenix configuration.** Validate connection pool sizing, LiveView
   concurrency limits, and `endpoint` timeouts to ensure they match current
   traffic levels.
5. **Ship a regression guard.** Once the issue is resolved, add alerting or
   automated tests that assert the optimized response time to prevent future
   regressions.

## References

- [Phoenix Logger – Endpoint Instrumentation](https://hexdocs.pm/phoenix/Phoenix.Logger.html)
- [Telemetry Metrics for Phoenix Applications](https://hexdocs.pm/phoenix/telemetry.html)
