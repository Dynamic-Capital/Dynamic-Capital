#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const LOCAL_ROOT = path.join(PROJECT_ROOT, "data/knowledge_base");
const INDEX_PATH = path.join(LOCAL_ROOT, "index.json");

const USAGE = `Usage: node ${
  path.relative(PROJECT_ROOT, __filename)
} [--drop <id>] [--manifest <path>]`;

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const result = { dropId: null, manifestOverride: null };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--help" || value === "-h") {
      console.log(USAGE);
      process.exit(0);
    }

    if (value === "--drop") {
      const next = argv[i + 1];
      if (!next) {
        throw new Error("--drop requires an identifier");
      }
      result.dropId = next;
      i += 1;
      continue;
    }

    if (value === "--manifest") {
      const next = argv[i + 1];
      if (!next) {
        throw new Error("--manifest requires a path");
      }
      result.manifestOverride = next;
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${value}`);
  }

  if (result.manifestOverride && !result.dropId) {
    throw new Error("--manifest requires --drop to be specified");
  }

  return result;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${path.relative(PROJECT_ROOT, filePath)}`);
  }

  const contents = fs.readFileSync(filePath, "utf8");
  try {
    return JSON.parse(contents);
  } catch (error) {
    throw new Error(
      `Failed to parse JSON at ${path.relative(PROJECT_ROOT, filePath)}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function toPosixPath(value) {
  return value.split(path.sep).join(path.posix.sep);
}

function normaliseDropPath(dropId, relativePath) {
  if (!dropId) return toPosixPath(relativePath);
  const normalised = toPosixPath(relativePath);
  if (normalised.startsWith(`${dropId}/`) || normalised === dropId) {
    return normalised;
  }
  return `${dropId}/${normalised}`;
}

function collectFromOneDriveManifest(manifest, dropId) {
  function walk(item, prefix = "") {
    const name = typeof item?.name === "string" ? item.name : "";
    const currentPath = prefix ? path.posix.join(prefix, name) : name;
    const results = [];

    if (!name) {
      return results;
    }

    if (item.folder) {
      const children = Array.isArray(item.children) ? item.children : [];
      for (const child of children) {
        results.push(...walk(child, currentPath));
      }
      return results;
    }

    if (!item.file) {
      fail(`Metadata entry for ${currentPath} is missing file details.`);
      return results;
    }

    results.push({
      path: normaliseDropPath(dropId, currentPath),
      checksum: null,
    });
    return results;
  }

  if (!manifest || typeof manifest !== "object") {
    fail("Metadata root is missing or invalid.");
    return [];
  }

  const children = Array.isArray(manifest.children) ? manifest.children : [];
  const knowledgeNode = children.find((child) =>
    child?.name === "knowledge_base"
  );

  if (!knowledgeNode) {
    fail("knowledge_base folder not present in metadata snapshot.");
    return [];
  }

  if (!knowledgeNode.folder) {
    fail(
      "knowledge_base entry is expected to be a folder in metadata snapshot.",
    );
    return [];
  }

  const results = [];
  const knowledgeChildren = Array.isArray(knowledgeNode.children)
    ? knowledgeNode.children
    : [];
  for (const child of knowledgeChildren) {
    results.push(...walk(child));
  }
  if (results.length === 0) {
    fail("No files recorded under knowledge_base in metadata snapshot.");
  }

  return results;
}

function collectFromDropManifest(manifest, dropId) {
  if (!manifest || typeof manifest !== "object") {
    fail("Manifest JSON is missing or invalid.");
    return [];
  }

  const artifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts : [];
  if (artifacts.length === 0) {
    fail("Manifest does not list any artifacts.");
    return [];
  }

  return artifacts.map((artifact, index) => {
    const relativePath = typeof artifact?.path === "string"
      ? artifact.path
      : "";
    if (!relativePath) {
      fail(`Artifact entry ${index} is missing a path.`);
    }

    const checksum = typeof artifact?.checksum === "string"
      ? artifact.checksum.toLowerCase()
      : null;

    return {
      path: normaliseDropPath(dropId, relativePath),
      checksum,
    };
  });
}

function computeSha256(filePath) {
  const data = fs.readFileSync(filePath);
  const hash = createHash("sha256");
  hash.update(data);
  return hash.digest("hex");
}

async function verifyLocalMirror(files) {
  if (!fs.existsSync(LOCAL_ROOT)) {
    fail(
      `Local mirror not found at ${path.relative(PROJECT_ROOT, LOCAL_ROOT)}.`,
    );
    return;
  }

  const missing = [];
  for (const file of files) {
    const absolutePath = path.join(LOCAL_ROOT, ...file.path.split("/"));
    if (!fs.existsSync(absolutePath)) {
      missing.push(file.path);
      continue;
    }

    if (file.checksum) {
      try {
        const digest = await computeSha256(absolutePath);
        if (digest.toLowerCase() !== file.checksum) {
          fail(
            `Checksum mismatch for ${file.path}: expected ${file.checksum}, got ${digest}.`,
          );
        }
      } catch (error) {
        fail(
          `Failed to compute checksum for ${file.path}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  if (missing.length > 0) {
    fail(
      `Local mirror is missing the following files: ${missing.join(", ")}.`,
    );
  }
}

function verifyReadme(files) {
  const readmePath = path.join(LOCAL_ROOT, "README.md");
  if (!fs.existsSync(readmePath)) {
    fail(
      `Provenance README missing at ${
        path.relative(PROJECT_ROOT, readmePath)
      }.`,
    );
    return;
  }

  const readme = fs.readFileSync(readmePath, "utf8");
  if (readme.trim().length === 0) {
    fail("Provenance README is empty.");
    return;
  }

  for (const file of files) {
    if (!file.path) continue;
    if (!readme.includes(file.path)) {
      fail(
        `Provenance README does not reference ${file.path}. Update the table to document the drop.`,
      );
    }
  }
}

function dedupeFiles(files) {
  const seen = new Map();
  for (const file of files) {
    if (!file.path) continue;
    const key = file.path;
    if (!seen.has(key)) {
      seen.set(key, file);
      continue;
    }

    const existing = seen.get(key);
    if (!existing.checksum && file.checksum) {
      seen.set(key, file);
    }
  }
  return Array.from(seen.values());
}

async function verifyDrop(drop, manifestOverride) {
  const manifestPath = manifestOverride
    ? path.resolve(PROJECT_ROOT, manifestOverride)
    : typeof drop.manifest === "string" && drop.manifest.length > 0
    ? path.join(PROJECT_ROOT, drop.manifest)
    : null;

  if (!manifestPath) {
    fail(`Drop ${drop.id} is missing a manifest path.`);
    return;
  }

  let manifest;
  try {
    manifest = readJson(manifestPath);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
    return;
  }

  const files = Array.isArray(manifest?.artifacts)
    ? collectFromDropManifest(manifest, drop.id)
    : collectFromOneDriveManifest(manifest, drop.id);

  const filtered = dedupeFiles(files).filter((file) => !!file.path);
  if (filtered.length === 0) {
    return;
  }

  await verifyLocalMirror(filtered);
  verifyReadme(filtered);

  if (!process.exitCode) {
    console.log(
      `Validated drop ${drop.id} with ${filtered.length} artefacts against local mirror and provenance README.`,
    );
  }
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  let index;
  try {
    index = readJson(INDEX_PATH);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
    return;
  }

  const drops = Array.isArray(index?.drops) ? index.drops : [];
  if (drops.length === 0) {
    fail("No knowledge base drops have been registered in index.json.");
    return;
  }

  const selectedDrops = args.dropId
    ? drops.filter((drop) => drop?.id === args.dropId)
    : drops;

  if (selectedDrops.length === 0) {
    fail(
      args.dropId
        ? `Drop '${args.dropId}' was not found in data/knowledge_base/index.json.`
        : "No drops matched the selection criteria.",
    );
    return;
  }

  for (const drop of selectedDrops) {
    await verifyDrop(drop, args.manifestOverride);
  }
}

await main();
