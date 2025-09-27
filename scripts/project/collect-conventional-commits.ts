import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import process from "node:process";

interface CommitRecord {
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

interface CommitGroup {
  type: string;
  commits: CommitRecord[];
}

interface OutputPayload {
  fromTag?: string;
  toRef: string;
  generatedAt: string;
  groups: CommitGroup[];
  commits: CommitRecord[];
}

function runGit(args: string[]): string {
  return execSync(`git ${args.join(' ')}`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function safeGit(args: string[]): string | undefined {
  try {
    return runGit(args);
  } catch (_error) {
    return undefined;
  }
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    if (value === undefined) {
      result[key] = true;
    } else {
      result[key] = value;
    }
  }
  return result;
}

function extractMetadata(summary: string): {
  type: string;
  scope?: string;
  breaking: boolean;
  prNumber?: number;
  issues: number[];
} {
  const match = summary.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
  let type = 'chore';
  let scope: string | undefined;
  let breaking = false;
  let cleanSummary = summary;
  if (match) {
    type = match[1];
    scope = match[2];
    breaking = Boolean(match[3]);
    cleanSummary = match[4];
  }

  const issues = Array.from(cleanSummary.matchAll(/#(\d+)/g)).map((value) => Number.parseInt(value[1], 10));
  const prMatch = cleanSummary.match(/\(#(\d+)\)/);
  const prNumber = prMatch ? Number.parseInt(prMatch[1], 10) : undefined;

  return { type, scope, breaking, prNumber, issues };
}

function main(): void {
  const args = parseArgs(process.argv);
  const cwd = process.cwd();
  const cacheDir = join(cwd, '.project-cache');
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  const explicitFrom = typeof args.from === 'string' ? (args.from as string) : undefined;
  const explicitTo = typeof args.to === 'string' ? (args.to as string) : undefined;

  const lastTag = explicitFrom ?? safeGit(['describe', '--tags', '--abbrev=0']);
  const toRef = explicitTo ?? 'HEAD';
  const range = lastTag ? `${lastTag}..${toRef}` : toRef;

  const rawLog = safeGit(['log', range, '--pretty=format:%H%x1f%an%x1f%ad%x1f%s%x1e', '--date=short']);
  if (!rawLog) {
    const emptyPayload: OutputPayload = {
      fromTag: lastTag,
      toRef,
      generatedAt: new Date().toISOString(),
      groups: [],
      commits: [],
    };
    writeFileSync(join(cacheDir, 'commits.json'), JSON.stringify(emptyPayload, null, 2));
    return;
  }

  const entries = rawLog
    .split('\u001e')
    .map((line) => line.trim())
    .filter(Boolean);

  const commits: CommitRecord[] = entries.map((entry) => {
    const [hash, author, date, summary] = entry.split('\u001f');
    const metadata = extractMetadata(summary);
    return {
      hash,
      author,
      date,
      summary,
      type: metadata.type,
      scope: metadata.scope,
      breaking: metadata.breaking,
      prNumber: metadata.prNumber,
      issues: metadata.issues,
    };
  });

  const groups = new Map<string, CommitRecord[]>();
  for (const commit of commits) {
    const list = groups.get(commit.type) ?? [];
    list.push(commit);
    groups.set(commit.type, list);
  }

  const payload: OutputPayload = {
    fromTag: lastTag,
    toRef,
    generatedAt: new Date().toISOString(),
    groups: Array.from(groups.entries()).map(([type, groupedCommits]) => ({
      type,
      commits: groupedCommits,
    })),
    commits,
  };

  writeFileSync(join(cacheDir, 'commits.json'), JSON.stringify(payload, null, 2));
}

try {
  main();
} catch (error) {
  console.error('[collect-conventional-commits] Failed to collect commits');
  console.error(error);
  process.exitCode = 1;
}
