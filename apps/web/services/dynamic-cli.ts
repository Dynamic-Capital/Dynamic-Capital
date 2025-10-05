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

export interface DynamicCliScenarioSummary {
  nodeCount: number;
  pulseCount: number;
  mostRecentPulse: string | null;
}

export interface DynamicCliScenarioDiagnostics {
  valid: boolean;
  errors: string[];
  warnings: string[];
  scenario?: DynamicCliScenario;
  summary: DynamicCliScenarioSummary;
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

const NUMERIC_PULSE_FIELDS: Array<keyof DynamicCliPulse> = [
  "maturity",
  "confidence",
  "enablement",
  "resilience",
  "momentum",
];

export function validateDynamicCliScenario(
  input: unknown,
): DynamicCliScenarioDiagnostics {
  const errors: string[] = [];
  const warnings: string[] = [];
  const summary: DynamicCliScenarioSummary = {
    nodeCount: 0,
    pulseCount: 0,
    mostRecentPulse: null,
  };

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    errors.push(
      "Scenario payload must be a JSON object with nodes and pulses.",
    );
    return { valid: false, errors, warnings, summary };
  }

  const scenario = input as DynamicCliScenario;
  const nodesInput = (scenario as { nodes?: unknown }).nodes;
  const pulsesInput = (scenario as { pulses?: unknown }).pulses;

  if (!Array.isArray(nodesInput)) {
    errors.push("Scenario must include a nodes array.");
  } else {
    summary.nodeCount = nodesInput.length;
    const seenNodeKeys = new Set<string>();

    nodesInput.forEach((node, index) => {
      if (!node || typeof node !== "object" || Array.isArray(node)) {
        errors.push(`Node at position ${index + 1} must be an object.`);
        return;
      }

      const nodeRecord = node as Record<string, unknown>;
      const nodeKey = nodeRecord.key;

      if (typeof nodeKey !== "string" || !nodeKey.trim()) {
        errors.push(`Node at position ${index + 1} requires a string key.`);
        return;
      }

      if (seenNodeKeys.has(nodeKey)) {
        errors.push(`Node key "${nodeKey}" appears multiple times.`);
      } else {
        seenNodeKeys.add(nodeKey);
      }

      const numericNodeFields: Array<keyof DynamicCliNode> = [
        "weight",
        "minimum_maturity",
        "target_maturity",
      ];
      numericNodeFields.forEach((field) => {
        const value = nodeRecord[field];
        if (value !== undefined && typeof value !== "number") {
          warnings.push(`Node "${nodeKey}" ${field} should be a number.`);
        }
      });

      if (
        "practices" in nodeRecord &&
        nodeRecord.practices !== undefined &&
        !Array.isArray(nodeRecord.practices)
      ) {
        warnings.push(`Node "${nodeKey}" practices should be an array.`);
      }

      if (
        "dependencies" in nodeRecord &&
        nodeRecord.dependencies !== undefined &&
        !Array.isArray(nodeRecord.dependencies)
      ) {
        warnings.push(`Node "${nodeKey}" dependencies should be an array.`);
      }
    });

    if (seenNodeKeys.size === 0) {
      warnings.push("Scenario includes no nodes.");
    }
  }

  if (!Array.isArray(pulsesInput)) {
    errors.push("Scenario must include a pulses array.");
  } else {
    summary.pulseCount = pulsesInput.length;
    const validNodeKeys = new Set(
      Array.isArray(nodesInput)
        ? (nodesInput
          .map((node) =>
            node && typeof node === "object" && !Array.isArray(node)
              ? (node as Record<string, unknown>).key
              : undefined
          )
          .filter(
            (key): key is string =>
              typeof key === "string" && key.trim().length > 0,
          ))
        : [],
    );

    let latestPulseTimestamp = Number.NEGATIVE_INFINITY;

    pulsesInput.forEach((pulse, index) => {
      if (!pulse || typeof pulse !== "object" || Array.isArray(pulse)) {
        errors.push(`Pulse at position ${index + 1} must be an object.`);
        return;
      }

      const pulseRecord = pulse as Record<string, unknown>;
      const nodeKey = pulseRecord.node;

      if (typeof nodeKey !== "string" || !nodeKey.trim()) {
        errors.push(`Pulse at position ${index + 1} requires a node key.`);
        return;
      }

      if (!validNodeKeys.has(nodeKey)) {
        errors.push(`Pulse ${index + 1} references unknown node "${nodeKey}".`);
      }

      NUMERIC_PULSE_FIELDS.forEach((field) => {
        const value = pulseRecord[field];
        if (value === undefined) {
          return;
        }
        if (typeof value !== "number" || Number.isNaN(value)) {
          errors.push(`Pulse "${nodeKey}" ${field} must be a number.`);
          return;
        }
        if (field === "maturity" && (value < 0 || value > 1)) {
          warnings.push(
            `Pulse "${nodeKey}" maturity should be between 0 and 1.`,
          );
        }
      });

      const timestamp = pulseRecord.timestamp;
      if (typeof timestamp !== "string" && typeof timestamp !== "number") {
        errors.push(`Pulse "${nodeKey}" timestamp must be a string or number.`);
      } else {
        const parsedTimestamp = new Date(timestamp).getTime();
        if (Number.isNaN(parsedTimestamp)) {
          warnings.push(`Pulse "${nodeKey}" timestamp could not be parsed.`);
        } else if (parsedTimestamp > latestPulseTimestamp) {
          latestPulseTimestamp = parsedTimestamp;
          summary.mostRecentPulse = new Date(parsedTimestamp).toISOString();
        }
      }

      if (
        "tags" in pulseRecord &&
        pulseRecord.tags !== undefined &&
        !Array.isArray(pulseRecord.tags)
      ) {
        warnings.push(`Pulse "${nodeKey}" tags should be an array.`);
      }

      if (
        "metadata" in pulseRecord &&
        pulseRecord.metadata !== undefined &&
        (typeof pulseRecord.metadata !== "object" ||
          pulseRecord.metadata === null ||
          Array.isArray(pulseRecord.metadata))
      ) {
        warnings.push(`Pulse "${nodeKey}" metadata should be an object.`);
      }
    });

    if (summary.pulseCount === 0) {
      warnings.push("Scenario includes no pulses.");
    }
  }

  if (
    "history" in scenario && scenario.history !== undefined &&
    typeof scenario.history !== "number"
  ) {
    warnings.push("Scenario history should be a number representing months.");
  }

  if (
    "decay" in scenario && scenario.decay !== undefined &&
    typeof scenario.decay !== "number"
  ) {
    warnings.push("Scenario decay should be a numeric value.");
  }

  const valid = errors.length === 0;
  return {
    valid,
    errors,
    warnings,
    scenario: valid ? scenario : undefined,
    summary,
  };
}

export async function runDynamicCli(
  payload: DynamicCliRequestPayload,
  options: DynamicCliRequestOptions = {},
): Promise<DynamicCliResponsePayload> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (options.adminToken) {
    headers["Authorization"] = `Bearer ${options.adminToken}`;
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
