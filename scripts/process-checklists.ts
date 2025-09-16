#!/usr/bin/env -S deno run -A
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

interface Options {
  directories: string[];
  match: string;
  format: "text" | "markdown" | "json";
  state: "open" | "done" | "all";
  output?: string;
  includeEmpty: boolean;
  absolute: boolean;
  help: boolean;
}

interface ChecklistItem {
  text: string;
  state: "open" | "done";
  line: number;
  section: string | null;
}

interface ChecklistReport {
  absolutePath: string;
  relativePath: string;
  summary: {
    total: number;
    open: number;
    done: number;
  };
  filteredItems: ChecklistItem[];
  sections: { name: string; items: ChecklistItem[] }[];
}

const HELP_TEXT = `Bulk process repository checklists.

Usage: deno run -A scripts/process-checklists.ts [options] [paths]

Options:
  -d, --dir <path>         Directory to scan (may be repeated). Defaults to docs/.
  -m, --match <pattern>    File name filter (substring or * wildcard). Default: *checklist*.
  -f, --format <type>      Output format: text, markdown, json. Default: text.
  -s, --state <state>      Filter by state: open, done, all. Default: open.
  -o, --output <path>      Write results to the given file instead of stdout.
      --absolute           Show absolute paths instead of relative paths.
      --include-empty      Include checklists with no matching items.
  -h, --help               Show this help message.

Any additional positional arguments are treated as directories to scan.
`;

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv: string[]): Options {
  const options: Options = {
    directories: [],
    match: "*checklist*",
    format: "text",
    state: "open",
    includeEmpty: false,
    absolute: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--dir":
      case "-d": {
        const value = argv[i + 1];
        if (!value) {
          throw new Error("Missing value for --dir");
        }
        i += 1;
        options.directories.push(value);
        break;
      }
      case "--match":
      case "-m": {
        const value = argv[i + 1];
        if (!value) {
          throw new Error("Missing value for --match");
        }
        i += 1;
        options.match = value;
        break;
      }
      case "--format":
      case "-f": {
        const value = argv[i + 1]?.toLowerCase();
        if (!value) {
          throw new Error("Missing value for --format");
        }
        i += 1;
        if (value !== "text" && value !== "markdown" && value !== "json") {
          throw new Error("Unsupported format. Use text, markdown, or json.");
        }
        options.format = value as Options["format"];
        break;
      }
      case "--state":
      case "-s": {
        const value = argv[i + 1]?.toLowerCase();
        if (!value) {
          throw new Error("Missing value for --state");
        }
        i += 1;
        if (value !== "open" && value !== "done" && value !== "all") {
          throw new Error("Unsupported state. Use open, done, or all.");
        }
        options.state = value as Options["state"];
        break;
      }
      case "--output":
      case "-o": {
        const value = argv[i + 1];
        if (!value) {
          throw new Error("Missing value for --output");
        }
        i += 1;
        options.output = value;
        break;
      }
      case "--absolute": {
        options.absolute = true;
        break;
      }
      case "--include-empty": {
        options.includeEmpty = true;
        break;
      }
      case "--help":
      case "-h": {
        options.help = true;
        break;
      }
      default: {
        if (arg.startsWith("-")) {
          throw new Error(`Unknown option: ${arg}`);
        }
        options.directories.push(arg);
      }
    }
  }

  if (options.directories.length === 0) {
    options.directories.push("docs");
  }

  return options;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildMatcher(pattern: string): (name: string) => boolean {
  if (!pattern || pattern === "*") {
    return () => true;
  }
  if (!pattern.includes("*")) {
    const needle = pattern.toLowerCase();
    return (name) => name.toLowerCase().includes(needle);
  }
  const regex = new RegExp(
    `^${pattern.split("*").map(escapeRegExp).join(".*")}$`,
    "i",
  );
  return (name) => regex.test(name);
}

async function collectFiles(
  paths: string[],
  matcher: (name: string) => boolean,
): Promise<string[]> {
  const files: string[] = [];
  const ignored = new Set([
    ".git",
    "node_modules",
    ".next",
    "dist",
    "build",
    "_static",
    "supabase/.branches",
  ]);

  const seen = new Set<string>();

  async function walkDir(current: string) {
    for await (const entry of Deno.readDir(current)) {
      if (ignored.has(entry.name)) continue;
      const nextPath = join(current, entry.name);
      if (entry.isDirectory) {
        if ([...ignored].some((skip) => nextPath.includes(skip))) continue;
        await walkDir(nextPath);
      } else if (entry.isFile) {
        const name = entry.name;
        if (!name.toLowerCase().endsWith(".md")) continue;
        if (!matcher(name)) continue;
        if (!seen.has(nextPath)) {
          seen.add(nextPath);
          files.push(nextPath);
        }
      }
    }
  }

  for (const pathItem of paths) {
    const absolute = join(repoRoot, pathItem);
    try {
      const stat = await Deno.stat(absolute);
      if (stat.isDirectory) {
        await walkDir(absolute);
      } else if (stat.isFile) {
        const name = absolute.split("/").pop() ?? absolute;
        if (
          name.toLowerCase().endsWith(".md") && matcher(name) &&
          !seen.has(absolute)
        ) {
          seen.add(absolute);
          files.push(absolute);
        }
      }
    } catch (error) {
      console.error(`Warning: unable to read ${pathItem}: ${error.message}`);
    }
  }

  files.sort((a, b) => a.localeCompare(b));
  return files;
}

function parseChecklist(text: string): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const lines = text.split(/\r?\n/);
  let currentSection: string | null = null;
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const headingMatch = raw.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (headingMatch) {
      currentSection = headingMatch[2].trim();
      continue;
    }
    const checkboxMatch = raw.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/);
    if (checkboxMatch) {
      const state = checkboxMatch[1].toLowerCase() === "x" ? "done" : "open";
      const textValue = checkboxMatch[2].trim();
      items.push({
        text: textValue,
        state,
        line: index + 1,
        section: currentSection,
      });
    }
  }
  return items;
}

function filterItems(
  items: ChecklistItem[],
  state: Options["state"],
): ChecklistItem[] {
  switch (state) {
    case "open":
      return items.filter((item) => item.state === "open");
    case "done":
      return items.filter((item) => item.state === "done");
    default:
      return items.slice();
  }
}

function groupBySection(
  items: ChecklistItem[],
): { name: string; items: ChecklistItem[] }[] {
  const order: string[] = [];
  const map = new Map<string, ChecklistItem[]>();
  for (const item of items) {
    const key = item.section ?? "General";
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(item);
  }
  return order.map((name) => ({ name, items: map.get(name)! }));
}

async function generateReport(options: Options): Promise<ChecklistReport[]> {
  const matcher = buildMatcher(options.match);
  const files = await collectFiles(options.directories, matcher);
  const reports: ChecklistReport[] = [];

  for (const file of files) {
    const text = await Deno.readTextFile(file);
    const items = parseChecklist(text);
    const filtered = filterItems(items, options.state);
    if (filtered.length === 0 && !options.includeEmpty) {
      continue;
    }
    const openCount = items.filter((item) => item.state === "open").length;
    const doneCount = items.filter((item) => item.state === "done").length;
    reports.push({
      absolutePath: file,
      relativePath: relative(repoRoot, file),
      summary: {
        total: items.length,
        open: openCount,
        done: doneCount,
      },
      filteredItems: filtered,
      sections: groupBySection(filtered),
    });
  }

  return reports;
}

function renderText(reports: ChecklistReport[], options: Options): string {
  const lines: string[] = [];
  lines.push(
    `Checklist bulk processing summary (${reports.length} file${
      reports.length === 1 ? "" : "s"
    })`,
  );
  lines.push(`State filter: ${options.state}`);
  lines.push("");
  if (reports.length === 0) {
    lines.push("No checklist items matched the provided filters.");
    return lines.join("\n");
  }

  for (const report of reports) {
    const label = options.absolute ? report.absolutePath : report.relativePath;
    lines.push(label);
    lines.push(
      `  Total: ${report.summary.total} (open: ${report.summary.open}, done: ${report.summary.done})`,
    );
    if (report.filteredItems.length === 0) {
      lines.push("  (no items matched the current state filter)");
      lines.push("");
      continue;
    }
    for (const section of report.sections) {
      lines.push(`  ${section.name}:`);
      for (const item of section.items) {
        const prefix = item.state === "done" ? "[x]" : "[ ]";
        lines.push(`    ${prefix} ${item.text} (L${item.line})`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

function renderMarkdown(reports: ChecklistReport[], options: Options): string {
  const lines: string[] = [];
  const timestamp = new Date().toISOString();
  lines.push(`# Checklist Bulk Processing Summary`);
  lines.push("");
  lines.push(`- Generated: ${timestamp}`);
  lines.push(`- State filter: \`${options.state}\``);
  lines.push(`- Files processed: ${reports.length}`);
  lines.push("");
  if (reports.length === 0) {
    lines.push("No checklist items matched the provided filters.");
    return lines.join("\n");
  }

  for (const report of reports) {
    const label = options.absolute ? report.absolutePath : report.relativePath;
    lines.push(`## ${label}`);
    lines.push("");
    lines.push(`- Total items: ${report.summary.total}`);
    lines.push(`- Open: ${report.summary.open}`);
    lines.push(`- Done: ${report.summary.done}`);
    lines.push("");
    if (report.filteredItems.length === 0) {
      lines.push("No items matched the current state filter.");
      lines.push("");
      continue;
    }
    for (const section of report.sections) {
      lines.push(`### ${section.name}`);
      lines.push("");
      for (const item of section.items) {
        const prefix = item.state === "done" ? "x" : " ";
        lines.push(`- [${prefix}] ${item.text} _(L${item.line})_`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function renderJson(reports: ChecklistReport[], options: Options): string {
  const payload = {
    generatedAt: new Date().toISOString(),
    state: options.state,
    filesProcessed: reports.length,
    reports: reports.map((report) => ({
      path: options.absolute ? report.absolutePath : report.relativePath,
      summary: report.summary,
      items: report.filteredItems.map((item) => ({
        text: item.text,
        state: item.state,
        line: item.line,
        section: item.section,
      })),
    })),
  };
  return JSON.stringify(payload, null, 2);
}

async function main() {
  const options = parseArgs(Deno.args);
  if (options.help) {
    console.log(HELP_TEXT);
    return;
  }

  const reports = await generateReport(options);
  let output: string;
  switch (options.format) {
    case "markdown":
      output = renderMarkdown(reports, options);
      break;
    case "json":
      output = renderJson(reports, options);
      break;
    default:
      output = renderText(reports, options);
      break;
  }

  if (options.output) {
    const target = join(repoRoot, options.output);
    await Deno.writeTextFile(target, output);
    console.log(`Wrote checklist report to ${target}`);
  } else {
    console.log(output);
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("Failed to process checklists:", error.message);
    Deno.exit(1);
  });
}
