#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(MODULE_DIR, "..", "..");
const CHECKLIST_PATH = path.join(
  PROJECT_ROOT,
  "docs",
  "nft-collectible-launch-checklist.md",
);

function isChecklistItem(line) {
  return /^- \[[ xX]\] /.test(line.trim());
}

function isContinuation(line) {
  return /^\s{2,}\S/.test(line);
}

async function loadChecklist() {
  const content = await fs.readFile(CHECKLIST_PATH, "utf8");
  const lines = content.split(/\r?\n/);

  const sections = [];
  let currentSection = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      const title = line.replace(/^##\s*/, "").trim();
      currentSection = { title, items: [] };
      sections.push(currentSection);
      continue;
    }

    if (!currentSection) {
      continue;
    }

    if (isChecklistItem(line)) {
      let text = line.trim().replace(/^- \[[ xX]\]\s*/, "").trim();
      let j = i + 1;
      while (j < lines.length && isContinuation(lines[j])) {
        text += ` ${lines[j].trim()}`;
        j += 1;
      }
      currentSection.items.push(text);
      i = j - 1;
    }
  }

  return sections.filter((section) => section.items.length > 0);
}

async function main() {
  const sections = await loadChecklist();
  console.log("NFT Collectible Launch Checklist Tasks");
  console.log("=====================================");
  console.log("");

  for (const section of sections) {
    console.log(section.title);
    console.log("-".repeat(section.title.length));
    section.items.forEach((item, index) => {
      console.log(`${index + 1}. ${item}`);
    });
    console.log("");
  }

  console.log(
    "Tip: Pipe this output to a file (e.g., npm run checklists -- --only nft-collectible-tasks > plan.txt) to share progress trackers.",
  );
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
