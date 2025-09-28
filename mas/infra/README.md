# Infrastructure Blueprint

This folder stores Helm charts, Kubernetes manifests, and ArgoCD application definitions for deploying the Dynamic MAS.

## Core Components

1. **Kafka Cluster.** 3-broker HA setup with schema registry; topics declared via IaC and mapped to the back-to-back interface matrix.
2. **Ray on Kubernetes.** Autoscaled Ray cluster with per-agent deployments using Ray actors (or microservices when required).
3. **Postgres + Redis.** Managed services with read replicas, PITR enabled, connection pooling via PgBouncer/Redis Sentinel.
4. **MinIO/S3.** Artifact storage for models, audits, and logs with lifecycle policies.
5. **Observability Stack.** OpenTelemetry Collector, Prometheus, Grafana, Loki/ELK, Alertmanager; dashboards pulled from `ops/`.
6. **Security Mesh.** Istio with SPIFFE/SPIRE for workload identity, Vault agent injectors for secrets, OPA sidecars for policy enforcement.

## Delivery Pipeline

- GitOps via ArgoCD applications per environment (dev, staging, prod).
- Canary strategy encoded with Argo Rollouts; promotion gates reference MAS SLO dashboards.
- Policy bundles packaged as OCI artifacts and distributed with Helm hooks + PolicyGuard sync jobs.

## Operational Hooks

- `k8s/` (pending) — manifests for agent deployments, service accounts, NetworkPolicies, PodDisruptionBudgets.
- `argo/` — continuous delivery pipelines, kill-switch toggles, synthetic traffic publishers.
- `helm/` — shared components (Kafka topics, schema registry, tracing collectors, policy-sync jobs).

