#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatStatusLabel,
  parseHierarchicalChecklist,
  summarizeItems,
} from "./utils/markdown-checklist.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DOC_RELATIVE_PATH = "docs/web-site-map.md";
const DOC_ABSOLUTE_PATH = path.join(PROJECT_ROOT, DOC_RELATIVE_PATH);
const IMPLEMENTATION_TITLE = "Implementation Checklist";
const STAGE_PREFIX = "Stage 1";

function formatSummary(summary) {
  if (summary.total === 0) {
    return "0 complete";
  }

  const percentage = Math.round((summary.complete / summary.total) * 100);
  return `${summary.complete}/${summary.total} complete (${percentage}% done)`;
}

function printItem(item, index) {
  console.log(
    `${index + 1}. [${formatStatusLabel(item.status)}] ${
      item.text.replaceAll("\n", "\n   ")
    }`,
  );
}

async function main() {
  const content = await readFile(DOC_ABSOLUTE_PATH, "utf8");
  const sections = parseHierarchicalChecklist(content);

  const implementationSection = sections.find((section) =>
    section.title === IMPLEMENTATION_TITLE
  );

  if (!implementationSection) {
    throw new Error(
      `Unable to find the "${IMPLEMENTATION_TITLE}" section in ${DOC_RELATIVE_PATH}.`,
    );
  }

  const stageSubsection = implementationSection.subsections.find((subsection) =>
    subsection.title.startsWith(STAGE_PREFIX)
  );

  if (!stageSubsection) {
    throw new Error(
      `Unable to locate a subsection beginning with "${STAGE_PREFIX}" in ${DOC_RELATIVE_PATH}.`,
    );
  }

  const summary = summarizeItems(stageSubsection.items);

  console.log("Dynamic Capital Stage 1 implementation checklist status");
  console.log(`Source: ${DOC_RELATIVE_PATH}`);
  console.log(`Stage: ${stageSubsection.title}`);
  console.log("");
  console.log(`Progress: ${formatSummary(summary)}`);
  console.log("");

  if (stageSubsection.items.length === 0) {
    console.log("No checklist items found under this stage.");
    return;
  }

  console.log("Tasks:");
  stageSubsection.items.forEach(printItem);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
