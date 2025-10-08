import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const SRC_DIRS = ["src", "supabase/functions"];
const PACKAGE_SCAN_SKIP = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  "tmp",
  "_static",
  ".turbo",
]);

function walk(root, dir) {
  const out = [];
  const target = path.join(root, dir);
  if (!fs.existsSync(target)) return out;
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const fullPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(root, path.join(dir, entry.name)));
    } else if (/\.(ts|js|mjs|tsx|jsx|json)$/.test(entry.name)) {
      out.push(fullPath);
    }
  }
  return out;
}

function read(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function findPackageJsonFiles(root, dir = ".") {
  const results = [];
  const target = path.join(root, dir);
  if (!fs.existsSync(target)) return results;

  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (PACKAGE_SCAN_SKIP.has(entry.name)) continue;
      results.push(...findPackageJsonFiles(root, entryPath));
    } else if (entry.isFile() && entry.name === "package.json") {
      results.push(path.join(root, entryPath));
    }
  }

  return results;
}

function collectNextBuildScripts(root, packageJsonPaths) {
  const results = [];

  for (const pkgPath of packageJsonPaths) {
    let parsed;
    try {
      parsed = JSON.parse(read(pkgPath));
    } catch {
      continue;
    }

    const scripts = parsed?.scripts;
    if (!scripts || typeof scripts !== "object") continue;

    for (const [name, command] of Object.entries(scripts)) {
      if (typeof command !== "string") continue;
      if (!/\bnext\s+build\b/.test(command)) continue;

      results.push({
        package_file: path.relative(root, pkgPath),
        script: name,
        command,
      });
    }
  }

  return results;
}

function summarizeDuplicateNextBuilds(entries) {
  const groups = new Map();

  for (const entry of entries) {
    const normalized = entry.command.trim();
    const existing = groups.get(normalized) ?? [];
    existing.push(entry);
    groups.set(normalized, existing);
  }

  const duplicates = [];

  for (const [command, commandEntries] of groups.entries()) {
    if (commandEntries.length <= 1) continue;

    const locations = commandEntries
      .map(({ package_file, script }) => ({ package_file, script }))
      .sort((a, b) =>
        a.package_file === b.package_file
          ? a.script.localeCompare(b.script)
          : a.package_file.localeCompare(b.package_file)
      );

    duplicates.push({
      command,
      count: commandEntries.length,
      locations,
    });
  }

  return duplicates.sort((a, b) => a.command.localeCompare(b.command));
}

export function scanCode({
  root = process.cwd(),
  outputDir = path.join(process.cwd(), ".audit"),
} = {}) {
  const files = SRC_DIRS.flatMap((dir) => walk(root, dir));
  const packageJsonPaths = findPackageJsonFiles(root);
  const nextBuildScripts = collectNextBuildScripts(root, packageJsonPaths);
  const duplicateNextBuilds = summarizeDuplicateNextBuilds(nextBuildScripts);

  const cbVals = new Set();
  const cbDefs = new Set();
  const fnDirs = new Set();
  const fnRefs = new Set();
  const tableRefs = new Set();

  const fnRoot = path.join(root, "supabase", "functions");
  if (fs.existsSync(fnRoot)) {
    for (const entry of fs.readdirSync(fnRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) fnDirs.add(entry.name);
    }
  }

  const reCallbackData = /callback_data\s*:\s*['"]([^'"]+)['"]/g;
  const reCBMapValue = /CB\.\w+\s*=\s*['"]([^'"]+)['"]/g;
  const reCBObject = /export\s+const\s+CB\s*=\s*\{([\s\S]*?)\}\s*as\s*const/s;
  const reCBPair = /['"]?([A-Z0-9_]+)['"]?\s*:\s*['"]([^'"]+)['"]/g;
  const reFromTable = /\.from\(\s*['"]([a-zA-Z0-9_\.]+)['"]\s*\)/g;
  const reFuncFetch = /\/functions\/v1\/([a-zA-Z0-9\-_]+)/g;
  const reFuncNameStr = /['"`]([a-zA-Z0-9\-_]+)['"`]/g;

  for (const filePath of files) {
    const source = read(filePath);
    for (const match of source.matchAll(reCallbackData)) cbVals.add(match[1]);

    const obj = source.match(reCBObject)?.[1];
    if (obj) {
      for (const match of obj.matchAll(reCBPair)) {
        cbVals.add(match[2]);
        cbDefs.add(match[2]);
      }
    }
    for (const match of source.matchAll(reCBMapValue)) {
      cbVals.add(match[1]);
      cbDefs.add(match[1]);
    }

    for (const match of source.matchAll(reFromTable)) tableRefs.add(match[1]);
    for (const match of source.matchAll(reFuncFetch)) fnRefs.add(match[1]);
    if (/functions\/v1/.test(source)) {
      for (const match of source.matchAll(reFuncNameStr)) {
        const name = match[1];
        if (fnDirs.has(name)) fnRefs.add(name);
      }
    }
  }

  const output = {
    scanned_files: files.length,
    edge_functions: {
      present: [...fnDirs].sort(),
      referenced: [...fnRefs].sort(),
    },
    callbacks: {
      defined: [...cbDefs].sort(),
      used_anywhere: [...cbVals].sort(),
    },
    tables: { referenced: [...tableRefs].sort() },
    next_build_scripts: {
      total: nextBuildScripts.length,
      entries: nextBuildScripts
        .slice()
        .sort((a, b) =>
          a.package_file === b.package_file
            ? a.script.localeCompare(b.script)
            : a.package_file.localeCompare(b.package_file)
        ),
      duplicates: duplicateNextBuilds,
    },
  };

  fs.mkdirSync(outputDir, { recursive: true });
  const destination = path.join(outputDir, "code_scan.json");
  fs.writeFileSync(destination, JSON.stringify(output, null, 2));

  return output;
}

if (
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url
) {
  const result = scanCode();
  console.log(`[audit] scanned ${result.scanned_files} files`);
}
