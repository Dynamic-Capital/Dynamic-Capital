import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
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

interface PdfExtractionData {
  text: string;
  pageTexts: string[];
  numPages: number;
  version?: string;
  info?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface ExtractedFileRecord {
  path: string;
  type: "markdown" | "csv" | "json" | "pdf" | "unknown";
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

type SupportedType = "markdown" | "csv" | "json" | "pdf" | "unknown";

interface PdfParsePageData {
  getTextContent(): Promise<PdfTextContent>;
}

interface PdfTextItem {
  str?: string;
}

interface PdfTextContent {
  items?: PdfTextItem[];
}

interface PdfParseOptions {
  pagerender?: (pageData: PdfParsePageData) => Promise<string>;
}

interface PdfParseResult {
  text?: string;
  numpages?: number;
  version?: string;
  info?: unknown;
  metadata?: unknown;
}

type PdfParseFn = (
  data: Buffer,
  options?: PdfParseOptions,
) => Promise<PdfParseResult>;

let cachedPdfParse: PdfParseFn | undefined;

async function loadPdfParse(): Promise<PdfParseFn> {
  if (cachedPdfParse) {
    return cachedPdfParse;
  }

  const require = createRequire(import.meta.url);
  const mod = require("pdf-parse") as unknown;
  const candidate = typeof mod === "function"
    ? mod
    : (mod as { default?: unknown }).default;

  if (typeof candidate !== "function") {
    throw new Error("Failed to load pdf-parse module");
  }

  cachedPdfParse = candidate as PdfParseFn;
  return cachedPdfParse;
}

function normaliseWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function serialiseStructured(
  value: unknown,
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return undefined;
  }

  seen.add(value);

  const withGetAll = value as {
    getAll?: () => Map<unknown, unknown> | Record<string, unknown>;
  };
  if (typeof withGetAll.getAll === "function") {
    try {
      const all = withGetAll.getAll();
      if (all instanceof Map) {
        const record: Record<string, unknown> = {};
        for (const [key, entry] of all.entries()) {
          if (typeof key === "string") {
            const serialised = serialiseStructured(entry, seen);
            if (serialised !== undefined) {
              record[key] = serialised;
            }
          }
        }
        if (Object.keys(record).length > 0) {
          return record;
        }
      } else if (all && typeof all === "object") {
        const record = serialiseStructured(all, seen);
        if (record !== undefined) {
          return record;
        }
      }
    } catch (_error) {
      // Ignore metadata getAll failures and continue with other strategies.
    }
  }

  if (value instanceof Map) {
    const record: Record<string, unknown> = {};
    for (const [key, entry] of value.entries()) {
      if (typeof key === "string") {
        const serialised = serialiseStructured(entry, seen);
        if (serialised !== undefined) {
          record[key] = serialised;
        }
      }
    }
    return Object.keys(record).length > 0 ? record : undefined;
  }

  if (Array.isArray(value)) {
    const serialisedArray = value
      .map((entry) => serialiseStructured(entry, seen))
      .filter((entry) => entry !== undefined);
    return serialisedArray.length > 0 ? serialisedArray : undefined;
  }

  const record: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "function") {
      continue;
    }
    const serialised = serialiseStructured(entry, seen);
    if (serialised !== undefined) {
      record[key] = serialised;
    }
  }

  return Object.keys(record).length > 0 ? record : undefined;
}

async function extractPdf(buffer: Buffer): Promise<PdfExtractionData> {
  const pageTexts: string[] = [];
  const pagerender = async (pageData: PdfParsePageData): Promise<string> => {
    const textContent = await pageData.getTextContent();
    const items = textContent.items ?? [];
    const joined = items
      .map((item) => (typeof item.str === "string" ? item.str : ""))
      .join(" ");
    const normalised = normaliseWhitespace(joined);
    pageTexts.push(normalised);
    return normalised;
  };

  const pdfParse = await loadPdfParse();
  const parsed = await pdfParse(buffer, { pagerender });

  const text = typeof parsed.text === "string"
    ? normaliseWhitespace(parsed.text)
    : "";

  if (pageTexts.length === 0 && text.length > 0) {
    const fallbackPages = text
      .split(/\f+/u)
      .map((entry) => normaliseWhitespace(entry))
      .filter((entry) => entry.length > 0);

    if (fallbackPages.length > 0) {
      pageTexts.push(...fallbackPages);
    } else {
      pageTexts.push(text);
    }
  }

  const numPages = parsed.numpages ?? pageTexts.length;

  const info = serialiseStructured(parsed.info);
  const metadata = serialiseStructured(parsed.metadata);

  return {
    text: pageTexts.length > 0 ? pageTexts.join("\n") : text,
    pageTexts,
    numPages,
    version: parsed.version,
    info: typeof info === "object" && !Array.isArray(info)
      ? info as Record<string, unknown>
      : undefined,
    metadata: typeof metadata === "object" && !Array.isArray(metadata)
      ? metadata as Record<string, unknown>
      : undefined,
  } satisfies PdfExtractionData;
}

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
    case ".pdf":
      return "pdf";
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
    case "pdf":
      data = await extractPdf(buffer);
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
