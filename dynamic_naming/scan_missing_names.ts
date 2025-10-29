#!/usr/bin/env -S deno run --allow-read

import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { defaultDynamicNamingEngine } from "./engine.ts";

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".markdown",
  ".mdx",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".yml",
  ".yaml",
  ".toml",
  ".ini",
  ".cfg",
  ".conf",
  ".txt",
  ".sql",
  ".py",
  ".rs",
  ".go",
  ".rb",
  ".java",
  ".kt",
  ".swift",
  ".cs",
  ".c",
  ".h",
  ".hpp",
  ".hs",
  ".lua",
  ".css",
  ".scss",
  ".less",
  ".html",
  ".htm",
  ".xml",
  ".csv",
  ".tsv",
  ".ps1",
  ".sh",
  ".bash",
]);

const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "tmp",
  "temp",
  "coverage",
  "__pycache__",
  ".next",
  ".turbo",
  ".vercel",
  "out",
  "artifacts",
  "target",
  "vendor",
  "ios",
  "android",
]);

interface CodeOccurrence {
  readonly files: Set<string>;
}

const occurrences = new Map<string, CodeOccurrence>();

const engine = defaultDynamicNamingEngine;
const knownPrefixes = new Set(
  engine.listPrefixes().map((prefix) => prefix.code),
);

const repoRoot = join(fileURLToPath(new URL("../", import.meta.url)));

async function walk(directory: string): Promise<void> {
  for await (const entry of Deno.readDir(directory)) {
    if (entry.name.startsWith(".")) {
      if (IGNORE_DIRS.has(entry.name)) {
        continue;
      }
      // Allow dotfiles that are not directories to be scanned below.
    }

    const fullPath = join(directory, entry.name);

    if (entry.isSymlink) {
      continue;
    }

    if (entry.isDirectory) {
      if (IGNORE_DIRS.has(entry.name)) {
        continue;
      }
      await walk(fullPath);
      continue;
    }

    if (!entry.isFile) {
      continue;
    }

    const ext = extname(entry.name).toLowerCase();
    if (ext && !TEXT_EXTENSIONS.has(ext)) {
      continue;
    }

    // Skip very large files to keep the scan fast.
    const stat = await Deno.stat(fullPath);
    if (stat.size > 2_000_000) {
      continue;
    }

    let content: string;
    try {
      content = await Deno.readTextFile(fullPath);
    } catch {
      continue;
    }

    const pattern = /\b[A-Z]{2,6}(?:-[A-Z0-9]{2,12})+\b/g;
    const matches = content.match(pattern);
    if (!matches) {
      continue;
    }

    const relativePath = relative(repoRoot, fullPath);
    for (const rawCode of matches) {
      const code = rawCode.replace(/\u2010|\u2011|\u2012|\u2013|\u2014/g, "-");
      const prefix = code.split("-", 1)[0];
      if (!knownPrefixes.has(prefix)) {
        continue;
      }
      let occurrence = occurrences.get(code);
      if (!occurrence) {
        occurrence = { files: new Set<string>() };
        occurrences.set(code, occurrence);
      }
      occurrence.files.add(relativePath);
    }
  }
}

await walk(repoRoot);

const missing: Array<{
  readonly code: string;
  readonly reason: string;
  readonly files: readonly string[];
}> = [];

for (const [code, occurrence] of occurrences) {
  try {
    engine.parse(code);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    missing.push({
      code,
      reason,
      files: Array.from(occurrence.files).sort(),
    });
  }
}

missing.sort((a, b) => a.code.localeCompare(b.code));

if (missing.length === 0) {
  console.log("No missing component names detected for discovered codes.");
  Deno.exit(0);
}

console.log("Missing component names detected:\n");
for (const item of missing) {
  console.log(`- ${item.code}: ${item.reason}`);
  for (const file of item.files) {
    console.log(`    • ${file}`);
  }
  console.log("");
}

Deno.exit(1);
