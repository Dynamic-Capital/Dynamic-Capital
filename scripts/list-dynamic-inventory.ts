import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { info, success } from "./utils/friendly-logger.js";

async function collectDynamicDirectories(root: string) {
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("dynamic_"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function main() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(currentDir, "..");
  const directories = await collectDynamicDirectories(repoRoot);

  if (directories.length === 0) {
    info("No dynamic_* directories were found.");
    return;
  }

  success(`Found ${directories.length} dynamic modules:`);
  for (const directory of directories) {
    console.log(` - ${directory}`);
  }
}

await main();
