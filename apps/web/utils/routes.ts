import fs from "node:fs";
import path from "node:path";

export type RouteRecord = {
  /** URL path for the route (e.g. `/about`, `/blog/[slug]`). */
  route: string;
  /** Relative file path for the route entry point. */
  file: string;
};

const APP_ROUTE_FILE = /^page\.(?:jsx?|tsx?|mdx)$/i;
const PAGE_ROUTE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mdx"]);
const SHARED_SKIP_DIRS = new Set(["node_modules", "__tests__", "__mocks__"]);

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

function formatRoute(segments: string[]): string {
  const cleaned = segments.filter((segment) => segment.length > 0);
  if (cleaned.length === 0) {
    return "/";
  }
  return `/${cleaned.join("/")}`.replace(/\/+/g, "/");
}

function shouldSkipDirectory(name: string): boolean {
  if (!name) return true;
  if (SHARED_SKIP_DIRS.has(name)) return true;
  if (name.startsWith(".")) return true;
  return false;
}

function isGroupSegment(name: string): boolean {
  return name.startsWith("(") && name.endsWith(")");
}

function isParallelSegment(name: string): boolean {
  return name.startsWith("@");
}

function normalizeAppSegment(name: string): string | null {
  if (isGroupSegment(name) || isParallelSegment(name)) {
    return null;
  }
  if (name === "") {
    return null;
  }
  if (name.startsWith(".")) {
    return null;
  }
  return name;
}

function collectAppRoutes(
  dir: string,
  segments: string[],
  results: RouteRecord[],
  rootDir: string,
  seen: Set<string>,
): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const entryName = entry.name;
    if (entry.isDirectory()) {
      if (shouldSkipDirectory(entryName)) {
        continue;
      }
      const nextDir = path.join(dir, entryName);
      const normalized = normalizeAppSegment(entryName);
      const nextSegments = normalized === null
        ? segments
        : [...segments, normalized];
      collectAppRoutes(nextDir, nextSegments, results, rootDir, seen);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!APP_ROUTE_FILE.test(entryName)) {
      continue;
    }

    const route = formatRoute(segments);
    const relative = toPosixPath(path.relative(rootDir, path.join(dir, entryName)) || entryName);
    const key = `${route}::${relative}`;
    if (!seen.has(key)) {
      results.push({ route, file: relative });
      seen.add(key);
    }
  }
}

function shouldSkipPagesDir(name: string): boolean {
  if (shouldSkipDirectory(name)) return true;
  if (name === "api") return true;
  if (name.startsWith("_")) return true;
  return false;
}

function collectPageRoutes(
  dir: string,
  segments: string[],
  results: RouteRecord[],
  rootDir: string,
  seen: Set<string>,
): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const entryName = entry.name;
    if (entry.isDirectory()) {
      if (shouldSkipPagesDir(entryName)) {
        continue;
      }
      const nextDir = path.join(dir, entryName);
      const nextSegments = [...segments, entryName];
      collectPageRoutes(nextDir, nextSegments, results, rootDir, seen);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const parsed = path.parse(entryName);
    const ext = parsed.ext.toLowerCase();
    if (!PAGE_ROUTE_EXTENSIONS.has(ext)) {
      continue;
    }

    if (parsed.name.startsWith("_")) {
      continue;
    }

    const routeSegments = parsed.name === "index"
      ? segments
      : [...segments, parsed.name];
    const route = formatRoute(routeSegments);
    const relative = toPosixPath(path.relative(rootDir, path.join(dir, entryName)) || entryName);
    const key = `${route}::${relative}`;
    if (!seen.has(key)) {
      results.push({ route, file: relative });
      seen.add(key);
    }
  }
}

function sortRoutes(routes: RouteRecord[]): RouteRecord[] {
  return routes
    .slice()
    .sort((a, b) => {
      if (a.route === b.route) {
        return a.file.localeCompare(b.file);
      }
      return a.route.localeCompare(b.route);
    });
}

export function getAppRoutes(
  appDir = path.join(process.cwd(), "apps", "web", "app"),
): RouteRecord[] {
  let stats: fs.Stats;
  try {
    stats = fs.statSync(appDir);
  } catch {
    return [];
  }
  if (!stats.isDirectory()) {
    return [];
  }
  const results: RouteRecord[] = [];
  collectAppRoutes(appDir, [], results, appDir, new Set());
  return sortRoutes(results);
}

export function getPageRoutes(
  pagesDir = path.join(process.cwd(), "apps", "web", "pages"),
): RouteRecord[] {
  let stats: fs.Stats;
  try {
    stats = fs.statSync(pagesDir);
  } catch {
    return [];
  }
  if (!stats.isDirectory()) {
    return [];
  }
  const results: RouteRecord[] = [];
  collectPageRoutes(pagesDir, [], results, pagesDir, new Set());
  return sortRoutes(results);
}
