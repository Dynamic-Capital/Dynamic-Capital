import { optionalEnvVar } from "@/utils/env.ts";

export type DynamicApiMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS";

export interface DynamicApiSchema {
  version: string;
  checksum: string;
}

export interface DynamicApiMonitor {
  errorRate: number;
  errorBudget: number;
  p95LatencyMs: number;
  latencySloMs: number;
  uptime: number;
  uptimeSlo: number;
}

export type DynamicApiAlertSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export interface DynamicApiAlert {
  endpoint: string;
  severity: DynamicApiAlertSeverity;
  title: string;
  raisedAt: string;
}

export type DynamicApiRiskIssue =
  | "missing_schema"
  | "missing_monitor"
  | "status_alert"
  | "error_budget_exceeded"
  | "latency_slo_breach"
  | "uptime_slo_breach"
  | "critical_alert";

export interface DynamicApiRisk {
  endpoint: string;
  issue: DynamicApiRiskIssue;
  details: string;
}

export interface DynamicApiEndpoint {
  name: string;
  method: DynamicApiMethod;
  path: string;
  owner: string;
  status: string;
  priority: number;
  version?: string;
  tier?: string;
  documentation?: string;
  description?: string;
  consumers?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  schema?: DynamicApiSchema;
  monitor?: DynamicApiMonitor;
}

export interface DynamicApiResponse {
  status: "ok";
  generatedAt: string;
  metadata: {
    version: number;
    repository: string;
  };
  theme: string;
  summary: string;
  endpoints: DynamicApiEndpoint[];
  alerts: DynamicApiAlert[];
  risks: DynamicApiRisk[];
}

export interface DynamicApiRouteDescriptor {
  method: DynamicApiMethod;
  path: string;
  description: string;
}

export const DYNAMIC_API_CACHE_TAG = "dynamic-api" as const;

const DEFAULT_DYNAMIC_API_CACHE_TTL_SECONDS = 120;

function resolveCacheTtl(raw: string | undefined): number {
  if (!raw) return DEFAULT_DYNAMIC_API_CACHE_TTL_SECONDS;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_DYNAMIC_API_CACHE_TTL_SECONDS;
  }

  return parsed;
}

export const DYNAMIC_API_CACHE_TTL_SECONDS = resolveCacheTtl(
  optionalEnvVar("DYNAMIC_API_CACHE_TTL_SECONDS"),
);

export const DYNAMIC_API_CACHE_CONTROL_HEADER =
  `public, max-age=0, s-maxage=${DYNAMIC_API_CACHE_TTL_SECONDS}, stale-while-revalidate=600` as const;

const RESPONSE_METADATA = Object.freeze({
  version: 1,
  repository: "Dynamic Capital",
});

const DYNAMIC_API_THEME = "API operations readiness" as const;

export const DYNAMIC_API_ENDPOINT: DynamicApiRouteDescriptor = Object.freeze({
  method: "GET",
  path: "/api/dynamic-api",
  description:
    "Operational state of Dynamic Capital REST endpoints and monitoring snapshots.",
});

type EndpointDefinition = {
  endpoint: Omit<DynamicApiEndpoint, "schema" | "monitor">;
  schema?: DynamicApiSchema;
  monitor?: DynamicApiMonitor;
};

const STATIC_ENDPOINTS = [
  {
    endpoint: {
      name: "trading-api",
      method: "POST",
      path: "/v1/trades",
      owner: "Execution",
      status: "operational",
      priority: 10,
      version: "2024-05-01",
      tier: "critical",
      documentation: "https://docs.dynamic.capital/apis/trading",
      description: "Primary trade execution endpoint",
      consumers: ["mobile", "partners"],
      tags: ["core", "ton"],
      metadata: {
        cluster: "ton-mainnet",
        region: "gva-1",
      },
    },
    schema: {
      version: "2024-05-01",
      checksum: "trading-api-20240501",
    },
    monitor: {
      errorRate: 0.004,
      errorBudget: 0.01,
      p95LatencyMs: 120,
      latencySloMs: 200,
      uptime: 99.95,
      uptimeSlo: 99.9,
    },
  },
  {
    endpoint: {
      name: "orders-api",
      method: "POST",
      path: "/v1/orders",
      owner: "Execution",
      status: "operational",
      priority: 8,
      version: "2024-05-10",
      tier: "critical",
      documentation: "https://docs.dynamic.capital/apis/orders",
      description: "Order management and status updates",
      consumers: ["internal", "partners"],
      tags: ["core"],
      metadata: {
        cluster: "aws-eu-central-1",
        region: "eu-central-1",
      },
    },
    schema: {
      version: "2024-05-10",
      checksum: "orders-api-20240510",
    },
    monitor: {
      errorRate: 0.006,
      errorBudget: 0.015,
      p95LatencyMs: 160,
      latencySloMs: 250,
      uptime: 99.92,
      uptimeSlo: 99.8,
    },
  },
  {
    endpoint: {
      name: "reporting-api",
      method: "GET",
      path: "/v1/reports",
      owner: "Analytics",
      status: "degraded",
      priority: 6,
      version: "2024-04-20",
      tier: "standard",
      documentation: "https://docs.dynamic.capital/apis/reporting",
      description: "Aggregated reporting endpoint",
      consumers: ["ops", "analytics"],
      tags: ["analytics"],
      metadata: {
        cluster: "gcp-europe-west4",
        region: "europe-west4",
      },
    },
    schema: {
      version: "2024-04-20",
      checksum: "reporting-api-20240420",
    },
    monitor: {
      errorRate: 0.08,
      errorBudget: 0.02,
      p95LatencyMs: 450,
      latencySloMs: 300,
      uptime: 99.1,
      uptimeSlo: 99.5,
    },
  },
] as const satisfies readonly EndpointDefinition[];

const STATIC_ALERTS = [
  {
    endpoint: "reporting-api",
    severity: "critical",
    title: "Latency SLO breach detected in analytics cluster",
    raisedAt: "2025-01-15T08:30:00Z",
  },
  {
    endpoint: "orders-api",
    severity: "medium",
    title: "Retry queue growth observed",
    raisedAt: "2025-01-15T09:15:00Z",
  },
] as const satisfies readonly DynamicApiAlert[];

function cloneEndpoint(definition: EndpointDefinition): DynamicApiEndpoint {
  const { endpoint, schema, monitor } = definition;

  return {
    ...endpoint,
    consumers: endpoint.consumers ? [...endpoint.consumers] : undefined,
    tags: endpoint.tags ? [...endpoint.tags] : undefined,
    metadata: endpoint.metadata ? { ...endpoint.metadata } : undefined,
    schema: schema ? { ...schema } : undefined,
    monitor: monitor ? { ...monitor } : undefined,
  } satisfies DynamicApiEndpoint;
}

function isCriticalSeverity(severity: string): boolean {
  const normalized = severity.trim().toLowerCase();
  return normalized === "critical" || normalized === "high";
}

function detectRisks(
  endpoints: DynamicApiEndpoint[],
  alerts: DynamicApiAlert[],
): DynamicApiRisk[] {
  const risks: DynamicApiRisk[] = [];

  const statusAlerts = new Set(["degraded", "outage", "offline"]);

  for (const endpoint of endpoints) {
    if (!endpoint.schema) {
      risks.push({
        endpoint: endpoint.name,
        issue: "missing_schema",
        details: "Schema metadata not registered",
      });
    }

    const monitor = endpoint.monitor;
    if (!monitor) {
      risks.push({
        endpoint: endpoint.name,
        issue: "missing_monitor",
        details: "Monitoring snapshot not registered",
      });
    }

    const status = endpoint.status.trim().toLowerCase();
    if (statusAlerts.has(status)) {
      risks.push({
        endpoint: endpoint.name,
        issue: "status_alert",
        details: `Endpoint reported status '${endpoint.status}'`,
      });
    }

    if (!monitor) {
      continue;
    }

    if (monitor.errorRate > monitor.errorBudget) {
      risks.push({
        endpoint: endpoint.name,
        issue: "error_budget_exceeded",
        details: `Error rate ${monitor.errorRate.toFixed(4)} exceeds budget ${
          monitor.errorBudget.toFixed(4)
        }`,
      });
    }

    if (monitor.p95LatencyMs > monitor.latencySloMs) {
      risks.push({
        endpoint: endpoint.name,
        issue: "latency_slo_breach",
        details:
          `p95 latency ${monitor.p95LatencyMs}ms exceeds SLO ${monitor.latencySloMs}ms`,
      });
    }

    if (monitor.uptimeSlo > 0 && monitor.uptime < monitor.uptimeSlo) {
      risks.push({
        endpoint: endpoint.name,
        issue: "uptime_slo_breach",
        details: `Uptime ${monitor.uptime.toFixed(2)}% below target ${
          monitor.uptimeSlo.toFixed(2)
        }%`,
      });
    }
  }

  for (const alert of alerts) {
    if (isCriticalSeverity(alert.severity)) {
      risks.push({
        endpoint: alert.endpoint,
        issue: "critical_alert",
        details: alert.title,
      });
    }
  }

  return risks;
}

function summarise(
  endpoints: DynamicApiEndpoint[],
  alerts: DynamicApiAlert[],
  risks: DynamicApiRisk[],
): string {
  const parts: string[] = [];
  parts.push(`${endpoints.length} endpoints`);

  const underWatch =
    endpoints.filter((endpoint) =>
      endpoint.status.trim().toLowerCase() !== "operational"
    ).length;
  if (underWatch > 0) {
    parts.push(`${underWatch} under watch`);
  }

  const criticalAlerts =
    alerts.filter((alert) => isCriticalSeverity(alert.severity)).length;
  if (criticalAlerts > 0) {
    parts.push(`${criticalAlerts} critical alerts`);
  }

  if (risks.length > 0) {
    parts.push(`${risks.length} risk signals`);
  }

  return parts.join(", ");
}

export function buildDynamicApiResponse(
  now: Date = new Date(),
): DynamicApiResponse {
  const endpoints = STATIC_ENDPOINTS
    .map(cloneEndpoint)
    .sort((left, right) => {
      if (left.priority === right.priority) {
        return left.name.localeCompare(right.name);
      }
      return right.priority - left.priority;
    });

  const alerts = STATIC_ALERTS.map((alert) => ({ ...alert }));
  const risks = detectRisks(endpoints, alerts);
  const summary = summarise(endpoints, alerts, risks);

  return {
    status: "ok",
    generatedAt: now.toISOString(),
    metadata: { ...RESPONSE_METADATA },
    theme: DYNAMIC_API_THEME,
    summary,
    endpoints,
    alerts,
    risks,
  } satisfies DynamicApiResponse;
}
