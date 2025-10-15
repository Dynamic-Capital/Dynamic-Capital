import process from "node:process";
import { parseArgs } from "node:util";

import {
  scanTypeScriptForHallucinations,
  type TypeScriptHallucinationIssue,
} from "./check-typescript.ts";

interface Summary {
  totalIssues: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
}

function buildSummary(issues: TypeScriptHallucinationIssue[]): Summary {
  const byCategory = new Map<string, number>();
  const bySeverity = new Map<string, number>();
  for (const issue of issues) {
    byCategory.set(issue.category, (byCategory.get(issue.category) ?? 0) + 1);
    bySeverity.set(issue.severity, (bySeverity.get(issue.severity) ?? 0) + 1);
  }
  return {
    totalIssues: issues.length,
    byCategory: Object.fromEntries([...byCategory.entries()].sort()),
    bySeverity: Object.fromEntries([...bySeverity.entries()].sort()),
  };
}

function printHumanReadable(
  issues: TypeScriptHallucinationIssue[],
  summary: Summary,
  project: string,
) {
  if (issues.length === 0) {
    console.log(
      `✅  No hallucination signals detected for project ${project}.`,
    );
    return;
  }

  console.error(
    `⚠️  Potential hallucination issues detected in project ${project}:`,
  );
  for (const issue of issues) {
    const location = `${issue.file}:${issue.line}:${issue.column}`;
    const code = `TS${issue.code}`;
    const condensedMessage = issue.message.replace(/\s+/g, " ").trim();
    console.error(`  • [${issue.category}] ${location} ${code}`);
    console.error(`    ${condensedMessage}`);
    console.error(`    Advice: ${issue.advice}`);
  }
  console.error("\nSummary:");
  console.error(`  Total issues: ${summary.totalIssues}`);
  for (const [category, count] of Object.entries(summary.byCategory)) {
    console.error(`  - ${category}: ${count}`);
  }
  for (const [severity, count] of Object.entries(summary.bySeverity)) {
    console.error(`  - severity:${severity}: ${count}`);
  }
}

async function main() {
  const {
    values,
    positionals,
  } = parseArgs({
    options: {
      project: {
        type: "string",
        short: "p",
      },
      file: {
        type: "string",
        multiple: true,
      },
      json: {
        type: "boolean",
        default: false,
      },
      verbose: {
        type: "boolean",
        short: "v",
        default: false,
      },
      help: {
        type: "boolean",
        short: "h",
      },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(
      `Usage: tsx scripts/hallucination/index.ts [options] [files...]\n\n` +
        `Options:\n` +
        `  -p, --project <path>   Path to tsconfig.json (default: ./tsconfig.json)\n` +
        `      --file <path>      Additional file(s) to analyse (can be repeated)\n` +
        `  -v, --verbose          Emit diagnostic logging\n` +
        `      --json             Output machine-readable JSON\n` +
        `  -h, --help             Show this help message`,
    );
    return;
  }

  const project = values.project ?? "tsconfig.json";
  const fileArguments = [
    ...(values.file ?? []),
    ...positionals,
  ].filter(Boolean);

  try {
    const issues = await scanTypeScriptForHallucinations({
      project,
      files: fileArguments.length > 0 ? fileArguments : undefined,
      verbose: values.verbose,
    });
    const summary = buildSummary(issues);
    if (values.json) {
      console.log(JSON.stringify({ project, summary, issues }, null, 2));
    } else {
      printHumanReadable(issues, summary, project);
    }
    process.exit(issues.length > 0 ? 1 : 0);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : String(error ?? "Unknown error");
    console.error(`hallucination-guard failed: ${message}`);
    process.exit(2);
  }
}

void main();
