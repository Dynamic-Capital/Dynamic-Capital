import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const [
  manifestPath = "dynamic-capital-ton/storage/manifest.json",
  pinsDocPath = "docs/ton-storage-pins.md",
] = process.argv.slice(2);

const lines = [];
const record = (key, value) => {
  lines.push(`${key}=${String(value)}`);
};

const sanitize = (value) => String(value ?? "").trim();

let hasFailure = false;

record("manifest_path", manifestPath);

let manifestRaw = "";
let manifest;
try {
  manifestRaw = await readFile(manifestPath, "utf8");
  manifest = JSON.parse(manifestRaw);
  record("manifest_present", "PASS");
} catch (error) {
  record("manifest_present", "FAIL");
  record("manifest_error", sanitize(error.message));
  console.log(lines.join("\n"));
  process.exitCode = 1;
  process.exit();
}

const bundles = Array.isArray(manifest?.bundles) ? manifest.bundles : [];
record("bundle_count", bundles.length);
if (!Array.isArray(manifest?.bundles)) {
  record("bundles_valid", "FAIL");
  hasFailure = true;
} else {
  record("bundles_valid", "PASS");
}

record("pins_doc_path", pinsDocPath);
let pinsDoc = "";
try {
  pinsDoc = await readFile(pinsDocPath, "utf8");
  record("pins_doc_present", "PASS");
} catch (error) {
  record("pins_doc_present", "FAIL");
  record("pins_doc_error", sanitize(error.message));
  hasFailure = true;
}

const normalizePath = (value) => value.split(/\\+/g).join("/");

async function hashPath(absolutePath, hash, relativePath) {
  let stats;
  try {
    stats = await stat(absolutePath);
  } catch (error) {
    throw new Error(`missing path: ${relativePath}`);
  }

  if (stats.isFile()) {
    const data = await readFile(absolutePath);
    hash.update(`file:${relativePath}:${data.length}\n`);
    hash.update(data);
    return;
  }

  if (stats.isDirectory()) {
    hash.update(`dir:${relativePath}\n`);
    const entries = await readdir(absolutePath, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.name === "." || entry.name === "..") {
        continue;
      }
      const nextAbsolute = join(absolutePath, entry.name);
      const nextRelative = relativePath
        ? `${relativePath}/${entry.name}`
        : entry.name;
      if (entry.isDirectory() || entry.isFile()) {
        await hashPath(nextAbsolute, hash, nextRelative);
      }
    }
    return;
  }

  throw new Error(`unsupported entry type at ${relativePath}`);
}

async function computeBundleHash(paths) {
  const hash = createHash("sha256");
  for (const rawPath of paths) {
    const normalized = normalizePath(String(rawPath || "").trim());
    if (!normalized) {
      continue;
    }
    const absolute = resolve(normalized);
    await hashPath(absolute, hash, normalized);
  }
  return hash.digest("hex");
}

for (let index = 0; index < bundles.length; index += 1) {
  const bundle = bundles[index] ?? {};
  const identifier = sanitize(bundle.id) || `bundle_${index}`;
  const safeId =
    identifier.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") ||
    `bundle_${index}`;
  const expected = sanitize(bundle.expectedSha256).toLowerCase();
  const pathList = Array.isArray(bundle.paths) ? bundle.paths : [];

  record(`${safeId}_label`, sanitize(bundle.label));
  record(
    `${safeId}_paths`,
    pathList.map((path) => normalizePath(String(path))).join(","),
  );
  record(`${safeId}_expected`, expected || "MISSING");

  if (!Array.isArray(bundle.paths) || bundle.paths.length === 0) {
    record(`${safeId}_paths_status`, "FAIL");
    hasFailure = true;
    continue;
  }

  try {
    const computed = await computeBundleHash(pathList);
    record(`${safeId}_computed`, computed);
    if (expected && computed === expected) {
      record(`${safeId}_hash_status`, "PASS");
    } else {
      record(`${safeId}_hash_status`, "FAIL");
      hasFailure = true;
    }

    if (pinsDoc) {
      const needle = `bag:${expected}`;
      const documented = expected && pinsDoc.includes(needle);
      record(`${safeId}_pin_reference`, documented ? "PASS" : "FAIL");
      if (!documented) {
        hasFailure = true;
      }
    }
  } catch (error) {
    record(`${safeId}_hash_status`, "ERROR");
    record(`${safeId}_error`, sanitize(error.message));
    hasFailure = true;
  }
}

if (hasFailure) {
  record("ton_storage_status", "FAIL");
  process.exitCode = 1;
} else {
  record("ton_storage_status", "PASS");
}

console.log(lines.join("\n"));
