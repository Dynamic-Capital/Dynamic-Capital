import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface CommitRecord {
  hash: string;
  author: string;
  date: string;
  summary: string;
  type: string;
  scope?: string;
  breaking: boolean;
  prNumber?: number;
  issues: number[];
}

export interface CommitGroup {
  type: string;
  commits: CommitRecord[];
}

export interface CommitPayload {
  fromTag?: string;
  toRef: string;
  generatedAt: string;
  groups: CommitGroup[];
  commits: CommitRecord[];
}

export interface ReleaseMeta {
  version: string;
  date: string;
}

export interface HighlightItem {
  text: string;
  url?: string;
}

export function getProjectCacheDir(cwd = process.cwd()): string {
  return join(cwd, ".project-cache");
}

export function ensureProjectCacheDir(cwd = process.cwd()): string {
  const cacheDir = getProjectCacheDir(cwd);
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
  return cacheDir;
}

export function resolveProjectCachePath(
  fileName: string,
  cwd = process.cwd(),
): string {
  return join(getProjectCacheDir(cwd), fileName);
}

function readJsonIfExists<T>(path: string): T | undefined {
  if (!existsSync(path)) {
    return undefined;
  }
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function loadCommitPayload(cwd = process.cwd()): CommitPayload {
  const path = resolveProjectCachePath("commits.json", cwd);
  const payload = readJsonIfExists<CommitPayload>(path);
  if (!payload) {
    throw new Error("Missing commit cache. Run proj:collect first.");
  }
  return payload;
}

export function loadReleaseMeta(cwd = process.cwd()): ReleaseMeta | undefined {
  return readJsonIfExists<ReleaseMeta>(
    resolveProjectCachePath("release-meta.json", cwd),
  );
}

export function loadHighlights(cwd = process.cwd()): HighlightItem[] {
  return readJsonIfExists<HighlightItem[]>(
    resolveProjectCachePath("highlights.json", cwd),
  ) ?? [];
}

export function cleanSummary(summary: string): string {
  return summary.replace(/^(\w+)(?:\([^)]+\))?(!)?:\s*/, "");
}

export function shortHash(hash: string): string {
  return hash.slice(0, 7);
}

export function commitLink(
  prNumber?: number,
  repo = process.env.GITHUB_REPOSITORY,
): string | undefined {
  if (!prNumber || !repo) {
    return undefined;
  }
  return `https://github.com/${repo}/pull/${prNumber}`;
}
