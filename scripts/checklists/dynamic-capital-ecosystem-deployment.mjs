#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatStatusLabel,
  hasItems,
  parseHierarchicalChecklist,
  summarizeItems,
  summarizeSection,
  summarizeSections,
} from "./utils/markdown-checklist.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DOC_RELATIVE_PATH =
  "docs/dynamic-capital-ecosystem-deployment-checklist.md";
const DOC_ABSOLUTE_PATH = path.join(PROJECT_ROOT, DOC_RELATIVE_PATH);

function formatSummaryLine(summary) {
  if (summary.total === 0) {
    return "0 complete";
  }

  const percentage = Math.round((summary.complete / summary.total) * 100);
  return `${summary.complete}/${summary.total} complete (${percentage}% done)`;
}

function printSection(section) {
  if (!hasItems(section)) {
    console.log(`${section.title}: No checklist items detected.`);
    console.log("");
    return;
  }

  const sectionSummary = summarizeSection(section);
  console.log(
    `${section.title} — ${sectionSummary.total} task${
      sectionSummary.total === 1 ? "" : "s"
    }`,
  );
  console.log(`  Progress: ${formatSummaryLine(sectionSummary)}`);

  if (section.items.length > 0) {
    console.log("");
    console.log("  Section tasks:");
    section.items.forEach((item, index) => {
      console.log(
        `    ${index + 1}. [${formatStatusLabel(item.status)}] ${item.text}`,
      );
    });
  }

  section.subsections.forEach((subsection) => {
    if (subsection.items.length === 0) {
      return;
    }
    const subsectionSummary = summarizeItems(subsection.items);
    console.log("");
    console.log(
      `  ${subsection.title} — ${subsectionSummary.total} task${
        subsectionSummary.total === 1 ? "" : "s"
      }`,
    );
    console.log(`    Progress: ${formatSummaryLine(subsectionSummary)}`);
    subsection.items.forEach((item, index) => {
      console.log(
        `      ${index + 1}. [${formatStatusLabel(item.status)}] ${item.text}`,
      );
    });
  });

  console.log("");
}

async function main() {
  const content = await readFile(DOC_ABSOLUTE_PATH, "utf8");
  const sections = parseHierarchicalChecklist(content);

  if (sections.length === 0) {
    throw new Error(
      `No sections found in ${DOC_RELATIVE_PATH}. Ensure it contains "##" headings.`,
    );
  }

  const overall = summarizeSections(sections);

  console.log("Dynamic Capital ecosystem deployment checklist status");
  console.log(`Source: ${DOC_RELATIVE_PATH}`);
  console.log("");
  console.log(`Overall progress: ${formatSummaryLine(overall)}`);
  console.log("");

  sections.forEach(printSection);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
