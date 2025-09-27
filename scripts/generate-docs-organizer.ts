#!/usr/bin/env -S deno run -A
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

interface DocMeta {
  path: string;
  title: string;
  summary: string;
}

const rootDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(rootDir, "..");
const docsRoot = join(repoRoot, "docs");

const docsByDirectory = new Map<string, DocMeta[]>();
const directorySet = new Set<string>();

function ensureDirectoryKey(dir: string) {
  if (!docsByDirectory.has(dir)) {
    docsByDirectory.set(dir, []);
  }
}

function sanitize(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/`+/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[\*~]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-•+]\s+/, "");
}

function extractMetadata(content: string, fallbackTitle: string) {
  const lines = content.split(/\r?\n/);
  let title = fallbackTitle;
  let foundTitle = false;
  const summaryLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!foundTitle) {
      if (trimmed.startsWith("#")) {
        title = sanitize(trimmed.replace(/^#+\s*/, "")) || title;
        foundTitle = true;
      }
      continue;
    }

    if (trimmed === "") {
      if (summaryLines.length > 0) {
        break;
      }
      continue;
    }

    if (trimmed.startsWith("#")) {
      if (summaryLines.length > 0) {
        break;
      }
      continue;
    }

    const horizontalRuleCandidate = trimmed.replace(/\s+/g, "");
    if (/^[-*_]{3,}$/.test(horizontalRuleCandidate)) {
      continue;
    }

    if (/^\|.*\|$/.test(trimmed)) {
      continue;
    }

    summaryLines.push(trimmed);
    if (/^[-*+]\s+/.test(trimmed)) {
      break;
    }
  }

  let summary = sanitize(summaryLines.join(" "));
  if (!summary) {
    summary = "No summary available.";
  }
  if (summary.length > 220) {
    summary = summary.slice(0, 217).trimEnd() + "…";
  }

  return { title, summary };
}

async function collectDocs(currentPath: string, relativeDir: string) {
  ensureDirectoryKey(relativeDir);

  for await (const entry of Deno.readDir(currentPath)) {
    if (entry.name.startsWith(".")) continue;
    const entryPath = join(currentPath, entry.name);
    const entryRelPath = relativeDir
      ? `${relativeDir}/${entry.name}`
      : entry.name;

    if (entry.isDirectory) {
      directorySet.add(entryRelPath);
      await collectDocs(entryPath, entryRelPath);
      continue;
    }

    if (!entry.isFile) continue;
    if (!entry.name.toLowerCase().endsWith(".md")) continue;

    const text = await Deno.readTextFile(entryPath);
    const fallbackTitle = entry.name.replace(/\.md$/i, "");
    const { title, summary } = extractMetadata(text, fallbackTitle);

    const docs = docsByDirectory.get(relativeDir)!;
    docs.push({
      path: entryRelPath,
      title,
      summary,
    });
  }
}

await collectDocs(docsRoot, "");

for (const docs of docsByDirectory.values()) {
  docs.sort((a, b) => a.title.localeCompare(b.title));
}

const sortedDirectories = Array.from(docsByDirectory.keys()).sort((a, b) => {
  if (a === "" && b !== "") return -1;
  if (b === "" && a !== "") return 1;
  return a.localeCompare(b);
});

const totalDocs = Array.from(docsByDirectory.values()).reduce(
  (acc, docs) => acc + docs.length,
  0,
);

const lines: string[] = [];
const projectName = relative(dirname(repoRoot), repoRoot) ||
  repoRoot.split("/").pop() || "repository";

function formatDirName(dir: string) {
  if (!dir) return "Root Documents";
  return dir
    .split("/")
    .map((part) =>
      part
        .split(/[-_]/g)
        .map((segment) =>
          segment ? segment[0].toUpperCase() + segment.slice(1) : segment
        )
        .join(" ")
    )
    .join(" / ");
}

function formatDocsPath(dir: string) {
  if (!dir) return "docs/";
  return `docs/${dir}/`;
}

function escapeTable(text: string) {
  return text.replace(/\|/g, "\\|");
}

lines.push(`# Dynamic Docs Organizer — ${projectName}`);
lines.push("");
lines.push(`**Generated:** ${new Date().toISOString()}`);
lines.push("**Scope:** docs/");
lines.push("");
lines.push(
  "This index catalogs the documentation workspace so contributors can quickly locate relevant runbooks, checklists, and references.",
);
lines.push("");
lines.push("## Summary Stats");
lines.push("");
lines.push(`- Total Markdown files indexed: ${totalDocs}`);
lines.push(`- Documentation directories scanned: ${directorySet.size}`);
lines.push("");
lines.push("### Directory Breakdown");
lines.push("");
for (const dir of sortedDirectories) {
  const docs = docsByDirectory.get(dir)!;
  const label = formatDirName(dir);
  const pathLabel = formatDocsPath(dir);
  lines.push(
    `- ${label} (${pathLabel}) — ${docs.length} file${
      docs.length === 1 ? "" : "s"
    }`,
  );
}
lines.push("");

for (const dir of sortedDirectories) {
  const docs = docsByDirectory.get(dir)!;
  if (!docs.length) continue;
  const heading = formatDirName(dir);
  const pathLabel = formatDocsPath(dir);
  lines.push(`## ${heading}`);
  lines.push("");
  lines.push(`_Directory: ${pathLabel}_`);
  lines.push("");
  lines.push("| Document | Title | Summary |");
  lines.push("| --- | --- | --- |");
  for (const doc of docs) {
    const link = `./${encodeURI(doc.path)}`;
    lines.push(
      `| [${doc.path.split("/").pop()}](${link}) | ${
        escapeTable(doc.title)
      } | ${escapeTable(doc.summary)} |`,
    );
  }
  lines.push("");
}

lines.push("---");
lines.push("");
lines.push("_Generated with `scripts/generate-docs-organizer.ts`._");
lines.push("");

const target = join(docsRoot, "DYNAMIC_DOCS_ORGANIZER.md");
await Deno.writeTextFile(target, lines.join("\n"));

console.log(`Updated ${target}`);
