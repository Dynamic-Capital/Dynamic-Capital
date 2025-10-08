# API Watcher Context Cancelled Log Guide

## Summary

When the API service shuts down an internal watcher loop it emits an error log
with `event_message` containing a JSON payload similar to the sample below. The
`context canceled` error indicates the watcher lost its parent context—typically
because the process is shutting down or a deploy rolled the pod.

```json
{
  "event_message": "{\"component\":\"api\",\"error\":\"context canceled\",\"level\":\"error\",\"msg\":\"watcher is exiting\",\"time\":\"2025-10-07T11:07:33Z\"}",
  "id": "ea03f939-f7bd-402f-b935-833960e15b50",
  "metadata": [
    {
      "component": "api",
      "host": "db-qeejuomcapbdlhnjqjcc",
      "level": "error",
      "msg": "watcher is exiting",
      "error": "context canceled"
    }
  ],
  "timestamp": 1759835253000000
}
```

## Key Fields

| Field                  | Purpose                                             | Operational Signal                                                                                                              |
| ---------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **`metadata[].host`**  | Hostname where the watcher terminated.              | Correlate with deployment targets or nodes to detect rolling restarts or spotty hosts.                                          |
| **`metadata[].level`** | Log severity, typically `error` for abrupt exits.   | If severity remains `error` after a deploy finishes, escalate to SRE—normal drains should conclude once replacements are ready. |
| **`metadata[].msg`**   | Human readable message describing the watcher exit. | Confirms the log is tied to watcher shutdown rather than a runtime panic.                                                       |
| **`metadata[].error`** | Low-level error string (`context canceled`).        | Indicates the parent context ended; if the error differs (e.g., network timeout) pursue deeper investigation.                   |
| **`timestamp`**        | Microseconds since epoch when the exit happened.    | Align with deploy timelines and readiness probes to ensure watchers do not flap repeatedly.                                     |

## Operational Guidance

1. **Validate deployment activity.** Check the orchestrator (Kubernetes, Nomad,
   etc.) to confirm a rolling restart or deploy coincides with the timestamp.
   Context cancellations during healthy drains should mirror the deployment
   schedule.
2. **Inspect readiness and liveness probes.** Frequent cancellations without an
   active deploy often mean probes are failing and recycling pods before they
   stabilise.
3. **Review upstream dependencies.** If the cancellation coincides with outages
   in backing services (databases, queues), ensure graceful shutdown hooks
   propagate cancellation to watchers only after critical work is flushed.
4. **Confirm graceful shutdown duration.** Compare timestamps between watcher
   exit logs and subsequent `listening`/`ready` logs. Long gaps can indicate
   slow drains or blocking cleanup logic.
5. **Document remediation.** When unexpected cancellations occur, capture the
   cause and mitigation in the on-call notes to speed up future triage.

## Mitigation Playbook

1. **Correlate with deployments.** If the exit aligns with a planned rollout,
   downgrade alert severity and verify the new replica came online.
2. **Stabilise failing nodes.** For repeated cancellations on the same host,
   inspect node health (CPU pressure, network) and cordon or recycle as needed.
3. **Harden shutdown hooks.** Ensure watchers flush in-flight work and
   acknowledge cancellation quickly; update unit tests to cover cancellation
   paths where feasible.
4. **Add observability guards.** Alert when cancellation rates exceed a defined
   threshold in a given time window to distinguish normal rotations from
   instability.

## Running the API Watcher

Use the `scripts/run_api_watcher.py` helper to analyse recent watcher exit logs
and surface alerts when cancellations cluster too closely together.

```bash
python scripts/run_api_watcher.py --input watcher-events.json --min-gap-seconds 180
```

The script accepts newline-delimited JSON or a JSON array. It prints a tabular
summary by default, or JSON with `--format json`. Combine it with a log query to
investigate the latest `context canceled` events:

```bash
lq "component=api error='context canceled'" --limit 50 | python scripts/run_api_watcher.py --min-gap-seconds 240
```

## References

- [Go `context` package – Cancellation Propagation](https://pkg.go.dev/context#WithCancel)
- [Kubernetes Termination Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination)
