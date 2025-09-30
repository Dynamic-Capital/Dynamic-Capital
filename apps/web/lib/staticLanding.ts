import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

export interface StaticLandingDocument {
  lang: string;
  head: string;
  body: string;
}

export const STATIC_SNAPSHOT_VISIBILITY_STYLE_ID = "static-snapshot-visibility";

const STATIC_SNAPSHOT_VISIBILITY_STYLE = `
<style id="${STATIC_SNAPSHOT_VISIBILITY_STYLE_ID}">
  [data-static-snapshot] [style*="opacity:0"],
  [data-static-snapshot] [style*="opacity: 0"] {
    opacity: 1 !important;
  }

  [data-static-snapshot] [style*="transform:translate"],
  [data-static-snapshot] [style*="transform: translate"],
  [data-static-snapshot] [style*="transform:scale"],
  [data-static-snapshot] [style*="transform: scale"] {
    transform: none !important;
  }

  [data-static-snapshot] [style*="filter:blur"],
  [data-static-snapshot] [style*="filter: blur"] {
    filter: none !important;
  }

  [data-static-snapshot] [style*="visibility:hidden"],
  [data-static-snapshot] [style*="visibility: hidden"] {
    visibility: visible !important;
  }
</style>
`.trim();

export function ensureStaticSnapshotVisibilityMarkup(
  markup: string,
  options: { position?: "append" | "prepend" } = {},
): string {
  const existingMarkup = markup ?? "";

  if (existingMarkup.includes(`id="${STATIC_SNAPSHOT_VISIBILITY_STYLE_ID}"`)) {
    return existingMarkup;
  }

  const insertion = STATIC_SNAPSHOT_VISIBILITY_STYLE;
  if (!existingMarkup) {
    return insertion;
  }

  if (options.position === "prepend") {
    return `${insertion}\n${existingMarkup}`;
  }

  return `${existingMarkup}\n${insertion}`;
}

let cachedDocument: StaticLandingDocument | null = null;

async function readStaticHtml(): Promise<string> {
  const staticDirectories = ["_static", "_Static"];

  for (const directory of staticDirectories) {
    const staticFilePath = path.join(process.cwd(), directory, "index.html");
    try {
      return await readFile(staticFilePath, "utf-8");
    } catch (error: unknown) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code !== "ENOENT") {
        throw error;
      }
    }
  }

  throw new Error(
    "Static landing page markup not found at _static/index.html or _Static/index.html.",
  );
}

export async function getStaticLandingDocument(): Promise<
  StaticLandingDocument
> {
  if (cachedDocument) {
    return cachedDocument;
  }

  const html = await readStaticHtml();

  const langMatch = html.match(/<html[^>]*lang=["']([^"']+)["'][^>]*>/i);
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  const lang = langMatch?.[1] ?? "en";
  const head = headMatch?.[1]?.trim() ?? "";
  const body = bodyMatch?.[1]?.trim() ?? "";

  cachedDocument = { lang, head, body };
  return cachedDocument;
}

export function clearStaticLandingCache() {
  cachedDocument = null;
}
