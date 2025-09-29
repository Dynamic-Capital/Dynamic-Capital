import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import process from "node:process";

type Status = "planned" | "in-progress" | "blocked" | "done";

interface Deliverable {
  id: string;
  title: string;
  description: string;
  status: Status;
  links?: string[];
  dependencies?: string[];
}

interface Track {
  id: string;
  label: string;
  owner: string;
  status: Status;
  notes?: string[];
  deliverables: Deliverable[];
}

interface Milestone {
  id: string;
  title: string;
  targetDate: string;
  status: Status;
  summary: string;
  dependencies?: string[];
}

interface TelemetryMetric {
  metric: string;
  target: string;
  owner: string;
  source: string;
}

interface Manifest {
  name: string;
  version: string;
  steward: string;
  updated: string;
  tracks: Track[];
  milestones: Milestone[];
  telemetry: TelemetryMetric[];
}

const STATUS_LABEL: Record<Status, string> = {
  planned: "Planned",
  "in-progress": "In Progress",
  blocked: "Blocked",
  done: "Done",
};

const STATUS_EMOJI: Record<Status, string> = {
  planned: "📝",
  "in-progress": "🚧",
  blocked: "⛔️",
  done: "✅",
};

function loadManifest(manifestPath: string): Manifest {
  const data = readFileSync(manifestPath, "utf8");
  const parsed = JSON.parse(data) as Manifest;
  validateManifest(parsed);
  return parsed;
}

function validateManifest(manifest: Manifest): void {
  if (!manifest.name || !manifest.version || !manifest.steward) {
    throw new Error(
      "Manifest is missing required metadata (name, version, steward).",
    );
  }

  manifest.tracks.forEach((track) => {
    if (!track.id || !track.label) {
      throw new Error(`Track is missing id or label: ${JSON.stringify(track)}`);
    }
    validateStatus(track.status, `track:${track.id}`);
    track.deliverables.forEach((deliverable) => {
      if (!deliverable.id || !deliverable.title) {
        throw new Error(
          `Deliverable is missing id or title in track ${track.id}: ${
            JSON.stringify(deliverable)
          }`,
        );
      }
      validateStatus(deliverable.status, `deliverable:${deliverable.id}`);
    });
  });

  manifest.milestones.forEach((milestone) => {
    if (!milestone.id || !milestone.title) {
      throw new Error(
        `Milestone is missing id or title: ${JSON.stringify(milestone)}`,
      );
    }
    validateStatus(milestone.status, `milestone:${milestone.id}`);
  });
}

function validateStatus(
  status: Status | string,
  context: string,
): asserts status is Status {
  if (!["planned", "in-progress", "blocked", "done"].includes(status)) {
    throw new Error(`Invalid status "${status}" in ${context}.`);
  }
}

function computeStatusCounts(
  items: { status: Status }[],
): Record<Status, number> {
  return items.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { planned: 0, "in-progress": 0, blocked: 0, done: 0 } as Record<
      Status,
      number
    >,
  );
}

function renderOverview(manifest: Manifest, nowIso: string): string {
  const trackCounts = computeStatusCounts(manifest.tracks);
  const allDeliverables = manifest.tracks.flatMap((track) =>
    track.deliverables
  );
  const deliverableCounts = computeStatusCounts(allDeliverables);

  const summaryLines = [
    `- **Version:** ${manifest.version}`,
    `- **Steward:** ${manifest.steward}`,
    `- **Last Updated:** ${manifest.updated}`,
    `- **Report Generated:** ${nowIso}`,
    `- **Tracks:** ${manifest.tracks.length} total — ${
      formatStatusCounts(trackCounts)
    }`,
    `- **Deliverables:** ${allDeliverables.length} total — ${
      formatStatusCounts(deliverableCounts)
    }`,
  ];

  const blockedDeliverables = allDeliverables.filter((deliverable) =>
    deliverable.status === "blocked"
  );
  if (blockedDeliverables.length > 0) {
    summaryLines.push(
      `- **Attention:** ${blockedDeliverables.length} deliverable${
        blockedDeliverables.length === 1 ? "" : "s"
      } blocked (${
        blockedDeliverables
          .map((deliverable) => deliverable.title)
          .join(", ")
      }).`,
    );
  }

  return ["## Overview", "", ...summaryLines, ""].join("\n");
}

function formatStatusCounts(counts: Record<Status, number>): string {
  const order: Status[] = ["done", "in-progress", "planned", "blocked"];
  return order
    .filter((status) => counts[status] > 0)
    .map((status) =>
      `${STATUS_EMOJI[status]} ${counts[status]} ${STATUS_LABEL[status]}`
    )
    .join(", ");
}

function renderTrackSummary(tracks: Track[]): string {
  const rows = tracks.map((track) => {
    const deliverables = track.deliverables;
    const deliverableCounts = computeStatusCounts(deliverables);
    const done = deliverableCounts.done;
    const total = deliverables.length;
    const status = `${STATUS_EMOJI[track.status]} ${
      STATUS_LABEL[track.status]
    }`;
    return `| ${track.label} | ${track.owner} | ${status} | ${done}/${total} |`;
  });

  return [
    "## Track Status",
    "",
    "| Track | Owner | Status | Deliverables Done |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

function renderTrackDetails(track: Track): string {
  const lines = [
    `### ${track.label} — ${STATUS_EMOJI[track.status]} ${
      STATUS_LABEL[track.status]
    }`,
    "",
    `**Owner:** ${track.owner}`,
    "",
  ];

  if (track.notes && track.notes.length > 0) {
    lines.push("**Notes:**");
    track.notes.forEach((note) => {
      lines.push(`- ${note}`);
    });
    lines.push("");
  }

  if (track.deliverables.length > 0) {
    lines.push("**Deliverables:**");
    track.deliverables.forEach((deliverable) => {
      const checkbox = deliverable.status === "done"
        ? "[x]"
        : deliverable.status === "blocked"
        ? "[/]"
        : "[ ]";
      const statusLabel = `${STATUS_EMOJI[deliverable.status]} ${
        STATUS_LABEL[deliverable.status]
      }`;
      lines.push(`- ${checkbox} **${deliverable.title}** — ${statusLabel}`);
      lines.push(`  - ${deliverable.description}`);
      if (deliverable.dependencies && deliverable.dependencies.length > 0) {
        lines.push(`  - Dependencies: ${deliverable.dependencies.join(", ")}`);
      }
      if (deliverable.links && deliverable.links.length > 0) {
        const formattedLinks = deliverable.links
          .map((link) => "[" + link + "](../" + link + ")")
          .join(", ");
        lines.push(`  - References: ${formattedLinks}`);
      }
    });
    lines.push("");
  }

  return lines.join("\n");
}

function renderTracks(tracks: Track[]): string {
  return tracks.map((track) => renderTrackDetails(track)).join("\n");
}

function renderMilestones(milestones: Milestone[]): string {
  if (milestones.length === 0) {
    return "";
  }

  const rows = milestones.map((milestone) => {
    const status = `${STATUS_EMOJI[milestone.status]} ${
      STATUS_LABEL[milestone.status]
    }`;
    const deps = milestone.dependencies && milestone.dependencies.length > 0
      ? milestone.dependencies.join(", ")
      : "—";
    return `| ${milestone.title} | ${milestone.targetDate} | ${status} | ${milestone.summary} | ${deps} |`;
  });

  return [
    "## Milestones",
    "",
    "| Milestone | Target Date | Status | Summary | Dependencies |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

function renderTelemetry(metrics: TelemetryMetric[]): string {
  if (metrics.length === 0) {
    return "";
  }

  const lines = ["## Telemetry Targets", ""];
  metrics.forEach((metric) => {
    lines.push(
      `- **${metric.metric}:** target ${metric.target} · owner ${metric.owner} · source ${metric.source}`,
    );
  });
  lines.push("");
  return lines.join("\n");
}

function main(): void {
  const scriptDir = dirname(new URL(import.meta.url).pathname);
  const root = resolve(scriptDir, "..", "..");
  const manifestPath = resolve(root, "data", "dtl_build_manifest.json");
  const outputPath = resolve(root, "docs", "dtl-build-report.md");

  const manifest = loadManifest(manifestPath);
  const nowIso = new Date().toISOString();

  const tracks = [...manifest.tracks].sort((a, b) =>
    a.label.localeCompare(b.label)
  );
  const milestones = [...manifest.milestones].sort((a, b) =>
    a.targetDate.localeCompare(b.targetDate)
  );

  const parts = [
    `# ${manifest.name} Build Report`,
    "",
    renderOverview(manifest, nowIso),
    renderTrackSummary(tracks),
    renderTracks(tracks),
    renderMilestones(milestones),
    renderTelemetry(manifest.telemetry),
  ].filter(Boolean);

  const markdown = parts.join("\n");
  writeFileSync(outputPath, markdown, "utf8");

  const relativeOutput = relative(root, outputPath);
  process.stdout.write(`Generated ${relativeOutput}\n`);
}

main();
