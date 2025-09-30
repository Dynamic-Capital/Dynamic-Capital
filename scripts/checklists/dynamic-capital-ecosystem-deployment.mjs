#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DOC_RELATIVE_PATH =
  "docs/dynamic-capital-ecosystem-deployment-checklist.md";
const DOC_ABSOLUTE_PATH = path.join(PROJECT_ROOT, DOC_RELATIVE_PATH);

const CHECKBOX_PATTERN = /^\s*-\s*\[(?<state>[ xX])\]\s*(?<text>.*)$/;

function createSection(title) {
  return {
    title,
    items: [],
    subsections: [],
  };
}

function createSubsection(title) {
  return {
    title,
    items: [],
  };
}

function finalizeItem(currentItem, target) {
  if (!currentItem) {
    return null;
  }

  const text = currentItem.text.trim();
  if (text.length > 0) {
    target.items.push({
      status: currentItem.status,
      text,
    });
  }

  return null;
}

function parseDocument(content) {
  const lines = content.split(/\r?\n/);

  const sections = [];
  let currentSection = null;
  let currentSubsection = null;
  let currentItem = null;

  const pushSectionIfPresent = () => {
    if (currentSection) {
      currentItem = finalizeItem(
        currentItem,
        currentSubsection ?? currentSection,
      );
      sections.push(currentSection);
    }
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();

    const sectionMatch = line.match(/^##\s+(?<title>.+)$/);
    if (sectionMatch) {
      if (
        sectionMatch.groups.title ===
          "Dynamic Capital Ecosystem Deployment Checklist"
      ) {
        return;
      }

      currentItem = finalizeItem(
        currentItem,
        currentSubsection ?? currentSection ?? createSection(""),
      );
      pushSectionIfPresent();
      currentSection = createSection(sectionMatch.groups.title.trim());
      currentSubsection = null;
      return;
    }

    const subsectionMatch = line.match(/^###\s+(?<title>.+)$/);
    if (subsectionMatch) {
      currentItem = finalizeItem(
        currentItem,
        currentSubsection ?? currentSection ?? createSection(""),
      );
      if (!currentSection) {
        throw new Error(
          `Encountered subsection "${subsectionMatch.groups.title.trim()}" before any section heading.`,
        );
      }
      currentSubsection = createSubsection(subsectionMatch.groups.title.trim());
      currentSection.subsections.push(currentSubsection);
      return;
    }

    const checkboxMatch = line.match(CHECKBOX_PATTERN);
    if (checkboxMatch) {
      if (!currentSection) {
        throw new Error(
          `Encountered checklist item "${checkboxMatch.groups.text.trim()}" before any section heading.`,
        );
      }

      currentItem = finalizeItem(
        currentItem,
        currentSubsection ?? currentSection,
      );

      const status = checkboxMatch.groups.state.toLowerCase() === "x"
        ? "complete"
        : "open";
      const target = currentSubsection ?? currentSection;
      if (!target) {
        throw new Error("Unable to resolve target for checklist item.");
      }

      currentItem = {
        status,
        text: checkboxMatch.groups.text.trim(),
      };
      return;
    }

    if (currentItem && line.trim() !== "") {
      currentItem.text += ` ${line.trim()}`;
    }
  });

  currentItem = finalizeItem(
    currentItem,
    currentSubsection ?? currentSection ?? createSection(""),
  );
  pushSectionIfPresent();

  return sections;
}

function flattenItems(section) {
  const sectionLevel = section.items ?? [];
  const subsectionItems = section.subsections.flatMap((subsection) =>
    subsection.items
  );
  return [...sectionLevel, ...subsectionItems];
}

function summarizeItems(items) {
  const total = items.length;
  const complete = items.filter((item) => item.status === "complete").length;
  return {
    total,
    complete,
    pending: total - complete,
  };
}

function printSection(section) {
  const allItems = flattenItems(section);
  if (allItems.length === 0) {
    console.log(`${section.title}: No checklist items detected.`);
    console.log("");
    return;
  }

  const summary = summarizeItems(allItems);
  console.log(
    `${section.title} — ${summary.total} task${summary.total === 1 ? "" : "s"}`,
  );
  console.log(`  Complete: ${summary.complete}`);
  console.log(`  Pending: ${summary.pending}`);

  if (section.items.length > 0) {
    console.log("");
    console.log("  Section tasks:");
    section.items.forEach((item, index) => {
      const statusLabel = item.status === "complete" ? "DONE" : "OPEN";
      console.log(`    ${index + 1}. [${statusLabel}] ${item.text}`);
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
    console.log(`    Complete: ${subsectionSummary.complete}`);
    console.log(`    Pending: ${subsectionSummary.pending}`);
    subsection.items.forEach((item, index) => {
      const statusLabel = item.status === "complete" ? "DONE" : "OPEN";
      console.log(`      ${index + 1}. [${statusLabel}] ${item.text}`);
    });
  });

  console.log("");
}

async function main() {
  const content = await readFile(DOC_ABSOLUTE_PATH, "utf8");
  const sections = parseDocument(content);

  if (sections.length === 0) {
    throw new Error(
      `No sections found in ${DOC_RELATIVE_PATH}. Ensure it contains "##" headings.`,
    );
  }

  console.log("Dynamic Capital ecosystem deployment checklist status");
  console.log(`Source: ${DOC_RELATIVE_PATH}`);
  console.log("");

  sections.forEach(printSection);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
