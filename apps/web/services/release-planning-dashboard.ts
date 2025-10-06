import releasePlanningDashboard from "@/data/release-planning-dashboard.json" with {
  type: "json",
};
import { optionalEnvVar } from "@/utils/env.ts";

export interface ReleasePlanningDashboardBranch {
  name: string;
  service: string;
  environment: string;
  description: string;
  dependencies: string[];
  tags: string[];
  protected: boolean;
  ready: boolean;
  blocked_by: string[];
  summary: string;
}

export interface ReleasePlanningDashboardBranchGroup {
  service: string;
  environment: string;
  branches: ReleasePlanningDashboardBranch[];
}

export interface ReleasePlanningDashboardTeamNotes {
  [key: string]: unknown;
}

export interface ReleasePlanningDashboardTeam {
  role: string;
  summary: string;
  objectives: string[];
  workflow: string[];
  outputs: string[];
  kpis: string[];
  focus: string[];
  notes?: ReleasePlanningDashboardTeamNotes;
  persona: string;
}

export interface ReleasePlanningDashboardPersonaGroup {
  persona: string;
  team_count: number;
  teams: ReleasePlanningDashboardTeam[];
}

export interface ReleasePlanningDashboardOrganisation {
  focus: string[];
  branches: ReleasePlanningDashboardBranchGroup[];
  teams: ReleasePlanningDashboardTeam[];
  personas: ReleasePlanningDashboardPersonaGroup[];
  summary: string;
}

export type ReleasePlanningDashboardSeverity =
  | "info"
  | "warning"
  | "critical";

export interface ReleasePlanningDashboardAuditFinding {
  branch: string;
  severity: ReleasePlanningDashboardSeverity;
  issues: string[];
  blocked_by: string[];
  recommended_actions: string[];
}

export interface ReleasePlanningDashboardAudit {
  ready: string[];
  findings: ReleasePlanningDashboardAuditFinding[];
  summary: string;
}

export interface ReleasePlanningDashboardBlockedDependency {
  branch: string;
  blocked_by: string[];
}

export interface ReleasePlanningDashboardOptimisation {
  promotion_sequence: string[];
  pending: string[];
  blocked: ReleasePlanningDashboardBlockedDependency[];
  recommended_actions: string[];
  summary: string;
}

export interface ReleasePlanningDashboardCounts {
  branches: number;
  teams: number;
  ready: number;
  pending: number;
  blocked: number;
  findings: number;
}

export interface ReleasePlanningDashboardSnapshot {
  generated_at: string;
  summary: string;
  focus: string[];
  organisation: ReleasePlanningDashboardOrganisation;
  audit: ReleasePlanningDashboardAudit;
  optimisation: ReleasePlanningDashboardOptimisation;
  recommended_next_steps: string[];
  counts: ReleasePlanningDashboardCounts;
  blocked_dependencies: ReleasePlanningDashboardBlockedDependency[];
}

type ReleasePlanningDashboardRawSnapshot = typeof releasePlanningDashboard;

const SNAPSHOT_TEMPLATE: ReleasePlanningDashboardRawSnapshot =
  releasePlanningDashboard;

function deepCloneRawSnapshot(
  snapshot: ReleasePlanningDashboardRawSnapshot,
): ReleasePlanningDashboardRawSnapshot {
  return JSON.parse(
    JSON.stringify(snapshot),
  ) as ReleasePlanningDashboardRawSnapshot;
}

function dedupeSteps(steps: string[]): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const step of steps) {
    if (!seen.has(step)) {
      ordered.push(step);
      seen.add(step);
    }
  }
  return ordered;
}

function normaliseSeverity(value: string): ReleasePlanningDashboardSeverity {
  if (value === "info" || value === "warning" || value === "critical") {
    return value;
  }
  return "info";
}

export function getReleasePlanningDashboardSnapshot(): ReleasePlanningDashboardSnapshot {
  const snapshot = deepCloneRawSnapshot(
    SNAPSHOT_TEMPLATE,
  ) as ReleasePlanningDashboardSnapshot;
  snapshot.recommended_next_steps = dedupeSteps(
    snapshot.recommended_next_steps,
  );
  snapshot.optimisation.recommended_actions = dedupeSteps(
    snapshot.optimisation.recommended_actions,
  );
  snapshot.audit.findings = snapshot.audit.findings.map((finding) => ({
    ...finding,
    severity: normaliseSeverity(finding.severity),
  }));
  snapshot.optimisation.blocked = snapshot.optimisation.blocked.map((
    entry,
  ) => ({
    branch: entry.branch,
    blocked_by: [...entry.blocked_by],
  }));
  snapshot.blocked_dependencies = snapshot.blocked_dependencies.map((
    entry,
  ) => ({
    branch: entry.branch,
    blocked_by: [...entry.blocked_by],
  }));
  return snapshot;
}

const DEFAULT_CACHE_TTL_SECONDS = 180;

function resolveCacheTtl(rawValue: string | undefined): number {
  if (!rawValue) {
    return DEFAULT_CACHE_TTL_SECONDS;
  }
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_CACHE_TTL_SECONDS;
  }
  return parsed;
}

export const RELEASE_PLANNING_DASHBOARD_CACHE_TAG =
  "release-planning-dashboard" as const;

export const RELEASE_PLANNING_DASHBOARD_CACHE_TTL_SECONDS = resolveCacheTtl(
  optionalEnvVar("RELEASE_PLANNING_DASHBOARD_CACHE_TTL_SECONDS"),
);

export const RELEASE_PLANNING_DASHBOARD_CACHE_CONTROL_HEADER =
  `public, max-age=0, s-maxage=${RELEASE_PLANNING_DASHBOARD_CACHE_TTL_SECONDS}, stale-while-revalidate=300` as const;

export interface ReleasePlanningDashboardEndpointDescriptor {
  method: "GET";
  path: `/api/${string}`;
  description: string;
}

export const RELEASE_PLANNING_DASHBOARD_ENDPOINT:
  ReleasePlanningDashboardEndpointDescriptor = Object.freeze({
    method: "GET",
    path: "/api/release-planning",
    description:
      "Release readiness snapshot including audit findings and recommended next steps.",
  });
