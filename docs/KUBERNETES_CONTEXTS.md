# Kubernetes Contexts

This reference captures the currently configured Kubernetes context for the Dynamic Capital tooling.

## Current Context

- **Name:** `dynamic-cluster`
- **Status:** Reachable
- **Cluster:** `kind-dynamic-cluster`
- **Server:** `https://127.0.0.1:51505`
- **User:** `kind-dynamic-cluster`

## Workload Summary

| Resource     | Count |
|--------------|------:|
| Pods         | 0 |
| Deployments  | 0 |

## Notes

- Update this document whenever the active Kubernetes context changes or new workloads are deployed.
- Use `kubectl config get-contexts` to list all configured contexts and `kubectl config use-context <name>` to switch between them.
