import { createDomainHealthHandler } from "../_shared/domain-health.ts";

const TABLES = [
  {
    name: "routine_prompts",
    description: "Daily allocator prompts curated by DAI pipelines.",
  },
  {
    name: "analyst_insights",
    description: "Human + AI analyst narratives for research recall.",
  },
  {
    name: "user_analytics",
    description: "Engagement telemetry captured by DAI surfaces.",
  },
];

const EDGE_FUNCTIONS = [
  {
    name: "analysis-ingest",
    endpoint: "/functions/v1/analysis-ingest",
    description: "Normalises research payloads before AI evaluation.",
  },
  {
    name: "analytics-collector",
    endpoint: "/functions/v1/analytics-collector",
    description: "Persists engagement analytics for dashboards.",
  },
  {
    name: "lorentzian-eval",
    endpoint: "/functions/v1/lorentzian-eval",
    description: "Scores hedge hypotheses and records audits.",
  },
  {
    name: "web-app-analytics",
    endpoint: "/functions/v1/web-app-analytics",
    description: "Streams product telemetry to Supabase.",
  },
];

export const handler = createDomainHealthHandler({
  domain: "dai",
  tables: TABLES,
  dataset: {
    prefix: "dai/",
    noun: "DAI mirrored datasets",
    description: "OneDrive mirror objects routed through the S3 wrapper.",
    emptyStatus: "error",
    emptyMessage:
      "No mirrored DAI datasets detected. Confirm the OneDrive sync is configured.",
  },
  edgeFunctions: EDGE_FUNCTIONS,
  telemetry: [
    "Edge Function analytics events",
    "Supabase table retention policies",
  ],
  notes: [
    "Ensure migrations defining DAI tables are applied before invoking this endpoint.",
  ],
  description:
    "Dynamic AI database connectivity: verifies Supabase tables, mirrored datasets, and Edge Function coverage.",
});

export default handler;
