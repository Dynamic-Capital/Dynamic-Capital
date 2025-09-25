import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

export interface StaticLandingDocument {
  lang: string;
  head: string;
  body: string;
}

let cachedDocument: StaticLandingDocument | null = null;

async function readStaticHtml(): Promise<string> {
  const staticDirectories = ["_static", "_Static"];
  const startDirectory = process.cwd();
  const visitedDirectories = new Set<string>();

  let currentDirectory = startDirectory;

  while (!visitedDirectories.has(currentDirectory)) {
    visitedDirectories.add(currentDirectory);

    for (const directory of staticDirectories) {
      const staticFilePath = path.join(
        currentDirectory,
        directory,
        "index.html",
      );
      try {
        return await readFile(staticFilePath, "utf-8");
      } catch (error: unknown) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code !== "ENOENT" && nodeError.code !== "ENOTDIR") {
          throw error;
        }
      }
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      break;
    }
    currentDirectory = parentDirectory;
  }

  throw new Error(
    `Static landing page markup not found at _static/index.html or _Static/index.html when starting from ${startDirectory}.`,
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
