import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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

interface DeliverableInfo {
  id: string;
  title: string;
  trackId: string;
  trackLabel: string;
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

  if (!manifest.updated) {
    throw new Error("Manifest is missing updated timestamp.");
  }

  if (!Array.isArray(manifest.tracks) || manifest.tracks.length === 0) {
    throw new Error("Manifest must include at least one track.");
  }

  const deliverableIds = new Set<string>();

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
      deliverableIds.add(deliverable.id);

      if (deliverable.dependencies) {
        deliverable.dependencies.forEach((dependency) => {
          if (!dependency) {
            throw new Error(
              `Deliverable ${deliverable.id} includes an empty dependency entry.`,
            );
          }
        });
      }
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

  manifest.telemetry.forEach((metric) => {
    if (!metric.metric || !metric.target || !metric.owner || !metric.source) {
      throw new Error(
        `Telemetry metric missing required fields: ${JSON.stringify(metric)}`,
      );
    }
  });

  manifest.tracks.forEach((track) => {
    track.deliverables.forEach((deliverable) => {
      if (!deliverable.dependencies) {
        return;
      }

      deliverable.dependencies.forEach((dependency) => {
        if (!deliverableIds.has(dependency)) {
          throw new Error(
            `Deliverable ${deliverable.id} references unknown dependency "${dependency}".`,
          );
        }
      });
    });
  });

  manifest.milestones.forEach((milestone) => {
    if (!milestone.dependencies) {
      return;
    }

    milestone.dependencies.forEach((dependency) => {
      if (!deliverableIds.has(dependency)) {
        throw new Error(
          `Milestone ${milestone.id} references unknown dependency "${dependency}".`,
        );
      }
    });
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

function renderTrackDetails(
  track: Track,
  deliverableLookup: Map<string, DeliverableInfo>,
): string {
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
        lines.push(
          `  - Dependencies: ${
            formatDependencyList(
              deliverable.dependencies,
              deliverableLookup,
              track.id,
            )
          }`,
        );
      }
      if (deliverable.links && deliverable.links.length > 0) {
        lines.push(`  - References: ${formatReferences(deliverable.links)}`);
      }
    });
    lines.push("");
  }

  return lines.join("\n");
}

function renderTracks(
  tracks: Track[],
  deliverableLookup: Map<string, DeliverableInfo>,
): string {
  return tracks
    .map((track) => renderTrackDetails(track, deliverableLookup))
    .join("\n");
}

function renderMilestones(
  milestones: Milestone[],
  deliverableLookup: Map<string, DeliverableInfo>,
): string {
  if (milestones.length === 0) {
    return "";
  }

  const rows = milestones.map((milestone) => {
    const status = `${STATUS_EMOJI[milestone.status]} ${
      STATUS_LABEL[milestone.status]
    }`;
    const deps = formatDependencyList(
      milestone.dependencies,
      deliverableLookup,
    );
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

function buildDeliverableLookup(
  manifest: Manifest,
): Map<string, DeliverableInfo> {
  const lookup = new Map<string, DeliverableInfo>();
  manifest.tracks.forEach((track) => {
    track.deliverables.forEach((deliverable) => {
      lookup.set(deliverable.id, {
        id: deliverable.id,
        title: deliverable.title,
        trackId: track.id,
        trackLabel: track.label,
      });
    });
  });
  return lookup;
}

function formatDependencyList(
  dependencies: string[] | undefined,
  deliverableLookup: Map<string, DeliverableInfo>,
  currentTrackId?: string,
): string {
  if (!dependencies || dependencies.length === 0) {
    return "—";
  }

  return dependencies
    .map((dependency) => {
      const info = deliverableLookup.get(dependency);
      if (!info) {
        return dependency;
      }

      if (currentTrackId && info.trackId === currentTrackId) {
        return info.title;
      }

      return `${info.title} (${info.trackLabel})`;
    })
    .join(", ");
}

function formatReferences(links: string[]): string {
  return links.map((link) => formatLink(link)).join(", ");
}

const ACRONYM_OVERRIDES: Record<string, string> = {
  agi: "AGI",
  api: "API",
  dta: "DTA",
  dtl: "DTL",
  otel: "OTel",
  rl: "RL",
  smc: "SMC",
};

function formatLink(link: string): string {
  const trimmed = link.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return `[${trimmed}](${trimmed})`;
  }

  const withoutLeading = trimmed.replace(/^\.\//, "");
  if (withoutLeading.startsWith("docs/")) {
    const relative = withoutLeading.slice("docs/".length);
    const [path, anchor] = relative.split("#", 2);
    const linkTextBase = humanizeSlug(path);
    const linkText = anchor
      ? `${linkTextBase} — ${humanizeSlug(anchor)}`
      : linkTextBase;
    const target = anchor ? `${path}#${anchor}` : path;
    return `[${linkText}](./${target})`;
  }

  return `[${humanizeSlug(withoutLeading)}](./${withoutLeading})`;
}

function humanizeSlug(slug: string): string {
  const withoutExtension = slug.replace(/\.[^/.]+$/, "");
  const withoutLeadingDigits = withoutExtension.replace(/^[0-9]+-/, "");
  const ampersandNormalized = withoutLeadingDigits.replace(/--/g, " & ");
  return ampersandNormalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => humanizeWord(segment))
    .join(" ");
}

function humanizeWord(segment: string): string {
  if (segment === "&") {
    return "&";
  }

  const lower = segment.toLowerCase();
  if (ACRONYM_OVERRIDES[lower]) {
    return ACRONYM_OVERRIDES[lower];
  }

  if (segment.length === 0) {
    return segment;
  }

  return segment[0].toUpperCase() + segment.slice(1);
}

function main(): void {
  const scriptDir = dirname(fileURLToPath(new URL(import.meta.url)));
  const root = resolve(scriptDir, "..", "..");
  const manifestPath = resolve(root, "data", "dtl_build_manifest.json");
  const outputPath = resolve(root, "docs", "dtl-build-report.md");

  const manifest = loadManifest(manifestPath);
  const nowIso = new Date().toISOString();
  const deliverableLookup = buildDeliverableLookup(manifest);

  const tracks = [...manifest.tracks].sort((a, b) =>
    a.label.localeCompare(b.label)
  );
  const milestones = [...manifest.milestones].sort((a, b) =>
    a.targetDate.localeCompare(b.targetDate)
  );

  const parts = [
    `# ${manifest.name} Build Report`,
    renderOverview(manifest, nowIso),
    renderTrackSummary(tracks),
    renderTracks(tracks, deliverableLookup),
    renderMilestones(milestones, deliverableLookup),
    renderTelemetry(manifest.telemetry),
  ].filter((part) => part && part.trim().length > 0);

  const markdown = parts.join("\n\n");
  writeFileSync(outputPath, markdown, "utf8");

  const relativeOutput = relative(root, outputPath);
  process.stdout.write(`Generated ${relativeOutput}\n`);
}

main();
