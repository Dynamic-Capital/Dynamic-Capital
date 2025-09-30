#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(MODULE_DIR, "../..");
const DOC_PATH = path.join(PROJECT_ROOT, "docs/dynamic_protocol_layers.md");

function loadChecklistSection(content) {
  const SECTION_HEADING = "## Layer-by-Layer Checklist";
  const startIndex = content.indexOf(SECTION_HEADING);
  if (startIndex === -1) {
    throw new Error(
      `Unable to locate "${SECTION_HEADING}" in docs/dynamic_protocol_layers.md.`,
    );
  }

  const sectionStart = startIndex + SECTION_HEADING.length;
  const remaining = content.slice(sectionStart);
  const endMarker = "\n## ";
  const endIndex = remaining.indexOf(endMarker);
  const section = endIndex === -1 ? remaining : remaining.slice(0, endIndex);

  return section.trim();
}

function parseChecklist(section) {
  const lines = section.split("\n");
  const layers = [];
  let currentLayer = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith("- [")) {
      continue;
    }

    const match = line.match(/- \[( |x)\] \*\*(.+?)\*\*/i);
    if (match) {
      if (currentLayer) {
        layers.push(currentLayer);
      }
      currentLayer = {
        title: match[2].trim(),
        completed: match[1].toLowerCase() === "x",
        items: [],
      };
      continue;
    }

    if (!currentLayer) {
      continue;
    }

    const itemMatch = line.match(/- \[( |x)\] (.+)/i);
    if (itemMatch) {
      currentLayer.items.push({
        text: itemMatch[2].trim(),
        completed: itemMatch[1].toLowerCase() === "x",
      });
    }
  }

  if (currentLayer) {
    layers.push(currentLayer);
  }

  return layers;
}

function summarize(layers) {
  const totals = layers.reduce(
    (acc, layer) => {
      acc.layers += 1;
      if (layer.completed) {
        acc.layersComplete += 1;
      }
      for (const item of layer.items) {
        acc.tasks += 1;
        if (item.completed) {
          acc.tasksComplete += 1;
        }
      }
      return acc;
    },
    { layers: 0, layersComplete: 0, tasks: 0, tasksComplete: 0 },
  );

  return totals;
}

function formatCheckbox(completed) {
  return completed ? "[x]" : "[ ]";
}

function main() {
  if (!fs.existsSync(DOC_PATH)) {
    console.error(
      "Dynamic protocol layering document not found at:",
      path.relative(process.cwd(), DOC_PATH),
    );
    process.exitCode = 1;
    return;
  }

  const content = fs.readFileSync(DOC_PATH, "utf8");
  const section = loadChecklistSection(content);
  const layers = parseChecklist(section);

  if (layers.length === 0) {
    console.error(
      "No checklist entries detected under the Layer-by-Layer Checklist heading.",
    );
    process.exitCode = 1;
    return;
  }

  const totals = summarize(layers);

  console.log("Dynamic Capital Protocol Layer Checklist status\n");
  console.log(
    `Layers complete: ${totals.layersComplete}/${totals.layers} | Tasks complete: ${totals.tasksComplete}/${totals.tasks}`,
  );

  for (const layer of layers) {
    console.log(`\n${formatCheckbox(layer.completed)} ${layer.title}`);
    for (const item of layer.items) {
      console.log(`  ${formatCheckbox(item.completed)} ${item.text}`);
    }
  }

  console.log(
    "\nReview each unchecked item and update docs/dynamic_protocol_layers.md when work is completed.",
  );
}

main();
