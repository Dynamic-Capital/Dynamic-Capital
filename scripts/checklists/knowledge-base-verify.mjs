#!/usr/bin/env node
import { readdir } from "node:fs/promises";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(MODULE_DIR, "..", "..");

function resolvePath(relativePath) {
  return path.join(PROJECT_ROOT, relativePath);
}

async function assertFileExists(relativePath, message) {
  const absolutePath = resolvePath(relativePath);
  try {
    const stats = await fs.stat(absolutePath);
    if (!stats.isFile()) {
      throw new Error(`${relativePath} exists but is not a file.`);
    }
  } catch (error) {
    throw new Error(`${message} (missing: ${relativePath})\n${error.message}`);
  }
}

async function assertDirectoryExists(relativePath, message) {
  const absolutePath = resolvePath(relativePath);
  try {
    const stats = await fs.stat(absolutePath);
    if (!stats.isDirectory()) {
      throw new Error(`${relativePath} exists but is not a directory.`);
    }
  } catch (error) {
    throw new Error(`${message} (missing: ${relativePath})\n${error.message}`);
  }
}

async function validateMetadataManifest() {
  const manifestPath = "docs/onedrive-shares/evlumlqt-folder.metadata.json";
  await assertFileExists(
    manifestPath,
    "Knowledge base metadata snapshot is required before training runs.",
  );

  const manifestContents = await fs.readFile(resolvePath(manifestPath), "utf8");
  let manifest;
  try {
    manifest = JSON.parse(manifestContents);
  } catch (error) {
    throw new Error(
      `Metadata manifest is not valid JSON. Parse error: ${error.message}`,
    );
  }

  if (!Array.isArray(manifest.children)) {
    throw new Error("Metadata manifest must expose a children array.");
  }

  const knowledgeBaseNode = manifest.children.find(
    (child) =>
      typeof child?.name === "string" && child.name === "knowledge_base",
  );

  if (!knowledgeBaseNode) {
    throw new Error(
      "Metadata manifest does not include the knowledge_base directory entry.",
    );
  }
}

async function validateLocalMirror() {
  await assertDirectoryExists(
    "data/knowledge_base",
    "Create data/knowledge_base to store the mirrored datasets.",
  );
  await assertFileExists(
    "data/knowledge_base/README.md",
    "Document the local knowledge base mirror in data/knowledge_base/README.md.",
  );

  const entries = await readdir(resolvePath("data/knowledge_base"));
  const materialised = entries.filter((entry) => entry !== "README.md");

  if (materialised.length === 0) {
    console.warn(
      "Warning: data/knowledge_base contains no mirrored dataset files. Upload them after syncing the OneDrive drop.",
    );
  }

  const readmeContents = await fs.readFile(
    resolvePath("data/knowledge_base/README.md"),
    "utf8",
  );
  if (!/Knowledge Base Mirror/i.test(readmeContents)) {
    throw new Error(
      "data/knowledge_base/README.md is missing the Knowledge Base Mirror heading.",
    );
  }
}

async function validateChecklistDoc() {
  await assertFileExists(
    "docs/knowledge-base-training-drop.md",
    "The drop checklist documentation is required for repeatability.",
  );
}

async function main() {
  try {
    await validateChecklistDoc();
    await validateMetadataManifest();
    await validateLocalMirror();
    console.log("Knowledge base drop checklist verification complete.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

await main();
