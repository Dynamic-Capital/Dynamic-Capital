#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(MODULE_DIR, "..", "..");
const CHECKLIST_PATH = path.join(
  PROJECT_ROOT,
  "docs",
  "nft-collectible-launch-checklist.md",
);

const REQUIRED_HEADINGS = [
  "## 1. Concept Foundations",
  "## 2. Trait System & Metadata Architecture",
  "## 3. Narrative & Worldbuilding",
  "## 4. Utility & Holder Benefits",
  "## 5. Community & Brand Activation",
  "## 6. Supply Strategy & Mint Mechanics",
  "## 7. Visual Direction & Asset Production",
  "## 8. Launch Operations & Post-Mint Stewardship",
  "## Optional Enhancements",
];

function isChecklistItem(line) {
  return /^- \[[ xX]\] /.test(line.trim());
}

async function main() {
  const source = await fs.readFile(CHECKLIST_PATH, "utf8");
  const lines = source.split(/\r?\n/);

  if (!source.startsWith("# NFT Collectible Launch Checklist")) {
    throw new Error("Missing H1 heading for the NFT checklist.");
  }

  const missingHeadings = REQUIRED_HEADINGS.filter((heading) =>
    !source.includes(`\n${heading}\n`)
  );

  if (missingHeadings.length > 0) {
    console.error("Missing required sections:");
    for (const heading of missingHeadings) {
      console.error(`- ${heading}`);
    }
    throw new Error("Checklist structure invalid.");
  }

  const sectionStats = new Map();
  let currentHeading = null;
  let currentItems = 0;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentHeading) {
        sectionStats.set(currentHeading, currentItems);
      }
      currentHeading = line.trim();
      currentItems = 0;
      continue;
    }

    if (!currentHeading) {
      continue;
    }

    if (isChecklistItem(line)) {
      currentItems += 1;
    }
  }

  if (currentHeading) {
    sectionStats.set(currentHeading, currentItems);
  }

  const sectionsMissingTasks = [];
  for (const heading of REQUIRED_HEADINGS) {
    const count = sectionStats.get(heading) ?? 0;
    if (count === 0) {
      sectionsMissingTasks.push(heading);
    }
  }

  if (sectionsMissingTasks.length > 0) {
    console.error("Sections without checklist items:");
    for (const heading of sectionsMissingTasks) {
      console.error(`- ${heading}`);
    }
    throw new Error("Checklist items missing for one or more sections.");
  }

  let totalTasks = 0;
  for (const count of sectionStats.values()) {
    totalTasks += count;
  }

  console.log(
    `Validated NFT checklist structure: ${sectionStats.size} sections, ${totalTasks} checklist items.`,
  );
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
