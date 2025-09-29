import fs from "fs";
import path from "path";

const ROOT = process.cwd();
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

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|js|mjs|tsx|jsx|json)$/.test(e.name)) out.push(p);
  }
  return out;
}

function read(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

const files = SRC_DIRS.flatMap((d) => walk(path.join(ROOT, d)));

function findPackageJsonFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (PACKAGE_SCAN_SKIP.has(entry.name)) continue;
      results.push(...findPackageJsonFiles(entryPath));
    } else if (entry.isFile() && entry.name === "package.json") {
      results.push(entryPath);
    }
  }

  return results;
}

function collectNextBuildScripts(packageJsonPaths) {
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
        package_file: path.relative(ROOT, pkgPath),
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

const packageJsonPaths = findPackageJsonFiles(ROOT);
const nextBuildScripts = collectNextBuildScripts(packageJsonPaths);
const duplicateNextBuilds = summarizeDuplicateNextBuilds(nextBuildScripts);

const cbVals = new Set(); // callback_data values
const cbDefs = new Set(); // where defined (constants)
const fnDirs = new Set(); // edge functions (folder names)
const fnRefs = new Set(); // code references to function names
const tableRefs = new Set(); // db.from('table') table names

// Edge functions present (by directory name)
const FN_ROOT = path.join(ROOT, "supabase", "functions");
if (fs.existsSync(FN_ROOT)) {
  for (const e of fs.readdirSync(FN_ROOT, { withFileTypes: true })) {
    if (e.isDirectory()) fnDirs.add(e.name);
  }
}

// Regexes
const reCallbackData = /callback_data\s*:\s*['"]([^'"]+)['"]/g;
const reCBMapValue = /CB\.\w+\s*=\s*['"]([^'"]+)['"]/g; // in case of assignments
const reCBObject = /export\s+const\s+CB\s*=\s*\{([\s\S]*?)\}\s*as\s*const/s;
const reCBPair = /['"]?([A-Z0-9_]+)['"]?\s*:\s*['"]([^'"]+)['"]/g;
const reFromTable = /\.from\(\s*['"]([a-zA-Z0-9_\.]+)['"]\s*\)/g;
const reFuncFetch = /\/functions\/v1\/([a-zA-Z0-9\-_]+)/g;
const reFuncNameStr = /['"`]([a-zA-Z0-9\-_]+)['"`]/g;

for (const f of files) {
  const s = read(f);
  // find callback_data usage
  for (const m of s.matchAll(reCallbackData)) cbVals.add(m[1]);

  // find CB object values
  const obj = s.match(reCBObject)?.[1];
  if (obj) {
    for (const m of obj.matchAll(reCBPair)) {
      cbVals.add(m[2]);
      cbDefs.add(m[2]);
    }
  }
  for (const m of s.matchAll(reCBMapValue)) {
    cbVals.add(m[1]);
    cbDefs.add(m[1]);
  }

  // find table refs
  for (const m of s.matchAll(reFromTable)) tableRefs.add(m[1]);

  // find function refs via fetch URLs
  for (const m of s.matchAll(reFuncFetch)) fnRefs.add(m[1]);
  // also catch explicit string mentions if preceded by functions/v1 var builds
  if (/functions\/v1/.test(s)) {
    for (const m of s.matchAll(reFuncNameStr)) {
      const name = m[1];
      if (fnDirs.has(name)) fnRefs.add(name);
    }
  }
}

// Output
const out = {
  scanned_files: files.length,
  edge_functions: {
    present: [...fnDirs].sort(),
    referenced: [...fnRefs].sort(),
  },
  callbacks: { defined: [...cbDefs].sort(), used_anywhere: [...cbVals].sort() },
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
fs.mkdirSync(".audit", { recursive: true });
fs.writeFileSync(".audit/code_scan.json", JSON.stringify(out, null, 2));
