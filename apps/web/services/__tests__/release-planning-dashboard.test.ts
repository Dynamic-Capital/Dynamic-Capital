import { describe, expect, it } from "vitest";

import { getReleasePlanningDashboardSnapshot } from "../release-planning-dashboard";

describe("release planning dashboard service", () => {
  it("exposes a deduplicated release planning snapshot", () => {
    const snapshot = getReleasePlanningDashboardSnapshot();

    expect(snapshot.summary.toLowerCase()).toContain("audit findings");
    expect(snapshot.focus).toContain("release readiness");
    expect(snapshot.organisation.branches.length).toBeGreaterThan(0);
    expect(snapshot.organisation.personas.length).toBeGreaterThan(0);

    const uniqueSteps = new Set(snapshot.recommended_next_steps);
    expect(uniqueSteps.size).toBe(snapshot.recommended_next_steps.length);

    expect(snapshot.counts.ready).toBe(snapshot.audit.ready.length);
    expect(snapshot.counts.findings).toBe(snapshot.audit.findings.length);

    expect(snapshot.optimisation.blocked.length).toBeGreaterThan(0);
    expect(snapshot.blocked_dependencies.length).toBe(
      snapshot.optimisation.blocked.length,
    );
  });
});
