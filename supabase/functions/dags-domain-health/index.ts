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
      "OneDrive mirror for governance artefacts synced via the shared S3 wrapper.",
    emptyStatus: "error",
    emptyMessage:
      "No DAGS mirror objects present. Investigate the OneDrive sync for governance datasets.",
    healthyMessage:
      "Mirrored DAGS artefacts detected via the shared OneDrive manifest.",
  },
  edgeFunctions: EDGE_FUNCTIONS,
  telemetry: [
    "Database triggers for audit tables",
    "Structured governance event logs",
  ],
  notes: [
    "Governance artefacts replicate to the OneDrive mirror alongside Supabase Storage.",
    "Health payload includes a sample manifest object to smoke test mirror connectivity.",
  ],
  description:
    "Dynamic AGS database connectivity: validates governance tables and ensures the OneDrive mirror is serving artefacts with a smoke test sample.",
});

export default handler;
