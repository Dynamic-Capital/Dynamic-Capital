import { createDomainHealthHandler } from "../_shared/domain-health.ts";

const TABLES = [
  {
    name: "infrastructure_jobs",
    description: "Automation ledger coordinating AGI infrastructure tasks.",
  },
  {
    name: "node_configs",
    description: "Configuration manifest for orchestration nodes and keepers.",
  },
  {
    name: "mentor_feedback",
    description: "Mentor review loops that refine AGI skill performance.",
  },
];

const EDGE_FUNCTIONS = [
  {
    name: "ops-health",
    endpoint: "/functions/v1/ops-health",
    description: "Aggregates AGI operational telemetry for custodians.",
  },
  {
    name: "system-health",
    endpoint: "/functions/v1/system-health",
    description: "Publishes Dynamic Capital platform health snapshots.",
  },
  {
    name: "linkage-audit",
    endpoint: "/functions/v1/linkage-audit",
    description: "Verifies cross-domain handoffs between orchestration nodes.",
  },
  {
    name: "intent",
    endpoint: "/functions/v1/intent",
    description: "Captures AGI intent envelopes for routing and review.",
  },
];

export const handler = createDomainHealthHandler({
  domain: "dagi",
  tables: TABLES,
  dataset: {
    prefix: "dagi/",
    noun: "DAGI mirrored datasets",
    description: "OneDrive artefacts mirrored for AGI orchestration.",
    emptyStatus: "warning",
    emptyMessage:
      "No DAGI datasets detected in the mirror. Confirm orchestration jobs publish manifests.",
  },
  edgeFunctions: EDGE_FUNCTIONS,
  telemetry: [
    "Ops health logs",
    "Intent envelopes",
  ],
  notes: [
    "Run the wrappers bootstrap if the mirrored dataset manifest is unavailable.",
  ],
  description:
    "Dynamic AGI database connectivity: validates Supabase tables, mirrored datasets, and orchestration edge coverage.",
});

export default handler;
