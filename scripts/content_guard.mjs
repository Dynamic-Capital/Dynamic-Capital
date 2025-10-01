import { writeFile } from "fs/promises";
import { existsSync, readFileSync } from "fs";

const CHANGED_LIST = process.env.CHANGED_LIST || "changed.txt";

// Heuristics
const CONTENT_GLOBS = [
  /^content\//,
  /^docs\//,
  /^pages\//,
  /^app\/.*\/(team|about)\//,
  /\.mdx?$/i,
];
const BANNED_PATTERNS = [
  /lorem ipsum/i,
  /\bTBD\b|\bTK\b|\bCHANGE ME\b/i,
  /example\.com/i,
  /\bJohn Doe\b|\bJane Doe\b/i,
  /\bACME\b|\bExample Corp\b/i,
  /\bNoah Sterling\b/i,
  /\bHelios Partners\b/i,
  /your@email/i,
  /555-01\d{2}/,
  /1-800-555-1212/,
];

const CLAIMY = [
  /\bAUM\b/i,
  /\bmembers?\b/i,
  /\bsubscribers?\b/i,
  /\bROI\b/i,
  /\bwin[- ]?rate\b/i,
  /\bdrawdown\b|\bDD\b/i,
  /\bvolume\b/i,
  /\brevenue\b/i,
  /\bclients?\b/i,
  /\b[YQ]o?Y\b/i,
  /\b[pP]ct\b|\%/,
];
const MONEY = /(\$|USD|USDT)\s?\d[\d,]*(\.\d+)?\s*(K|M|B)?/i;
const BIG_NUM = /\b\d{3,}\b/;

function isContentPath(p) {
  return CONTENT_GLOBS.some((rx) => rx.test(p));
}

function hasBanned(text) {
  return BANNED_PATTERNS.some((rx) => rx.test(text));
}

function needsSources(text) {
  const hasClaim = CLAIMY.some((rx) => rx.test(text)) || MONEY.test(text);
  const manyNumbers = (text.match(/\d+/g) || []).length >= 6; // heuristic
  const hasBigNumber = BIG_NUM.test(text);
  return hasClaim || manyNumbers || hasBigNumber;
}

function extractFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  return m[1];
}
function hasSources(mdOrJs) {
  // Look for YAML frontmatter "sources:" or a JS comment "SOURCES:"
  const fm = extractFrontmatter(mdOrJs);
  if (fm && /(^|\n)sources:\s*\[/i.test(fm)) return true;
  if (/^\s*\/\*\s*SOURCES:\s*[\s\S]*?\*\//m.test(mdOrJs)) return true;
  return false;
}

async function main() {
  if (!existsSync(CHANGED_LIST)) {
    console.error(`No ${CHANGED_LIST} found`);
    process.exit(0);
  }
  const files = readFileSync(CHANGED_LIST, "utf8").trim().split("\n").filter(
    Boolean,
  );

  let violating = [];
  let contentTouched = false;

  for (const f of files) {
    if (!isContentPath(f)) continue;
    contentTouched = true;

    try {
      const text = readFileSync(f, "utf8");

      if (hasBanned(text)) {
        violating.push({
          file: f,
          reason: "contains banned placeholders/fake examples",
        });
        continue;
      }

      if (needsSources(text) && !hasSources(text)) {
        violating.push({
          file: f,
          reason:
            "contains quantitative/claim-heavy text but no sources provided",
        });
        continue;
      }

      // Simple bio rule: if it mentions a title-like role, require source
      if (
        /\b(Chief|Director|Lead|Officer|Founder|CIO|CEO|COO|CTO)\b/i.test(
          text,
        ) && !hasSources(text)
      ) {
        violating.push({ file: f, reason: "bio/title text without sources" });
      }
    } catch (e) {
      // ignore unreadable files
    }
  }

  // flag for downstream jobs
  await writeFile("content_guard_flag.txt", contentTouched ? "true" : "false");

  if (violating.length) {
    const msg = violating.map((v) => `- ${v.file}: ${v.reason}`).join("\n");
    await writeFile("content_guard_report.txt", msg);
    console.error("Content Guard Violations:\n" + msg);
    process.exit(1);
  } else {
    console.log("Content Guard: no issues found.");
  }
}
main();
