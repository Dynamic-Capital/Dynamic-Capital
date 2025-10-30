#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const forbiddenChars = /[<>:"/\\|?*]/; // invalid on Windows
const reservedNames = new Set([
  "CON",
  "PRN",
  "AUX",
  "NUL",
  "COM1",
  "COM2",
  "COM3",
  "COM4",
  "COM5",
  "COM6",
  "COM7",
  "COM8",
  "COM9",
  "LPT1",
  "LPT2",
  "LPT3",
  "LPT4",
  "LPT5",
  "LPT6",
  "LPT7",
  "LPT8",
  "LPT9",
]);

function isBadSegment(seg) {
  if (!seg) return false;
  const base = seg.replace(/\.$/, "");
  if (reservedNames.has(base.toUpperCase())) return true;
  if (forbiddenChars.test(seg)) return true;
  if (seg.endsWith(" ") || seg.endsWith(".")) return true;
  return false;
}

function checkPath(rel) {
  // Check each segment
  const parts = rel.split(/[\\/]+/);
  for (const seg of parts) {
    if (isBadSegment(seg)) return `invalid segment: "${seg}"`;
  }
  // Long path check (NTFS limit ~260 incl. prefix); be conservative
  if (rel.length > 240) return "path too long (>240 chars)";
  return null;
}

function getTrackedFiles() {
  const r = spawnSync("git", ["ls-files"], { encoding: "utf8" });
  if (r.status === 0) {
    return r.stdout.split(/\r?\n/).filter(Boolean);
  }
  // Fallback: walk filesystem
  /** @type {string[]} */
  const results = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      const rel = path.relative(process.cwd(), full);
      if (ent.isDirectory()) {
        // Skip typical ignored folders
        if (
          /^(node_modules|.git|dist|.next|out|.deno|.pnpm-store)$/i.test(
            ent.name,
          )
        ) continue;
        walk(full);
      } else if (ent.isFile()) {
        results.push(rel.replace(/\\/g, "/"));
      }
    }
  }
  walk(process.cwd());
  return results;
}

const files = getTrackedFiles();
const offenders = [];
for (const f of files) {
  const res = checkPath(f);
  if (res) offenders.push({ file: f, reason: res });
}

if (offenders.length) {
  console.error("\nWindows-invalid filenames detected:");
  for (const o of offenders) {
    console.error(` - ${o.file}  -> ${o.reason}`);
  }
  process.exit(1);
} else {
  console.log("OK: No Windows-invalid filenames detected.");
}
