import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_EXPECTED_MODULES,
  DEFAULT_PREFIX,
  findMissingBuildModules,
  listCandidatePackages,
  type PackageReport,
} from "./build-module-utils.ts";

interface CliOptions {
  root: string;
  prefix: string;
  json: boolean;
  packages: string[];
  failOnMissing: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    root: resolve(dirname(fileURLToPath(import.meta.url)), "..", ".."),
    prefix: DEFAULT_PREFIX,
    json: false,
    packages: [],
    failOnMissing: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--root" || value === "-r") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("--root flag requires a path argument");
      }
      options.root = resolve(next);
      index += 1;
      continue;
    }

    if (value === "--prefix") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("--prefix flag requires a value");
      }
      options.prefix = next;
      index += 1;
      continue;
    }

    if (value === "--json") {
      options.json = true;
      continue;
    }

    if (value === "--package" || value === "-p") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("--package flag requires a package name");
      }
      options.packages.push(next);
      index += 1;
      continue;
    }

    if (value === "--fail-on-missing") {
      options.failOnMissing = true;
      continue;
    }

    if (value.startsWith("-")) {
      throw new Error(`Unknown flag: ${value}`);
    }
  }

  return options;
}

function printHumanReport(root: string, reports: PackageReport[]): void {
  if (reports.length === 0) {
    console.log("All packages expose a build module.");
    return;
  }

  console.log("Missing build modules detected:");
  console.log(`Root scanned: ${root}`);
  console.log("");

  for (const report of reports) {
    console.log(`- ${report.name}`);
    for (const expected of report.expected) {
      console.log(`    expected: ${expected}`);
    }
  }

  console.log("");
  console.log(
    `${reports.length} package${
      reports.length === 1 ? "" : "s"
    } missing build modules.`,
  );
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const candidates = await listCandidatePackages(
      options.root,
      options.prefix,
    );
    const filteredCandidates = options.packages.length === 0
      ? candidates
      : candidates.filter((pkg) => options.packages.includes(pkg.name));

    const missingSelections = options.packages.filter((name) =>
      !candidates.some((pkg) => pkg.name === name)
    );

    if (missingSelections.length > 0) {
      console.warn(
        `Requested packages not found: ${missingSelections.join(", ")}`,
      );
    }

    const missing = await findMissingBuildModules(
      filteredCandidates,
      options.root,
    );

    if (options.json) {
      const normalized = missing.map((item) => ({
        name: item.name,
        path: item.path,
        expected: item.expected,
      }));
      console.log(
        JSON.stringify({ root: options.root, missing: normalized }, null, 2),
      );
      if (options.failOnMissing && missing.length > 0) {
        process.exitCode = 1;
      }
      return;
    }

    printHumanReport(options.root, missing);
    if (options.failOnMissing && missing.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("Failed to scan for build modules:");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

await main();
