import { readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { error, info, success } from "./utils/friendly-logger.js";

type OutputFormat = "json" | "text";

interface CliOptions {
  format: OutputFormat;
  root: string;
  absolute: boolean;
  ignores: Set<string>;
  showHelp: boolean;
  recursive: boolean;
}

const DEFAULT_IGNORES = new Set<string>([
  ".git",
  "node_modules",
  ".turbo",
  ".next",
  ".vercel",
  "dist",
  "build",
  "coverage",
  "tmp",
  "vendor",
]);

interface CollectOptions {
  ignores: Set<string>;
  recursive: boolean;
}

async function collectDynamicDirectories(
  root: string,
  { ignores, recursive }: CollectOptions,
) {
  if (!recursive) {
    const entries = await readdir(root, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && !ignores.has(entry.name))
      .filter((entry) => entry.name.startsWith("dynamic_"))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  }

  const results: string[] = [];
  const queue: string[] = [root];

  while (queue.length > 0) {
    const current = queue.pop()!;
    const entries = await readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (ignores.has(entry.name)) continue;

      const fullPath = join(current, entry.name);
      const relativePath = relative(root, fullPath) || entry.name;

      if (entry.name.startsWith("dynamic_")) {
        results.push(relativePath);
      }

      queue.push(fullPath);
    }
  }

  return results.sort((a, b) => a.localeCompare(b));
}

function parseArgs(defaultRoot: string): CliOptions {
  const args = process.argv.slice(2);
  const ignores = new Set(DEFAULT_IGNORES);

  let format: OutputFormat = "text";
  let root = defaultRoot;
  let absolute = false;
  let showHelp = false;
  let recursive = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case "--help":
      case "-h": {
        showHelp = true;
        break;
      }
      case "--json": {
        format = "json";
        break;
      }
      case "--absolute": {
        absolute = true;
        break;
      }
      case "--root":
      case "-r": {
        const value = args.at(index + 1);
        if (!value) {
          throw new Error("--root requires a path argument");
        }
        root = resolve(defaultRoot, value);
        index += 1;
        break;
      }
      case "--ignore": {
        const value = args.at(index + 1);
        if (!value) {
          throw new Error("--ignore requires a directory name");
        }
        ignores.add(value);
        index += 1;
        break;
      }
      case "--recursive": {
        recursive = true;
        break;
      }
      default: {
        throw new Error(`Unknown argument: ${arg}`);
      }
    }
  }

  return { format, root, absolute, ignores, showHelp, recursive };
}

function printHelp(defaultRoot: string) {
  info("List every dynamic_* directory in the repository.", {
    details: [
      "Usage: npx tsx scripts/list-dynamic-inventory.ts [options]",
      "Options:",
      "  -h, --help        Show this message",
      "  --json            Emit a JSON payload instead of text",
      "  --absolute        Print absolute paths",
      "  -r, --root <dir>  Override the repository root",
      "  --ignore <name>   Add an extra directory name to skip",
      "  --recursive       Scan nested folders as well",
      `Default root: ${defaultRoot}`,
    ],
  });
}

async function main() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const defaultRoot = resolve(currentDir, "..");
  let options: CliOptions;

  try {
    options = parseArgs(defaultRoot);
  } catch (cause) {
    error("Failed to parse arguments.", { details: cause });
    process.exitCode = 1;
    return;
  }

  if (options.showHelp) {
    printHelp(defaultRoot);
    return;
  }

  let directories: string[];
  try {
    directories = await collectDynamicDirectories(options.root, {
      ignores: options.ignores,
      recursive: options.recursive,
    });
  } catch (cause) {
    error("Unable to scan for dynamic directories.", { details: cause });
    process.exitCode = 1;
    return;
  }

  const formattedDirectories = directories.map((directory) =>
    options.absolute ? resolve(options.root, directory) : directory
  );

  if (options.format === "json") {
    const payload = {
      count: formattedDirectories.length,
      directories: formattedDirectories,
    };
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (formattedDirectories.length === 0) {
    info("No dynamic_* directories were found.");
    return;
  }

  const descriptors: string[] = [];
  if (options.recursive) descriptors.push("recursive");
  if (options.absolute) descriptors.push("absolute paths");
  const suffix = descriptors.length > 0 ? ` (${descriptors.join(", ")})` : "";

  success(`Found ${formattedDirectories.length} dynamic modules${suffix}:`);
  for (const directory of formattedDirectories) {
    console.log(` - ${directory}`);
  }
}

await main();
