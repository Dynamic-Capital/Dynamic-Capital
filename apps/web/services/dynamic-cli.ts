export type DynamicCliReportFormat = "text" | "json" | "fine-tune";

export interface DynamicCliNode {
  key: string;
  title: string;
  description?: string;
  weight?: number;
  minimum_maturity?: number;
  target_maturity?: number;
  dependencies?: string[];
  practices?: string[];
  [key: string]: unknown;
}

export interface DynamicCliPulse {
  node: string;
  maturity: number;
  confidence?: number;
  enablement?: number;
  resilience?: number;
  momentum?: number;
  timestamp: string | number;
  tags?: string[];
  narrative?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DynamicCliScenario {
  history?: number;
  decay?: number;
  nodes: DynamicCliNode[];
  pulses: DynamicCliPulse[];
  [key: string]: unknown;
}

export interface DynamicCliRequestPayload {
  scenario: DynamicCliScenario;
  format: DynamicCliReportFormat;
  indent: number;
  fineTuneTags: string[];
  exportDataset: boolean;
}

export interface DynamicCliResponsePayload {
  report: string;
  reportFormat: DynamicCliReportFormat;
  dataset?: Record<string, unknown>;
}

export interface DynamicCliRequestOptions {
  adminToken?: string;
  adminInitData?: string;
}

export const DEFAULT_DYNAMIC_CLI_SCENARIO: DynamicCliScenario = {
  history: 12,
  decay: 0.1,
  nodes: [
    {
      key: "orchestration",
      title: "Orchestration",
      description: "Aligns delivery rhythms across product workstreams.",
      weight: 1.4,
      minimum_maturity: 0.45,
      target_maturity: 0.75,
      practices: ["standups", "retrospectives"],
    },
    {
      key: "automation",
      title: "Automation",
      description: "Captures the automation posture for platform capabilities.",
      weight: 1.2,
      minimum_maturity: 0.4,
      target_maturity: 0.7,
      dependencies: ["orchestration"],
      practices: ["runbooks", "observability"],
    },
    {
      key: "platform",
      title: "Platform",
      description: "Governs shared platform enablement and resilience.",
      weight: 1.0,
      minimum_maturity: 0.5,
      target_maturity: 0.8,
      practices: ["discovery", "enablement"],
    },
  ],
  pulses: [
    {
      node: "orchestration",
      maturity: 0.82,
      confidence: 0.74,
      enablement: 0.71,
      resilience: 0.69,
      momentum: 0.22,
      timestamp: "2024-04-01T09:00:00Z",
      tags: ["cadence", "governance"],
      narrative: "Operational rhythms producing consistent lift.",
    },
    {
      node: "orchestration",
      maturity: 0.78,
      confidence: 0.72,
      enablement: 0.7,
      resilience: 0.68,
      momentum: 0.18,
      timestamp: "2024-03-15T09:00:00Z",
      tags: ["cadence"],
    },
    {
      node: "automation",
      maturity: 0.46,
      confidence: 0.61,
      enablement: 0.5,
      resilience: 0.44,
      momentum: -0.12,
      timestamp: "2024-03-30T09:00:00Z",
      tags: ["tooling"],
      narrative: "Deployment pipeline is partially automated with gaps.",
    },
    {
      node: "automation",
      maturity: 0.41,
      confidence: 0.58,
      enablement: 0.47,
      resilience: 0.4,
      momentum: -0.18,
      timestamp: "2024-03-20T09:00:00Z",
      tags: ["tooling", "observability"],
    },
    {
      node: "platform",
      maturity: 0.6,
      confidence: 0.67,
      enablement: 0.55,
      resilience: 0.52,
      momentum: 0.08,
      timestamp: "2024-03-28T09:00:00Z",
      tags: ["enablement"],
    },
    {
      node: "platform",
      maturity: 0.58,
      confidence: 0.65,
      enablement: 0.52,
      resilience: 0.5,
      momentum: 0.05,
      timestamp: "2024-03-18T09:00:00Z",
      tags: ["enablement", "resilience"],
    },
  ],
};

export async function runDynamicCli(
  payload: DynamicCliRequestPayload,
  options: DynamicCliRequestOptions = {},
): Promise<DynamicCliResponsePayload> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (options.adminToken) {
    headers["x-admin-token"] = options.adminToken;
  }
  if (options.adminInitData) {
    headers["x-telegram-init-data"] = options.adminInitData;
  }

  const response = await fetch("/api/dynamic-cli", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = typeof (errorBody as { error?: unknown }).error === "string"
      ? (errorBody as { error: string }).error
      : `Dynamic CLI request failed with status ${response.status}.`;
    throw new Error(message);
  }

  const data = await response.json() as DynamicCliResponsePayload;
  return data;
}
