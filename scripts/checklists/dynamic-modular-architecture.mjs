#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DOC_RELATIVE_PATH = "docs/dynamic-capital-modular-architecture.md";
const DOC_ABSOLUTE_PATH = path.join(PROJECT_ROOT, DOC_RELATIVE_PATH);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSection(content, heading) {
  const headingPattern = new RegExp(
    `^##\\s+${escapeRegExp(heading)}\\s*$`,
    "i",
  );
  const lines = content.split(/\r?\n/);
  const startIndex = lines.findIndex((line) =>
    headingPattern.test(line.trim())
  );
  if (startIndex === -1) {
    throw new Error(
      `Heading "${heading}" was not found in ${DOC_RELATIVE_PATH}.`,
    );
  }

  let endIndex = lines.length;
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index])) {
      endIndex = index;
      break;
    }
  }

  return lines.slice(startIndex + 1, endIndex).join("\n");
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

    if (!currentItem) {
      continue;
    }

    if (trimmed === "") {
      continue;
    }

    currentItem.text += ` ${trimmed}`;
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

function printChecklistReport(title, items) {
  const total = items.length;
  const completed = items.filter((item) => item.status === "complete").length;
  const pending = total - completed;

  console.log(`${title} — ${total} task${total === 1 ? "" : "s"}`);
  console.log(`  Complete: ${completed}`);
  console.log(`  Pending: ${pending}`);
  console.log("");

  items.forEach((item, index) => {
    const statusLabel = item.status === "complete" ? "DONE" : "OPEN";
    console.log(`${index + 1}. [${statusLabel}] ${item.text}`);
  });
  console.log("");
}

async function main() {
  const content = await readFile(DOC_ABSOLUTE_PATH, "utf8");

  const implementationSection = extractSection(
    content,
    "Implementation Checklist",
  );
  const verificationSection = extractSection(content, "Verification Checklist");

  const implementationItems = parseChecklist(
    implementationSection,
    "Implementation Checklist",
  );
  const verificationItems = parseChecklist(
    verificationSection,
    "Verification Checklist",
  );

  console.log(`Dynamic Capital Modular Architecture checklist status`);
  console.log(`Source: ${DOC_RELATIVE_PATH}`);
  console.log("");

  printChecklistReport("Implementation checklist", implementationItems);
  printChecklistReport("Verification checklist", verificationItems);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
