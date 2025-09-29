import { createDomainHealthHandler } from "../_shared/domain-health.ts";

const TABLES = [
  {
    name: "tasks",
    description: "Governance tasks queued for AGS review.",
  },
  {
    name: "task_steps",
    description: "Ordered task execution steps and dependencies.",
  },
  {
    name: "approvals",
    description: "Approval ledger capturing reviewer sign-off.",
  },
  {
    name: "artifacts",
    description: "Artefacts produced during governance workflows.",
  },
  {
    name: "events",
    description: "Event stream documenting governance activity.",
  },
  {
    name: "limits",
    description: "Guardrails and policy limits enforced by AGS.",
  },
  {
    name: "audit_logs",
    description: "Structured audits for governance trail replay.",
  },
];

const EDGE_FUNCTIONS = [
  {
    name: "ops-health",
    endpoint: "/functions/v1/ops-health",
    description: "Shared health surface referenced by AGS runbooks.",
  },
];

export const handler = createDomainHealthHandler({
  domain: "dags",
  tables: TABLES,
  dataset: {
    prefix: "dags/",
    noun: "DAGS mirrored datasets",
    description:
      "OneDrive mirror for governance artefacts (documented follow-up).",
    optional: true,
    emptyStatus: "warning",
    emptyMessage:
      "No DAGS mirror objects present. The governance playbook tracks this as a pending integration.",
    healthyMessage:
      "Mirrored DAGS artefacts detected. Update governance SOPs to treat the OneDrive share as authoritative.",
  },
  edgeFunctions: EDGE_FUNCTIONS,
  telemetry: [
    "Database triggers for audit tables",
    "Structured governance event logs",
  ],
  notes: [
    "OneDrive mirroring remains optional until the AGS follow-up is complete.",
  ],
  description:
    "Dynamic AGS database connectivity: validates governance tables and documents the pending mirror integration.",
});

export default handler;
