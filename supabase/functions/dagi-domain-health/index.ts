import { createDomainHealthHandler } from "../_shared/domain-health.ts";

const TABLES = [
  "infrastructure_jobs",
  "node_configs",
  "mentor_feedback",
] as const;

const DATASET_PREFIX = "dagi/";

export const handler = createDomainHealthHandler({
  domain: "dagi",
  tables: TABLES,
  datasetPrefix: DATASET_PREFIX,
  description:
    "Dynamic AGI domain Supabase health: verifies tables and mirrored datasets.",
});

export default handler;
