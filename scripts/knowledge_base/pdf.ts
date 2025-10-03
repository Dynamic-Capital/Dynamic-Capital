import { createRequire } from "node:module";

export interface PdfParsePageData {
  getTextContent(): Promise<PdfTextContent>;
}

export interface PdfTextItem {
  str?: string;
}

export interface PdfTextContent {
  items?: PdfTextItem[];
}

export interface PdfParseOptions {
  pagerender?: (pageData: PdfParsePageData) => Promise<string>;
}

export interface PdfParseResult {
  text?: string;
  numpages?: number;
  version?: string;
  info?: unknown;
  metadata?: unknown;
}

export type PdfParseFn = (
  data: Buffer,
  options?: PdfParseOptions,
) => Promise<PdfParseResult>;

export interface PdfExtractionData {
  text: string;
  pageTexts: string[];
  numPages: number;
  version?: string;
  info?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

let cachedPdfParse: PdfParseFn | undefined;

export async function loadPdfParse(): Promise<PdfParseFn> {
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

export function normaliseWhitespace(value: string): string {
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

export async function extractPdf(buffer: Buffer): Promise<PdfExtractionData> {
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
    } else if (text.length > 0) {
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
