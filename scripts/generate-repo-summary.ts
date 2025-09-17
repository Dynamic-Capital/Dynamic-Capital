#!/usr/bin/env -S deno run -A
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(root, "..");
const projectName = relative(dirname(repoRoot), repoRoot) ||
  repoRoot.split("/").pop() || "repository";

function formatDate(date: Date) {
  return date.toUTCString();
}

async function listTopDirectories(base: string): Promise<string[]> {
  const dirs: string[] = [];
  for await (const entry of Deno.readDir(base)) {
    if (entry.isDirectory && !entry.name.startsWith(".")) {
      dirs.push(entry.name);
    }
  }
  return dirs.sort((a, b) => a.localeCompare(b));
}

async function collectEdgeFunctions(): Promise<
  { name: string; entry: string; hasDefault: boolean }[]
> {
  const results: { name: string; entry: string; hasDefault: boolean }[] = [];
  const base = join(repoRoot, "supabase", "functions");
  const skip = [
    "_shared",
    "_tests",
    "miniapp",
    "miniapp-smoke",
    "miniapp-deposit",
  ]; // include real functions but skip front-end bundler directories

  async function walkDir(current: string, relativePath: string) {
    for await (const entry of Deno.readDir(current)) {
      const nextRel = relativePath
        ? `${relativePath}/${entry.name}`
        : entry.name;
      const nextPath = join(current, entry.name);
      if (entry.isDirectory) {
        if (skip.includes(entry.name)) continue;
        await walkDir(nextPath, nextRel);
      } else if (entry.isFile && entry.name === "index.ts") {
        const text = await Deno.readTextFile(nextPath);
        const hasDefault = /export\s+default\s+/m.test(text);
        const functionName = nextRel.replace(/\/index\.ts$/, "");
        results.push({
          name: functionName,
          entry: `supabase/functions/${functionName}/index.ts`,
          hasDefault,
        });
      }
    }
  }

  await walkDir(base, "");
  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

async function collectEnvKeys(): Promise<string[]> {
  const keys = new Set<string>();
  const queue: string[] = [repoRoot];
  const ignored = new Set([
    "node_modules",
    ".git",
    ".next",
    "dist",
    "_static",
    "supabase/functions/miniapp",
  ]);

  while (queue.length) {
    const current = queue.pop()!;
    for await (const entry of Deno.readDir(current)) {
      const entryPath = join(current, entry.name);
      const rel = relative(repoRoot, entryPath);
      if (
        ignored.has(entry.name) ||
        [...ignored].some((skip) => rel.startsWith(skip))
      ) {
        continue;
      }
      if (entry.isDirectory) {
        queue.push(entryPath);
      } else if (entry.isFile && /\.(ts|tsx|js|mjs|cjs|md)$/.test(entry.name)) {
        const text = await Deno.readTextFile(entryPath);
        for (
          const match of text.matchAll(/Deno\.env\.get\(["'`]([^"'`]+)["'`]\)/g)
        ) {
          keys.add(match[1]);
        }
        for (const match of text.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
          keys.add(match[1]);
        }
      }
    }
  }

  return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

const [dirs, functions, envKeys] = await Promise.all([
  listTopDirectories(repoRoot),
  collectEdgeFunctions(),
  collectEnvKeys(),
]);

const lines: string[] = [];
lines.push(`# Repository Summary — ${projectName}`);
lines.push("");
lines.push(`**Generated:** ${formatDate(new Date())}`);
lines.push(`**Repo root:** ${projectName}`);
lines.push("");
lines.push("## Directory Map (top-level)");
lines.push("");
for (const dir of dirs) {
  lines.push(`- ${dir}/`);
}
lines.push("");
lines.push("## Edge Functions Inventory");
lines.push("");
lines.push("| Function | Entry file | Default export |\n|---|---|---|");
for (const fn of functions) {
  const label = fn.hasDefault ? "Yes" : "No";
  lines.push(`| ${fn.name} | ${fn.entry} | ${label} |`);
}
lines.push("");
lines.push("## Environment Keys (detected)");
lines.push("");
for (const key of envKeys) {
  lines.push(`- ${key}`);
}
lines.push("");
lines.push("## Automation Notes");
lines.push("");
lines.push(
  "- Run `npm run docs:summary` before merging to refresh this inventory.",
);
lines.push(
  "- When marketing assets change, rerun the landing build parity checklist below.",
);
lines.push("");
lines.push("### Landing Build Parity Checklist");
lines.push("");
lines.push(
  "- [ ] Run `npm run build:landing` to regenerate `_static/` assets.",
);
lines.push(
  "- [ ] Compare `_static/` with `apps/web/app/(marketing)` and commit any differences.",
);
lines.push(
  "- [ ] Record the parity outcome in release notes or the PR description.",
);
lines.push("");
lines.push("_Generated with `scripts/generate-repo-summary.ts`._");
lines.push("");

const target = join(repoRoot, "docs", "REPO_SUMMARY.md");
await Deno.writeTextFile(target, lines.join("\n"));

console.log(`Updated ${target}`);
