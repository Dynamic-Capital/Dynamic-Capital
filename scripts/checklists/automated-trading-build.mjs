#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DOC_RELATIVE_PATH = "docs/automated-trading-checklist.md";
const DOC_ABSOLUTE_PATH = path.join(PROJECT_ROOT, DOC_RELATIVE_PATH);

function parseSections(content) {
  const lines = content.split(/\r?\n/);
  const sections = [];
  let current = null;

  lines.forEach((line) => {
    const headingMatch = line.match(/^##\s+(?<title>.+)$/);
    if (headingMatch) {
      if (current) {
        current.content = current.lines.join("\n");
        sections.push(current);
      }
      current = {
        title: headingMatch.groups.title.trim(),
        lines: [],
      };
      return;
    }

    if (current) {
      current.lines.push(line);
    }
  });

  if (current) {
    current.content = current.lines.join("\n");
    sections.push(current);
  }

  if (sections.length === 0) {
    throw new Error(
      `No sections found in ${DOC_RELATIVE_PATH}. Ensure it contains at least one "##" heading.`,
    );
  }

  return sections;
}

function parseChecklist(sectionContent, heading) {
  const lines = sectionContent.split(/\r?\n/);
  const checkboxPattern = /^\s*-\s*\[(?<state>[ xX])\]\s*(?<text>.*)$/;
  const items = [];
  let currentItem = null;

  for (const line of lines) {
    const match = line.match(checkboxPattern);
    if (match) {
      if (currentItem) {
        currentItem.text = currentItem.text.trim();
        items.push(currentItem);
      }

      const state = match.groups.state.toLowerCase() === "x"
        ? "complete"
        : "open";

      currentItem = {
        status: state,
        text: match.groups.text.trim(),
      };
      continue;
    }

    const trimmed = line.trim();

    if (/^#+\s+/.test(trimmed)) {
      if (currentItem) {
        currentItem.text = currentItem.text.trim();
        items.push(currentItem);
        currentItem = null;
      }
      break;
    }

    if (!currentItem || trimmed === "") {
      continue;
    }

    if (/^-/u.test(trimmed)) {
      currentItem.text += `\n   ${trimmed}`;
    } else {
      currentItem.text += ` ${trimmed}`;
    }
  }

  if (currentItem) {
    currentItem.text = currentItem.text.trim();
    items.push(currentItem);
  }

  if (items.length === 0) {
    throw new Error(`No checklist items found under "${heading}".`);
  }

  return items;
}

function printSectionReport(section) {
  const total = section.items.length;
  const completed = section.items.filter((item) => item.status === "complete")
    .length;
  const pending = total - completed;

  console.log(`${section.title} — ${total} task${total === 1 ? "" : "s"}`);
  console.log(`  Complete: ${completed}`);
  console.log(`  Pending: ${pending}`);
  console.log("");

  section.items.forEach((item, index) => {
    const statusLabel = item.status === "complete" ? "DONE" : "OPEN";
    console.log(`${index + 1}. [${statusLabel}] ${item.text}`);
  });
  console.log("");
}

async function main() {
  const content = await readFile(DOC_ABSOLUTE_PATH, "utf8");
  const sections = parseSections(content)
    .filter((section) => /^\d+\./.test(section.title));

  if (sections.length === 0) {
    throw new Error(
      `No numbered sections found in ${DOC_RELATIVE_PATH}. Expected headings like "## 1. ...".`,
    );
  }

  sections.forEach((section) => {
    section.items = parseChecklist(section.content, section.title);
  });

  console.log(
    "Automated Trading System Build checklist status",
  );
  console.log(`Source: ${DOC_RELATIVE_PATH}`);
  console.log("");

  sections.forEach(printSectionReport);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
