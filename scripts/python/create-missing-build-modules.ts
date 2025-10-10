import { writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_PREFIX,
  findMissingBuildModules,
  listCandidatePackages,
  type PackageInfo,
  type PackageReport,
  pathExists,
} from "./build-module-utils.ts";

interface CliOptions {
  root: string;
  prefix: string;
  force: boolean;
  dryRun: boolean;
}

interface CreationResult {
  package: PackageInfo;
  created: boolean;
  filePath: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    root: resolve(dirname(fileURLToPath(import.meta.url)), "..", ".."),
    prefix: DEFAULT_PREFIX,
    force: false,
    dryRun: false,
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

    if (value === "--force") {
      options.force = true;
      continue;
    }

    if (value === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (value.startsWith("-")) {
      throw new Error(`Unknown flag: ${value}`);
    }
  }

  return options;
}

function createModuleSource(packageName: string): string {
  const modulePath = `${packageName}.build`;
  return `# Placeholder build module for ${packageName}.
#
# This module was generated automatically to ensure the package exposes a
# Dynamic CLI entry point. Replace the stubbed functions with a concrete
# implementation when ${modulePath} is ready to produce build artefacts.

from __future__ import annotations

import sys
from typing import Any, Mapping

__all__ = ["build", "main"]


def build(*_args: Any, **_kwargs: Any) -> Mapping[str, Any]:
    """Construct build artefacts for ${packageName}.

    Replace this stub with logic that returns serialisable data required by
    the Dynamic CLI.
    """
    raise NotImplementedError(
        "${modulePath} is not implemented yet."
    )


def main() -> int:
    """Entry point for "python -m ${modulePath}"."""
    message = (
        "${modulePath} is a placeholder module.\\n"
        "Implement build() to integrate with the Dynamic CLI."
    )
    print(message, file=sys.stderr)
    return 1


if __name__ == "__main__":  # pragma: no cover - CLI shim
    raise SystemExit(main())
`;
}

async function writeBuildModule(
  pkg: PackageInfo,
  options: CliOptions,
): Promise<CreationResult> {
  const filePath = join(pkg.path, "build.py");
  const exists = await pathExists(filePath);

  if (exists && !options.force) {
    return { package: pkg, created: false, filePath };
  }

  const source = createModuleSource(pkg.name);

  if (!options.dryRun) {
    await writeFile(filePath, source, { encoding: "utf-8" });
  }

  return { package: pkg, created: true, filePath };
}

function printReport(
  root: string,
  reports: PackageReport[],
  creations: CreationResult[],
  dryRun: boolean,
): void {
  const created = creations.filter((item) => item.created);
  const skipped = creations.filter((item) => !item.created);

  if (reports.length === 0) {
    console.log("No missing build modules detected.");
    return;
  }

  console.log(`Root scanned: ${root}`);
  console.log(`Packages analysed: ${reports.length}`);
  console.log(
    `Modules ${dryRun ? "to be created" : "created"}: ${created.length}`,
  );
  console.log(`Skipped (existing): ${skipped.length}`);

  if (created.length > 0) {
    console.log("");
    console.log(dryRun ? "Pending creations:" : "Created modules:");
    for (const item of created) {
      console.log(`- ${item.package.name}: ${item.filePath}`);
    }
  }

  if (skipped.length > 0) {
    console.log("");
    console.log("Skipped packages (existing module detected):");
    for (const item of skipped) {
      console.log(`- ${item.package.name}: ${item.filePath}`);
    }
  }
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const candidates = await listCandidatePackages(
      options.root,
      options.prefix,
    );
    const missing = await findMissingBuildModules(candidates, options.root);

    if (missing.length === 0 && !options.force) {
      console.log("All packages already expose build modules.");
      return;
    }

    const targets = options.force
      ? candidates
      : missing.map((report) => ({
        name: report.name,
        path: join(options.root, report.path),
      }));

    if (targets.length === 0) {
      console.log("No matching packages found to process.");
      return;
    }

    const creations: CreationResult[] = [];

    for (const pkg of targets) {
      creations.push(await writeBuildModule(pkg, options));
    }

    const reportsForLogging: PackageReport[] = options.force
      ? targets.map((pkg) => ({
        name: pkg.name,
        path: relative(options.root, pkg.path),
        expected: [],
      }))
      : missing;

    printReport(options.root, reportsForLogging, creations, options.dryRun);
  } catch (error) {
    console.error("Failed to create build modules:");
    if (error instanceof Error) {
      console.error(error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  }
}

await main();
