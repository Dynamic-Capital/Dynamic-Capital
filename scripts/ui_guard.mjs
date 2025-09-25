#!/usr/bin/env node
import { readFileSync } from "fs";
import { execSync } from "child_process";

const BASE = process.env.GITHUB_BASE_REF ||
  (process.env.BASE || "origin/" + (process.env.GITHUB_REF_NAME || "main"));

function sh(cmd) {
  return execSync(cmd, { stdio: ["pipe", "pipe", "ignore"] }).toString().trim();
}

let changed = [];
try {
  const baseSha = sh(`git merge-base ${BASE} HEAD`);
  changed = sh(`git diff --name-only ${baseSha}..HEAD`).split("\n").filter(
    Boolean,
  );
} catch {
  changed = sh("git diff --name-only HEAD~1..HEAD").split("\n").filter(Boolean);
}

const targets = changed.filter((f) => /(\.tsx|\.mdx?)$/i.test(f));

let totalTextChars = 0, interactiveCount = 0, motionHits = 0, iconHits = 0;
const details = [];

const textRe = /<p[^>]*>([\s\S]*?)<\/p>|>\s*([A-Za-z][^<>]{40,})\s*</g; // crude long-text detector
const interactiveRe =
  /<(button|a |select|input|textarea|dialog|summary|details|Link|Sheet|Tabs|Dropdown|Menu|Popover|Tooltip|Accordion)[\s>]/g;
const motionRe = /from\s+['\"]framer-motion['\"]|<motion\./g;
const iconRe = /from\s+['\"]lucide-react['\"]/g;

for (const f of targets) {
  try {
    const src = readFileSync(f, "utf8");
    let textChars = 0;
    let m;
    while ((m = textRe.exec(src))) {
      const chunk = (m[1] || m[2] || "").replace(/\s+/g, " ").trim();
      textChars += chunk.length;
    }
    const inter = (src.match(interactiveRe) || []).length;
    const mot = (src.match(motionRe) || []).length;
    const ico = (src.match(iconRe) || []).length;
    totalTextChars += textChars;
    interactiveCount += inter;
    motionHits += mot;
    iconHits += ico;
    details.push({ file: f, textChars, inter, mot, ico });
  } catch {}
}

// Score: encourage interactions relative to text
const score = interactiveCount / (1 + totalTextChars / 600); // 1 point per 600 chars of text
const scoreRounded = Math.round(score * 100) / 100;

const threshold = 0.6; // tweak as needed
const ok = score >= threshold &&
  (interactiveCount >= 3 || targets.length === 0);

const summary = {
  filesChecked: targets.length,
  textChars: totalTextChars,
  interactiveCount,
  motionHits,
  iconHits,
  score: scoreRounded,
  threshold,
};

console.log("UI Guard Summary:", summary);
console.log("Per-file:", details);

if (!ok) {
  console.error("\n❌ UI Guard failed: not enough interaction vs text.");
  console.error(
    "Add buttons, menus, tabs, sheets, dialogs, or motion micro-interactions.",
  );
  process.exit(1);
} else {
  console.log("\n✅ UI Guard passed.");
}
