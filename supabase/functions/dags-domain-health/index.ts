import { createDomainHealthHandler } from "../_shared/domain-health.ts";

const TABLES = [
  "tasks",
  "task_steps",
  "approvals",
  "artifacts",
  "events",
  "limits",
  "audit_logs",
] as const;

const DATASET_PREFIX = "dags/";

export const handler = createDomainHealthHandler({
  domain: "dags",
  tables: TABLES,
  datasetPrefix: DATASET_PREFIX,
  description:
    "Dynamic AGS domain Supabase health: verifies governance tables and mirror backlog.",
  mirror: {
    emptyMessage:
      "No mirrored objects discovered. DAGS OneDrive mirror remains a documented follow-up.",
    healthyMessage:
      "Mirrored objects detected. Update playbooks to reflect the live OneDrive integration.",
  },
});

export default handler;
