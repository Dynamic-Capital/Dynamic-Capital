import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  type CommitGroup,
  commitLink,
  type CommitPayload,
  commitSummary,
  ensureProjectCacheDir,
  type HighlightItem,
  loadCommitPayload,
  type ReleaseMeta,
  shortHash,
} from "./shared.ts";
import process from "node:process";

function parseArgs(argv: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const [key, value] = arg.slice(2).split("=");
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

function chooseHighlights(payload: CommitPayload): HighlightItem[] {
  const featureCommits = payload.groups.find((group) => group.type === "feat");
  const candidates = (featureCommits?.commits ?? payload.commits).slice(0, 5);
  return candidates.map((commit) => {
    const url = commitLink(commit.prNumber);
    const summary = commitSummary(commit);
    return {
      text: summary,
      url,
    };
  });
}

function renderHighlightList(items: HighlightItem[]): string {
  if (!items.length) {
    return "- Maintenance release.";
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

function renderChangeSection(groups: CommitGroup[]): string {
  if (!groups.length) {
    return "_No user-facing changes._";
  }
  return groups
    .map((group) => {
      const items = group.commits
        .map((commit) => {
          const cleaned = commitSummary(commit);
          const prSuffix = commit.prNumber ? ` (#${commit.prNumber})` : "";
          return `- ${cleaned}${prSuffix} (${shortHash(commit.hash)})`;
        })
        .join("\n");
      return `### ${group.type}\n${items}`;
    })
    .join("\n\n");
}

function prependChangelogEntry(
  changelogPath: string,
  version: string,
  date: string,
  body: string,
): void {
  const startMarker = "<!-- CHANGELOG:START -->";
  const endMarker = "<!-- CHANGELOG:END -->";
  const changelog = readFileSync(changelogPath, "utf8");
  if (changelog.includes(`## ${version}`)) {
    return;
  }
  const entry = `## ${version} - ${date}\n\n${body}\n\n`;
  const startIndex = changelog.indexOf(startMarker);
  const endIndex = changelog.indexOf(endMarker);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error("CHANGELOG markers are missing or malformed.");
  }
  const before = changelog.slice(0, startIndex + startMarker.length);
  const after = changelog.slice(endIndex);
  const between = changelog.slice(startIndex + startMarker.length, endIndex)
    .trim();
  const content = [
    entry.trim(),
    between && between !== "_No releases have been published yet._"
      ? between
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const finalValue = `${before}\n${content}\n${after}`.replace(
    /\n{3,}/g,
    "\n\n",
  );
  writeFileSync(changelogPath, finalValue.trimEnd() + "\n");
}

function main(): void {
  const args = parseArgs(process.argv);
  const cwd = process.cwd();
  const cacheDir = ensureProjectCacheDir(cwd);
  const payload = loadCommitPayload(cwd);

  const version = args.version ?? process.env.VERSION;
  if (!version) {
    throw new Error("Provide --version=vX.Y.Z or set VERSION env variable.");
  }
  const today = new Date().toISOString().slice(0, 10);

  const highlights = chooseHighlights(payload);
  const changeSection = renderChangeSection(payload.groups);

  const releaseDir = join(cwd, "docs", "RELEASE_NOTES");
  if (!existsSync(releaseDir)) {
    mkdirSync(releaseDir, { recursive: true });
  }
  const releasePath = join(releaseDir, `${version}.md`);
  if (!existsSync(releasePath)) {
    const content = `# Release ${version} (${today})\n\n## Highlights\n${
      renderHighlightList(highlights)
    }\n\n## Changes\n${changeSection}\n`;
    writeFileSync(releasePath, content.trimEnd() + "\n");
  }

  const changelogPath = join(cwd, "docs", "CHANGELOG.md");
  if (!existsSync(changelogPath)) {
    throw new Error("docs/CHANGELOG.md is missing.");
  }
  prependChangelogEntry(
    changelogPath,
    version,
    today,
    renderHighlightList(highlights),
  );

  const highlightPath = join(cacheDir, "highlights.json");
  writeFileSync(highlightPath, JSON.stringify(highlights, null, 2));

  const metaPath = join(cacheDir, "release-meta.json");
  const meta: ReleaseMeta = { version, date: today };
  writeFileSync(metaPath, JSON.stringify(meta, null, 2));
}

try {
  main();
} catch (error) {
  console.error(
    "[generate-release-notes] Unable to generate release artifacts",
  );
  console.error(error);
  process.exitCode = 1;
}
