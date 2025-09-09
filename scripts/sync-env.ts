// scripts/sync-env.ts
// Sync missing variables from .env.example into .env.local, preserving existing values.

import fs from "node:fs";
import path from "node:path";

const examplePath = path.resolve(".env.example");
const localPath = path.resolve(".env.local");

if (!fs.existsSync(localPath)) {
  fs.writeFileSync(localPath, "");
}

const exampleContent = fs.readFileSync(examplePath, "utf8");
const localContent = fs.readFileSync(localPath, "utf8");

const localKeys = new Set<string>();
for (const line of localContent.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
  if (m) localKeys.add(m[1]);
}

const additions: string[] = [];
let buffer: string[] = [];
for (const line of exampleContent.split(/\r?\n/)) {
  if (/^\s*(#.*)?$/.test(line)) {
    buffer.push(line);
    continue;
  }
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
  if (m) {
    const key = m[1];
    if (!localKeys.has(key)) {
      additions.push(...buffer, line);
    }
  }
  buffer = [];
}

if (additions.length > 0) {
  const prefix = localContent.endsWith("\n") || localContent.length === 0 ? "" : "\n";
  const newContent = localContent + prefix + additions.join("\n") + "\n";
  fs.writeFileSync(localPath, newContent);
  console.log(
    "Appended",
    additions.filter((l) => !l.startsWith("#") && l).length,
    "variables to .env.local",
  );
} else {
  console.log(".env.local is up to date");
}

