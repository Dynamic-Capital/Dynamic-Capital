import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface HighlightItem {
  text: string;
  url?: string;
}

interface ReleaseMeta {
  version: string;
  date: string;
}

function replaceBetween(
  content: string,
  startMarker: string,
  endMarker: string,
  replacement: string,
): string {
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(
      `Markers ${startMarker} and ${endMarker} are missing or ordered incorrectly.`,
    );
  }
  return (
    content.slice(0, startIndex + startMarker.length) +
    "\n" +
    replacement.trim() +
    "\n" +
    content.slice(endIndex)
  );
}

function renderHighlights(items: HighlightItem[]): string {
  if (!items.length) {
    return "Project highlights will appear here after the first automated release.";
  }
  return items
    .map((item) => {
      if (item.url) {
        return `- ${item.text} ([details](${item.url}))`;
      }
      return `- ${item.text}`;
    })
    .join("\n");
}

function buildBadges(meta?: ReleaseMeta): string {
  const repo = process.env.GITHUB_REPOSITORY;
  const badges: string[] = [];
  if (meta?.version) {
    const versionBadge = `[![Release](https://img.shields.io/badge/release-${
      encodeURIComponent(meta.version)
    }-brightgreen.svg)](docs/RELEASE_NOTES/${meta.version}.md)`;
    badges.push(versionBadge);
  } else {
    badges.push(
      "[![Release](https://img.shields.io/badge/release-pre--release-lightgrey.svg)](docs/CHANGELOG.md)",
    );
  }
  if (repo) {
    const workflow = process.env.PROJECT_CI_WORKFLOW ?? "verify.yml";
    badges.push(
      `[![CI](https://github.com/${repo}/actions/workflows/${workflow}/badge.svg)](https://github.com/${repo}/actions/workflows/${workflow})`,
    );
  }
  return badges.join(" ");
}

async function main(): Promise<void> {
  const cwd = process.cwd();
  const readmePath = join(cwd, "README.md");
  if (!existsSync(readmePath)) {
    throw new Error("README.md is missing.");
  }
  const cacheDir = join(cwd, ".project-cache");
  const highlightPath = join(cacheDir, "highlights.json");
  const metaPath = join(cacheDir, "release-meta.json");

  let highlights: HighlightItem[] = [];
  if (existsSync(highlightPath)) {
    highlights = JSON.parse(
      readFileSync(highlightPath, "utf8"),
    ) as HighlightItem[];
  }

  let meta: ReleaseMeta | undefined;
  if (existsSync(metaPath)) {
    meta = JSON.parse(readFileSync(metaPath, "utf8")) as ReleaseMeta;
  }

  const readme = readFileSync(readmePath, "utf8");
  const updatedBadges = replaceBetween(
    readme,
    "<!-- BADGES:START -->",
    "<!-- BADGES:END -->",
    buildBadges(meta),
  );
  const updated = replaceBetween(
    updatedBadges,
    "<!-- WHATS_NEW:START -->",
    "<!-- WHATS_NEW:END -->",
    renderHighlights(highlights),
  );
  writeFileSync(readmePath, updated.replace(/\s+$/g, "") + "\n");
}

main().catch((error) => {
  console.error("[update-readme] Unable to update README markers");
  console.error(error);
  process.exitCode = 1;
});
