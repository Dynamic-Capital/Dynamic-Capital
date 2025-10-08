import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";

interface CliOptions {
  inputs: string[];
  outputDir: string;
  includeReadme: boolean;
}

interface ExportedDocument {
  path: string;
  title: string;
  headings: Array<{ level: number; text: string }>;
  wordCount: number;
  updatedAt: string;
}

const DEFAULT_INPUTS = ["docs"];
const DEFAULT_OUTPUT_DIR = "data/docs/export";

function parseArgs(argv: string[]): CliOptions {
  const inputs: string[] = [];
  let outputDir = DEFAULT_OUTPUT_DIR;
  let includeReadme = true;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--input" || value === "-i") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("--input flag requires a path argument");
      }
      inputs.push(next);
      index += 1;
      continue;
    }
    if (value === "--out" || value === "-o") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("--out flag requires a directory argument");
      }
      outputDir = next;
      index += 1;
      continue;
    }
    if (value === "--no-readme") {
      includeReadme = false;
      continue;
    }
    if (value.startsWith("-")) {
      throw new Error(`Unknown flag: ${value}`);
    }
    inputs.push(value);
  }

  if (includeReadme) {
    inputs.unshift("README.md");
  }

  if (!inputs.length) {
    inputs.push(...DEFAULT_INPUTS);
  }

  return {
    inputs,
    outputDir,
    includeReadme,
  };
}

async function collectMarkdownFiles(entry: string): Promise<string[]> {
  const resolved = resolve(entry);
  const info = await stat(resolved);
  if (info.isDirectory()) {
    const childEntries = await readdir(resolved);
    const nested = await Promise.all(
      childEntries.map((child) => collectMarkdownFiles(join(resolved, child))),
    );
    return nested.flat();
  }

  const extension = extname(resolved).toLowerCase();
  if (extension === ".md" || extension === ".mdx") {
    return [resolved];
  }
  return [];
}

function extractHeadings(
  content: string,
): Array<{ level: number; text: string }> {
  const headings: Array<{ level: number; text: string }> = [];
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (!match) continue;
    const level = match[1].length;
    const text = match[2].replace(/\s+#+\s*$/, "").trim();
    if (!text) continue;
    headings.push({ level, text });
  }
  return headings;
}

function guessTitle(
  path: string,
  headings: Array<{ level: number; text: string }>,
): string {
  const primaryHeading = headings.find((heading) => heading.level === 1);
  if (primaryHeading) {
    return primaryHeading.text;
  }
  const fallback = headings[0]?.text;
  if (fallback) return fallback;
  const segments = path.split(/\\|\//u).filter(Boolean);
  return segments[segments.length - 1]?.replace(/\.[^.]+$/, "") ?? path;
}

async function ensureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

async function exportDocument(
  filePath: string,
  outputDir: string,
  repoRoot: string,
): Promise<ExportedDocument | undefined> {
  const content = await readFile(filePath, "utf8");
  const headings = extractHeadings(content);
  const relPath = relative(repoRoot, filePath);
  const destination = join(outputDir, "markdown", relPath);
  await ensureDirectory(dirname(destination));
  await writeFile(destination, content);

  const words = content.trim().split(/\s+/).filter(Boolean);
  const stats = await stat(filePath);

  return {
    path: relPath,
    title: guessTitle(relPath, headings),
    headings,
    wordCount: words.length,
    updatedAt: stats.mtime.toISOString(),
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const resolvedOutput = resolve(options.outputDir);
  await ensureDirectory(resolvedOutput);

  const files: string[] = [];
  for (const entry of options.inputs) {
    const collected = await collectMarkdownFiles(entry);
    for (const file of collected) {
      if (!files.includes(file)) {
        files.push(file);
      }
    }
  }

  const documents: ExportedDocument[] = [];
  for (const file of files) {
    const exported = await exportDocument(file, resolvedOutput, repoRoot);
    if (exported) {
      documents.push(exported);
    }
  }

  documents.sort((a, b) => a.path.localeCompare(b.path));

  const manifest = {
    generatedAt: new Date().toISOString(),
    documentCount: documents.length,
    documents,
  };

  await writeFile(
    join(resolvedOutput, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  console.log(
    `Exported ${documents.length} markdown file${
      documents.length === 1 ? "" : "s"
    } to ${resolvedOutput}`,
  );
}

main().catch((error) => {
  console.error("[docs:export] Failed to export documentation bundle");
  console.error(error);
  process.exitCode = 1;
});
