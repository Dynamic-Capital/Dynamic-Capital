#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const METADATA_PATH = path.join(
  PROJECT_ROOT,
  "docs/onedrive-shares/evlumlqt-folder.metadata.json",
);
const LOCAL_ROOT = path.join(PROJECT_ROOT, "data/knowledge_base");

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function readMetadata() {
  if (!fs.existsSync(METADATA_PATH)) {
    fail(
      `Metadata snapshot not found at ${
        path.relative(PROJECT_ROOT, METADATA_PATH)
      }.`,
    );
    return null;
  }

  try {
    const contents = fs.readFileSync(METADATA_PATH, "utf8");
    return JSON.parse(contents);
  } catch (error) {
    fail(
      `Failed to parse metadata JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

function ensureKnowledgeBaseNode(node) {
  if (!node || typeof node !== "object") {
    fail("Metadata root is missing or invalid.");
    return null;
  }

  const children = Array.isArray(node.children) ? node.children : [];
  const knowledgeNode = children.find((child) =>
    child?.name === "knowledge_base"
  );

  if (!knowledgeNode) {
    fail("knowledge_base folder not present in metadata snapshot.");
    return null;
  }

  if (!knowledgeNode.folder) {
    fail(
      "knowledge_base entry is expected to be a folder in metadata snapshot.",
    );
    return null;
  }

  return knowledgeNode;
}

function collectFiles(item, prefix = "") {
  const name = typeof item?.name === "string" ? item.name : "";
  const currentPath = prefix ? path.posix.join(prefix, name) : name;
  const results = [];

  if (!name) {
    return results;
  }

  if (item.folder) {
    const children = Array.isArray(item.children) ? item.children : [];
    for (const child of children) {
      results.push(...collectFiles(child, currentPath));
    }
    return results;
  }

  if (!item.file) {
    fail(`Metadata entry for ${currentPath} is missing file details.`);
    return results;
  }

  results.push({
    path: currentPath,
    mimeType: item.file?.mimeType ?? "",
    lastModified: item.lastModifiedDateTime ?? "",
  });
  return results;
}

function verifyLocalMirror(files) {
  if (!fs.existsSync(LOCAL_ROOT)) {
    fail(
      `Local mirror not found at ${path.relative(PROJECT_ROOT, LOCAL_ROOT)}.`,
    );
    return;
  }

  const missing = [];
  for (const file of files) {
    const absolutePath = path.join(LOCAL_ROOT, file.path);
    if (!fs.existsSync(absolutePath)) {
      missing.push(file.path);
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
    if (!readme.includes(file.path)) {
      fail(
        `Provenance README does not reference ${file.path}. Update the table to document the drop.`,
      );
    }
  }
}

function main() {
  const metadata = readMetadata();
  if (!metadata) return;

  const knowledgeNode = ensureKnowledgeBaseNode(metadata);
  if (!knowledgeNode) return;

  const files = [];
  const knowledgeChildren = Array.isArray(knowledgeNode.children)
    ? knowledgeNode.children
    : [];
  for (const child of knowledgeChildren) {
    files.push(...collectFiles(child));
  }
  if (files.length === 0) {
    fail("No files recorded under knowledge_base in metadata snapshot.");
    return;
  }

  verifyLocalMirror(files);
  verifyReadme(files);

  if (!process.exitCode) {
    console.log(
      `Validated ${files.length} knowledge base artefacts against local mirror and provenance README.`,
    );
  }
}

main();
