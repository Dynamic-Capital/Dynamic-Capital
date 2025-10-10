import { access, readdir } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

interface CliOptions {
  root: string;
  prefix: string;
  json: boolean;
}

interface PackageReport {
  name: string;
  path: string;
  expected: string[];
}

const DEFAULT_PREFIX = "dynamic_";

const DEFAULT_EXPECTED_MODULES = [
  "build.py",
  join("build", "__init__.py"),
];

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    root: resolve(dirname(fileURLToPath(import.meta.url)), "..", ".."),
    prefix: DEFAULT_PREFIX,
    json: false,
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

    if (value.startsWith("-")) {
      throw new Error(`Unknown flag: ${value}`);
    }
  }

  return options;
}

async function listCandidatePackages(
  root: string,
  prefix: string,
): Promise<Array<{ name: string; path: string }>> {
  const absoluteRoot = resolve(root);
  const entries = await readdir(absoluteRoot, { withFileTypes: true });
  const candidates: Array<{ name: string; path: string }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (!entry.name.startsWith(prefix)) {
      continue;
    }

    const packagePath = join(absoluteRoot, entry.name);
    const initExists = await pathExists(join(packagePath, "__init__.py"));
    if (!initExists) {
      continue;
    }

    candidates.push({ name: entry.name, path: packagePath });
  }

  return candidates;
}

async function findMissingBuildModules(
  packages: Array<{ name: string; path: string }>,
  root: string,
): Promise<PackageReport[]> {
  const reports: PackageReport[] = [];

  await Promise.all(
    packages.map(async (pkg) => {
      const hasModule = await Promise.all(
        DEFAULT_EXPECTED_MODULES.map((relativePath) =>
          pathExists(join(pkg.path, relativePath))
        ),
      ).then((results) => results.some(Boolean));

      if (!hasModule) {
        const packageRelativePath = relative(root, pkg.path);
        reports.push({
          name: pkg.name,
          path: packageRelativePath,
          expected: DEFAULT_EXPECTED_MODULES.map((relativePath) =>
            join(packageRelativePath, relativePath)
          ),
        });
      }
    }),
  );

  return reports.sort((a, b) => a.name.localeCompare(b.name));
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
    const missing = await findMissingBuildModules(candidates, options.root);

    if (options.json) {
      const normalized = missing.map((item) => ({
        name: item.name,
        path: item.path,
        expected: item.expected,
      }));
      console.log(
        JSON.stringify({ root: options.root, missing: normalized }, null, 2),
      );
      return;
    }

    printHumanReport(options.root, missing);
  } catch (error) {
    console.error("Failed to scan for build modules:");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

await main();
