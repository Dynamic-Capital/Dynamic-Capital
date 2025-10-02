import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

interface DropFileEntry {
  path: string;
  purpose?: string;
}

interface DropEntry {
  id: string;
  title: string;
  files?: DropFileEntry[];
}

interface KnowledgeBaseIndex {
  drops?: DropEntry[];
}

interface ExtractedFileRecord {
  path: string;
  type: "markdown" | "csv" | "json" | "unknown";
  size: number;
  sha256: string;
  extractedAt: string;
  data: unknown;
  purpose?: string;
}

interface ExtractionResult {
  dropId: string;
  title?: string;
  generatedAt: string;
  sourceIndex: string;
  files: ExtractedFileRecord[];
}

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)));
const repoRoot = path.resolve(__dirname, "..", "..");
const knowledgeBaseRoot = path.join(repoRoot, "data", "knowledge_base");
const indexPath = path.join(knowledgeBaseRoot, "index.json");

type SupportedType = "markdown" | "csv" | "json" | "unknown";

function detectType(filePath: string): SupportedType {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".md":
    case ".markdown":
      return "markdown";
    case ".csv":
      return "csv";
    case ".json":
    case ".jsonl":
      return "json";
    default:
      return "unknown";
  }
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index] ?? "";
    if (char === '"') {
      const next = line[index + 1] ?? "";
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((value) => value.trim());
}

function parseCsv(content: string): Record<string, string>[] {
  const lines = content
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0] ?? "");
  const rows: Record<string, string>[] = [];

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    const entry: Record<string, string> = {};
    headers.forEach((header, index) => {
      entry[header] = values[index] ?? "";
    });
    rows.push(entry);
  }

  return rows;
}

async function ensureDir(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function hashContent(buffer: Buffer): Promise<string> {
  const hash = createHash("sha256");
  hash.update(buffer);
  return hash.digest("hex");
}

async function loadIndex(): Promise<KnowledgeBaseIndex> {
  const raw = await readFile(indexPath, "utf-8");
  return JSON.parse(raw) as KnowledgeBaseIndex;
}

function pickDrop(
  index: KnowledgeBaseIndex,
  dropId: string,
): DropEntry | undefined {
  return index.drops?.find((drop) => drop.id === dropId);
}

async function extractFile(
  drop: DropEntry,
  file: DropFileEntry,
): Promise<ExtractedFileRecord> {
  const absolutePath = path.join(knowledgeBaseRoot, file.path);
  const fileStats = await stat(absolutePath);
  const buffer = await readFile(absolutePath);
  const sha256 = await hashContent(buffer);
  const type = detectType(file.path);
  let data: unknown;

  switch (type) {
    case "markdown":
      data = buffer.toString("utf-8");
      break;
    case "csv":
      data = parseCsv(buffer.toString("utf-8"));
      break;
    case "json":
      data = JSON.parse(buffer.toString("utf-8"));
      break;
    default:
      data = buffer.toString("base64");
      break;
  }

  return {
    path: file.path,
    purpose: file.purpose,
    type,
    size: fileStats.size,
    sha256,
    extractedAt: new Date().toISOString(),
    data,
  } satisfies ExtractedFileRecord;
}

async function extractDrop(
  dropId: string,
  outputPath?: string,
): Promise<ExtractionResult> {
  const index = await loadIndex();
  const drop = pickDrop(index, dropId);

  if (!drop) {
    throw new Error(
      `Drop '${dropId}' was not found in data/knowledge_base/index.json`,
    );
  }

  const files = drop.files ?? [];
  const defaultOutputRelative = path.posix.join(dropId, "extracted.json");

  const filteredFiles = outputPath
    ? files
    : files.filter((entry) => entry.path !== defaultOutputRelative);

  if (filteredFiles.length === 0) {
    throw new Error(`Drop '${dropId}' does not list any files to extract.`);
  }

  const result: ExtractionResult = {
    dropId,
    title: drop.title,
    generatedAt: new Date().toISOString(),
    sourceIndex: path.relative(repoRoot, indexPath),
    files: [],
  };

  for (const entry of filteredFiles) {
    const record = await extractFile(drop, entry);
    result.files.push(record);
  }

  const destination = outputPath
    ? path.resolve(process.cwd(), outputPath)
    : path.join(knowledgeBaseRoot, dropId, "extracted.json");

  await ensureDir(destination);
  await writeFile(destination, `${JSON.stringify(result, null, 2)}\n`, "utf-8");

  return result;
}

async function main() {
  const [, , dropId, output] = process.argv;

  if (!dropId) {
    console.error(
      "Usage: tsx scripts/knowledge_base/extract-drop.ts <drop-id> [output-path]",
    );
    process.exitCode = 1;
    return;
  }

  try {
    const result = await extractDrop(dropId, output);
    console.log(
      `Extracted ${result.files.length} file(s) for drop '${dropId}'.`,
    );
    console.log(
      `Output written to ${
        output ?? path.join("data/knowledge_base", dropId, "extracted.json")
      }`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

const cliTarget = process.argv[1];
const invokedDirectly = typeof cliTarget === "string"
  ? import.meta.url === pathToFileURL(cliTarget).href
  : false;

if (invokedDirectly) {
  main();
}

export { extractDrop };
