import { createDomainHealthHandler } from "../_shared/domain-health.ts";

const TABLES = [
  "routine_prompts",
  "analyst_insights",
  "user_analytics",
] as const;

const DATASET_PREFIX = "dai/";

export const handler = createDomainHealthHandler({
  domain: "dai",
  tables: TABLES,
  datasetPrefix: DATASET_PREFIX,
  description:
    "Dynamic AI domain Supabase health: verifies tables and mirrored datasets.",
});

export default handler;
