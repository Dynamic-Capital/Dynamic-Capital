import { corsHeaders } from "./http.ts";

export type HealthStatus = "healthy" | "warning" | "error";

export interface HealthCheck {
  component: string;
  status: HealthStatus;
  message?: string;
  response_time: number;
  metadata?: Record<string, unknown>;
  last_checked: string;
}

export interface HealthReport {
  overall_status: HealthStatus;
  total_checks: number;
  healthy_checks: number;
  warning_checks: number;
  error_checks: number;
  total_response_time: number;
  checks: HealthCheck[];
  timestamp: string;
  system_info?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

function methodList(methods: string[]): string {
  return methods
    .map((method) => method.toUpperCase())
    .join(",");
}

export function guardHealthRequest(
  req: Request,
  allowedMethods: string[] = ["GET"],
): Response | null {
  const methodsHeader = methodList([...allowedMethods, "OPTIONS"]);
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        ...corsHeaders(req, methodsHeader),
      },
    });
  }
  if (!allowedMethods.includes(req.method)) {
    const body = JSON.stringify({ ok: false, error: "Method Not Allowed" });
    return new Response(body, {
      status: 405,
      headers: {
        "content-type": "application/json; charset=utf-8",
        ...corsHeaders(req, methodsHeader),
        "allow": methodList(allowedMethods),
      },
    });
  }
  return null;
}

export async function measureHealthCheck(
  component: string,
  runner: () => Promise<
    & Partial<Omit<HealthCheck, "component" | "response_time" | "last_checked">>
    & { status?: HealthStatus; response_time?: number }
  >,
): Promise<HealthCheck> {
  const start = performance.now();
  try {
    const result = await runner();
    const responseTime = result.response_time ??
      Math.round(performance.now() - start);
    return {
      component,
      status: result.status ?? "healthy",
      message: result.message,
      metadata: result.metadata,
      response_time: responseTime,
      last_checked: new Date().toISOString(),
    };
  } catch (error) {
    const responseTime = Math.round(performance.now() - start);
    return {
      component,
      status: "error",
      message: error instanceof Error ? error.message : String(error),
      response_time: responseTime,
      last_checked: new Date().toISOString(),
    };
  }
}

export function buildHealthReport(
  checks: HealthCheck[],
  options: {
    systemInfo?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  } = {},
): HealthReport {
  const totalChecks = checks.length;
  const healthyChecks =
    checks.filter((check) => check.status === "healthy").length;
  const warningChecks =
    checks.filter((check) => check.status === "warning").length;
  const errorChecks = checks.filter((check) => check.status === "error").length;
  const totalResponseTime = checks.reduce(
    (sum, check) =>
      sum + (Number.isFinite(check.response_time) ? check.response_time : 0),
    0,
  );

  const overall_status: HealthStatus = errorChecks > 0
    ? "error"
    : warningChecks > 0
    ? "warning"
    : "healthy";

  return {
    overall_status,
    total_checks: totalChecks,
    healthy_checks: healthyChecks,
    warning_checks: warningChecks,
    error_checks: errorChecks,
    total_response_time: totalResponseTime,
    checks,
    timestamp: new Date().toISOString(),
    ...(options.systemInfo ? { system_info: options.systemInfo } : {}),
    ...(options.metadata ? { metadata: options.metadata } : {}),
  };
}

export function healthResponse(
  report: HealthReport,
  req: Request,
  allowedMethods: string[] = ["GET"],
): Response {
  const methodsHeader = methodList([...allowedMethods, "OPTIONS"]);
  const status = report.overall_status === "error" ? 503 : 200;
  return new Response(JSON.stringify(report, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(req, methodsHeader),
    },
  });
}
