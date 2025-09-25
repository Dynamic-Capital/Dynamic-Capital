import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface CommitRecord {
  hash: string;
  author: string;
  date: string;
  summary: string;
  type: string;
  scope?: string;
  breaking: boolean;
  prNumber?: number;
  issues: number[];
}

interface CommitGroup {
  type: string;
  commits: CommitRecord[];
}

interface CommitPayload {
  fromTag?: string;
  toRef: string;
  generatedAt: string;
  groups: CommitGroup[];
  commits: CommitRecord[];
}

interface HighlightItem {
  text: string;
  url?: string;
}

interface ReleaseMeta {
  version: string;
  date: string;
}

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

function loadCommitPayload(cacheDir: string): CommitPayload {
  const path = join(cacheDir, "commits.json");
  if (!existsSync(path)) {
    throw new Error("Missing commit cache. Run proj:collect first.");
  }
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as CommitPayload;
}

function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function shortHash(hash: string): string {
  return hash.slice(0, 7);
}

function commitLink(prNumber?: number): string | undefined {
  if (!prNumber) return undefined;
  const repoUrl = process.env.GITHUB_REPOSITORY
    ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
    : undefined;
  return repoUrl ? `${repoUrl}/pull/${prNumber}` : undefined;
}

function chooseHighlights(payload: CommitPayload): HighlightItem[] {
  const featureCommits = payload.groups.find((group) => group.type === "feat");
  const candidates = (featureCommits?.commits ?? payload.commits).slice(0, 5);
  return candidates.map((commit) => {
    const url = commitLink(commit.prNumber);
    const cleanSummary = commit.summary.replace(
      /^(\w+)(?:\([^)]+\))?(!)?:\s*/,
      "",
    );
    return {
      text: cleanSummary,
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
          const cleanSummary = commit.summary.replace(
            /^(\w+)(?:\([^)]+\))?(!)?:\s*/,
            "",
          );
          const prSuffix = commit.prNumber ? ` (#${commit.prNumber})` : "";
          return `- ${cleanSummary}${prSuffix} (${shortHash(commit.hash)})`;
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

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const cwd = process.cwd();
  const cacheDir = join(cwd, ".project-cache");
  ensureDir(cacheDir);
  const payload = loadCommitPayload(cacheDir);

  const version = args.version ?? process.env.VERSION;
  if (!version) {
    throw new Error("Provide --version=vX.Y.Z or set VERSION env variable.");
  }
  const today = new Date().toISOString().slice(0, 10);

  const highlights = chooseHighlights(payload);
  const changeSection = renderChangeSection(payload.groups);

  const releaseDir = join(cwd, "docs", "RELEASE_NOTES");
  ensureDir(releaseDir);
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

main().catch((error) => {
  console.error(
    "[generate-release-notes] Unable to generate release artifacts",
  );
  console.error(error);
  process.exitCode = 1;
});
