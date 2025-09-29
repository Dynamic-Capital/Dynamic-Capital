import { readdir, readFile, stat } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import process from "node:process";

process.stdout.on("error", (error) => {
  const nodeError = error as NodeJS.ErrnoException;
  if (nodeError.code === "EPIPE") {
    process.exit(0);
  }
  throw error;
});

/**
 * Recursively scans the repository for lines that mention "checklist".
 *
 * This helps the Dynamic Capital execution agents surface compliance and risk
 * guardrails encoded as checklist tasks across the stack. The output feeds
 * Dynamic AGI feedback loops by highlighting modules that require governance
 * attention, ensuring execution integrity.
 */
interface ChecklistHit {
  file: string;
  line: number;
  text: string;
}

const DEFAULT_EXTENSIONS = new Set([
  ".md",
  ".mdx",
  ".py",
  ".ts",
  ".tsx",
  ".json",
  ".yaml",
  ".yml",
]);

const SKIP_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "vendor",
  "__pycache__",
  ".venv",
]);

function shouldSkipDir(name: string): boolean {
  return SKIP_DIRECTORIES.has(name);
}

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) {
        continue;
      }
      const nested = await collectFiles(resolve(dir, entry.name));
      files.push(...nested);
    } else if (entry.isFile()) {
      const extension = extname(entry.name).toLowerCase();
      if (DEFAULT_EXTENSIONS.has(extension)) {
        files.push(resolve(dir, entry.name));
      }
    }
  }

  return files;
}

function extractHits(file: string, contents: string): ChecklistHit[] {
  const hits: ChecklistHit[] = [];
  const lines = contents.split(/\r?\n/);
  const checklistPattern = /checklist/i;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!checklistPattern.test(line)) {
      continue;
    }

    const trimmed = line.trim();
    const snippet = trimmed.length > 160
      ? `${trimmed.slice(0, 157)}...`
      : trimmed;

    hits.push({
      file,
      line: index + 1,
      text: snippet,
    });
  }

  return hits;
}

async function scan(root: string): Promise<Map<string, ChecklistHit[]>> {
  const normalizedRoot = resolve(root);
  const files = await collectFiles(normalizedRoot);
  const hitsByFile = new Map<string, ChecklistHit[]>();

  await Promise.all(
    files.map(async (absolutePath) => {
      try {
        const fileStats = await stat(absolutePath);
        if (!fileStats.isFile()) {
          return;
        }

        const contents = await readFile(absolutePath, "utf8");
        const hits = extractHits(
          relative(normalizedRoot, absolutePath),
          contents,
        );
        if (hits.length > 0) {
          hitsByFile.set(absolutePath, hits);
        }
      } catch (error) {
        console.warn(`Unable to scan ${absolutePath}:`, error);
      }
    }),
  );

  return hitsByFile;
}

function printReport(
  hitsByFile: Map<string, ChecklistHit[]>,
  root: string,
): void {
  if (hitsByFile.size === 0) {
    console.log("No checklist references detected in the target scope.");
    return;
  }

  console.log("Checklist scan report");
  console.log(`Root: ${root}`);
  console.log("");

  const sortedEntries = Array.from(hitsByFile.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  for (const [absolutePath, hits] of sortedEntries) {
    const relativePath = relative(root, absolutePath);
    console.log(relativePath);
    for (const hit of hits) {
      console.log(`  [${hit.line}] ${hit.text}`);
    }
    console.log("");
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const rootArg = args.find((value) => !value.startsWith("--"));
  const jsonOutput = args.includes("--json");
  const root = resolve(rootArg ?? process.cwd());

  const hitsByFile = await scan(root);

  if (jsonOutput) {
    const payload = Array.from(hitsByFile.entries()).map((
      [absolutePath, hits],
    ) => ({
      file: relative(root, absolutePath),
      hits: hits.map((hit) => ({
        line: hit.line,
        text: hit.text,
      })),
    }));

    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  printReport(hitsByFile, root);
}

main().catch((error) => {
  console.error("Checklist scan failed:", error);
  process.exitCode = 1;
});
