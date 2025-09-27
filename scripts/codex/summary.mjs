import { existsSync, readFileSync, writeFileSync } from "fs";

const safeRead = (p) => existsSync(p) ? readFileSync(p, "utf8") : "";
const VERBOSE = (process.env.VERBOSE || "false") === "true";
const QUIET = (process.env.QUIET || "false") === "true";

function section(title, body, collapsed = false) {
  if (!body.trim()) return "";
  return collapsed
    ? `\n<details><summary><strong>${title}</strong></summary>\n\n${body}\n\n</details>\n`
    : `\n### ${title}\n\n${body}\n`;
}

function short(text, max = 800) {
  if (text.length <= max) return "```\n" + text + "\n```";
  return "```\n" + text.slice(0, max) + "\n… (truncated)\n```";
}

const diffstat = safeRead("diffstat.txt");
const changed = safeRead("changed.txt").split("\n").filter(Boolean);

// buckets
const buckets = {
  code: [],
  docs: [],
  tests: [],
  config: [],
  workflows: [],
  other: [],
};
for (const line of changed) {
  const [, file] = line.split(/\s+/, 2);
  if (!file) continue;
  if (/\.(ts|tsx|js|jsx)$/.test(file)) buckets.code.push(file);
  else if (/\.(md|mdx)$|^docs\//.test(file)) buckets.docs.push(file);
  else if (/test|spec|__tests__/.test(file)) buckets.tests.push(file);
  else if (/^\.github\//.test(file) || /\.ya?ml$/.test(file)) {
    buckets.workflows.push(file);
  } else if (/^config\//.test(file) || /\.json$/.test(file)) {
    buckets.config.push(file);
  } else buckets.other.push(file);
}

function list(files) {
  const max = VERBOSE ? 60 : 30;
  const shown = files.slice(0, max);
  return files.length
    ? ("- " + shown.join("\n- ") +
      (files.length > shown.length
        ? `\n… +${files.length - shown.length} more`
        : ""))
    : "_none_";
}

const build = safeRead("build.log");
const typecheck = safeRead("typecheck.log");
const lint = safeRead("lint.log");
const test = safeRead("test.log");
const exp = safeRead("export.log");

function statusFromLog(txt) {
  if (!txt) return "skipped";
  if (/error|failed|ERR!/i.test(txt) && !/0 failed|0 errors/.test(txt)) {
    return "❌ failed";
  }
  if (/warn/i.test(txt)) return "⚠️ warnings";
  return "✅ ok";
}

const buildStatus = statusFromLog(build);
const typeStatus = statusFromLog(typecheck);
const lintStatus = statusFromLog(lint);
const testStatus = statusFromLog(test);
const exportStatus = statusFromLog(exp);

let md = "";
md += `## Codex Summary\n`;
md +=
  `| Check | Result |\n|---|---|\n| Typecheck | ${typeStatus} |\n| Lint | ${lintStatus} |\n| Build | ${buildStatus} |\n| Tests | ${testStatus} |\n| Export | ${exportStatus} |\n`;

md += section("Diff (stat)", short(diffstat, 1200), QUIET);
md += section("Changed files — code", list(buckets.code), QUIET);
md += section("Changed files — docs", list(buckets.docs), true);
md += section("Changed files — config", list(buckets.config), true);
md += section("Changed files — tests", list(buckets.tests), true);
md += section("Changed files — workflows", list(buckets.workflows), true);
md += section("Changed files — other", list(buckets.other), true);

if (VERBOSE) {
  const warnLines = (lint.match(/^.*warn.*$/gmi) || []).slice(0, 50).join("\n");
  const tsErr = (typecheck.match(/^.*error.*$/gmi) || []).slice(0, 50).join(
    "\n",
  );
  md += section(
    "Top Lint Warnings (first 50)",
    short(warnLines || "_none_"),
    true,
  );
  md += section("Top TS Errors (first 50)", short(tsErr || "_none_"), true);
}

writeFileSync("pr-summary.md", md);
console.log(md);
