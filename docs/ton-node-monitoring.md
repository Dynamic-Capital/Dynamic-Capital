# TON Node Monitoring Playbook

Define the telemetry sources, dashboards, and alert routes that protect TON node uptime.

## Metrics sources

- Prometheus scrape target: `ton-node:9100`
- Exported metrics: block height, peer count, disk usage, CPU load, memory usage
- Log aggregation: Loki (`labels: {job="ton-node"}`)

## Dashboards

| Dashboard | Location | Purpose |
| --- | --- | --- |
| TON Node Overview | Grafana → `TON/Node` | Track block sync status and resource utilisation |
| Storage Health | Grafana → `TON/Storage` | Monitor disk, IOPS, and snapshot cadence |

## Alerting rules

| Rule | Threshold | Action |
| --- | --- | --- |
| `ton_node_block_lag` | Lag > 50 blocks for 5m | Page on-call (Ops) |
| `ton_node_disk_usage` | Disk utilisation ≥ 80% for 10m | Create Jira ticket + Slack notification |
| `ton_node_peer_count_low` | Peers < 5 for 15m | Investigate connectivity, rotate endpoints |

Document acknowledgements and follow-ups in the runbook after each alert.
