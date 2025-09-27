import { readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

const START_MARKER = "<!-- TOC:START -->";
const END_MARKER = "<!-- TOC:END -->";

interface Heading {
  level: number;
  text: string;
  slug: string;
}

function slugifyFactory(): (heading: string) => string {
  const seen = new Map<string, number>();
  return (heading: string) => {
    const base = heading
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "")
      .replace(/^-+/, "")
      .replace(/-+$/, "") || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    if (count === 0) {
      return base;
    }
    return `${base}-${count}`;
  };
}

function extractHeadings(
  content: string,
  { maxDepth = 4 }: { maxDepth?: number } = {},
): Heading[] {
  const slugify = slugifyFactory();
  const lines = content.split(/\r?\n/);
  const headings: Heading[] = [];

  for (const line of lines) {
    const match = /^(#{2,6})\s+(.+)$/.exec(line.trim());
    if (!match) {
      continue;
    }
    const level = match[1].length;
    if (level > maxDepth) {
      continue;
    }
    const text = match[2].replace(/\s+#+\s*$/, "").trim();
    const normalized = text.toLowerCase().replace(/[^a-z\s]/g, "");
    if (
      !text || /<\!--\s*TOC:/.test(text) ||
      normalized.includes("table of contents")
    ) {
      continue;
    }
    headings.push({
      level,
      text,
      slug: slugify(text),
    });
  }

  return headings;
}

function renderToc(headings: Heading[]): string {
  if (!headings.length) {
    return "_No sections available._";
  }

  const minLevel = Math.min(...headings.map((heading) => heading.level));
  const lines: string[] = [];

  for (const heading of headings) {
    const indentLevel = Math.max(0, heading.level - minLevel);
    const indent = "  ".repeat(indentLevel);
    lines.push(`${indent}- [${heading.text}](#${heading.slug})`);
  }

  return lines.join("\n");
}

function replaceMarkers(content: string, replacement: string): string {
  const start = content.indexOf(START_MARKER);
  const end = content.indexOf(END_MARKER);

  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      "Missing TOC markers in file. Expected <!-- TOC:START --> and <!-- TOC:END -->",
    );
  }

  return (
    content.slice(0, start + START_MARKER.length) +
    "\n" +
    replacement.trim() +
    "\n" +
    content.slice(end)
  );
}

async function updateFile(path: string): Promise<void> {
  const absolutePath = resolve(path);
  const file = await readFile(absolutePath, "utf8");
  const headings = extractHeadings(file);
  const toc = renderToc(headings);
  const updated = replaceMarkers(file, toc);
  await writeFile(absolutePath, updated.replace(/\s+$/g, "") + "\n");
  const rel = relative(process.cwd(), absolutePath) || path;
  console.log(`Updated Table of Contents for ${rel}`);
}

async function main(): Promise<void> {
  const [, , ...files] = process.argv;
  if (!files.length) {
    throw new Error("Please provide at least one markdown file to update.");
  }

  await Promise.all(files.map((file) => updateFile(file)));
}

main().catch((error) => {
  console.error("[docs:update-toc] Unable to update table of contents");
  console.error(error);
  process.exitCode = 1;
});
