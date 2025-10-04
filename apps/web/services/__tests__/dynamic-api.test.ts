import { describe, expect, it } from "vitest";

import { buildDynamicApiResponse } from "../dynamic-api";

describe("dynamic API service", () => {
  it("summarises endpoint health and risks", () => {
    const now = new Date("2025-09-25T05:00:00Z");
    const response = buildDynamicApiResponse(now);

    expect(response.status).toBe("ok");
    expect(response.generatedAt).toBe(now.toISOString());
    expect(response.theme).toBe("API operations readiness");
    expect(response.endpoints.length).toBeGreaterThanOrEqual(3);
    expect(response.summary).toContain("endpoints");

    const trading = response.endpoints.find((endpoint) =>
      endpoint.name === "trading-api"
    );
    expect(trading?.monitor?.errorRate).toBeCloseTo(0.004, 6);

    const reporting = response.endpoints.find((endpoint) =>
      endpoint.name === "reporting-api"
    );
    expect(reporting?.status).toBe("degraded");

    expect(
      response.risks.some((risk) =>
        risk.endpoint === "reporting-api" &&
        risk.issue === "latency_slo_breach"
      ),
    ).toBe(true);
    expect(
      response.alerts.some((alert) => alert.severity === "critical"),
    ).toBe(true);
  });
});
