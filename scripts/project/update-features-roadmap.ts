import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  type CommitPayload,
  type CommitRecord,
  commitSummary,
  loadCommitPayload,
  loadReleaseMeta,
  type ReleaseMeta,
} from "./shared.ts";

function updateFeaturesDoc(
  featuresPath: string,
  featureCommits: CommitRecord[],
  meta?: ReleaseMeta,
): void {
  if (!featureCommits.length) return;
  const repo = process.env.GITHUB_REPOSITORY;
  const version = meta?.version ?? (meta ? "unversioned" : "unreleased");
  let content = readFileSync(featuresPath, "utf8");

  if (content.includes(`<!-- COMMIT:${featureCommits[0].hash} -->`)) {
    // Assume idempotent run detected; rely on per-commit handling below.
  }

  for (const commit of featureCommits) {
    const marker = `<!-- COMMIT:${commit.hash} -->`;
    if (content.includes(marker)) {
      continue;
    }
    if (content.includes("Placeholder entry until the first release ships.")) {
      content = content.replace(
        "| _TBD_      | _TBD_   | _TBD_   | Placeholder entry until the first release ships. | _n/a_ |\n",
        "",
      );
    }
    const area = commit.scope ?? "general";
    const description = commitSummary(commit);
    const link = commit.prNumber && repo
      ? `https://github.com/${repo}/pull/${commit.prNumber}`
      : undefined;
    const linksColumn = link ? `[PR #${commit.prNumber}](${link})` : "_n/a_";
    const row =
      `| ${commit.date} | ${version} | ${area} | ${description} | ${linksColumn} ${marker} |`;
    if (!content.endsWith("\n")) {
      content += "\n";
    }
    content += `${row}\n`;
  }

  writeFileSync(featuresPath, content.replace(/\n{3,}/g, "\n\n"));
}

function removeLineWithMarker(content: string, marker: string): string {
  return content
    .split("\n")
    .filter((line) => !line.includes(marker))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

function insertIntoShipped(content: string, line: string): string {
  const section = "## Shipped";
  const index = content.indexOf(section);
  if (index === -1) {
    return `${content.trim()}\n\n${section}\n${line}\n`;
  }
  const before = content.slice(0, index + section.length);
  const after = content.slice(index + section.length);
  const parts = after.split("\n");
  // Skip first blank line if present
  if (parts.length && parts[0] === "") {
    parts.shift();
  }
  if (parts.length && parts[0] === "- _No shipped items yet._") {
    parts.shift();
  }
  return `${before}\n${line}\n${parts.join("\n")}`.replace(/\n{3,}/g, "\n\n");
}

function updateRoadmapDoc(
  roadmapPath: string,
  featureCommits: CommitRecord[],
  meta?: ReleaseMeta,
): void {
  if (!featureCommits.length) return;
  let content = readFileSync(roadmapPath, "utf8");
  for (const commit of featureCommits) {
    const marker = `<!-- COMMIT:${commit.hash} -->`;
    if (content.includes(marker)) {
      content = removeLineWithMarker(content, marker);
    }
    const bullet = `- ${meta?.version ? `[${meta.version}] ` : ""}${
      commitSummary(commit)
    }${commit.prNumber ? ` (PR #${commit.prNumber})` : ""} ${marker}`.trim();
    content = insertIntoShipped(content, bullet);
  }
  writeFileSync(roadmapPath, content.replace(/\n{3,}/g, "\n\n"));
}

async function main(): Promise<void> {
  const cwd = process.cwd();
  const featuresPath = join(cwd, "docs", "FEATURES.md");
  const roadmapPath = join(cwd, "docs", "ROADMAP.md");
  if (!existsSync(featuresPath) || !existsSync(roadmapPath)) {
    throw new Error("Feature or roadmap documents are missing.");
  }
  const payload = loadCommitPayload(cwd);
  const featureGroup = payload.groups.find((group) => group.type === "feat");
  const meta = loadReleaseMeta(cwd);
  const featureCommits = featureGroup?.commits ?? [];
  if (!featureCommits.length) {
    return;
  }
  updateFeaturesDoc(featuresPath, featureCommits, meta);
  updateRoadmapDoc(roadmapPath, featureCommits, meta);
}

main().catch((error) => {
  console.error(
    "[update-features-roadmap] Unable to update feature and roadmap docs",
  );
  console.error(error);
  process.exitCode = 1;
});
