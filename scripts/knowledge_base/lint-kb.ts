import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

interface CliOptions {
  paths: string[];
  strict: boolean;
  minTokens: number;
}

interface ValidationIssue {
  file: string;
  line: number;
  message: string;
  severity: "error" | "warning";
}

interface LintResult {
  file: string;
  chunks: number;
  issues: ValidationIssue[];
}

function parseArgs(argv: string[]): CliOptions {
  if (!argv.length) {
    throw new Error("Provide one or more JSONL chunk files or directories");
  }

  const paths: string[] = [];
  let strict = false;
  let minTokens = 40;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--strict") {
      strict = true;
      continue;
    }
    if (value === "--min-tokens") {
      const next = Number(argv[index + 1]);
      if (!Number.isFinite(next) || next < 0) {
        throw new Error("--min-tokens must be a non-negative integer");
      }
      minTokens = Math.floor(next);
      index += 1;
      continue;
    }
    if (value.startsWith("-")) {
      throw new Error(`Unknown flag: ${value}`);
    }
    paths.push(value);
  }

  if (!paths.length) {
    throw new Error("Provide at least one path to lint");
  }

  return {
    paths: paths.map((entry) => resolve(entry)),
    strict,
    minTokens,
  };
}

async function collectJsonlFiles(entry: string): Promise<string[]> {
  const info = await stat(entry);
  if (info.isDirectory()) {
    const children = await readdir(entry);
    const nested = await Promise.all(
      children.map((child) => collectJsonlFiles(join(entry, child))),
    );
    return nested.flat();
  }

  if (info.isFile() && extname(entry).toLowerCase() === ".jsonl") {
    return [entry];
  }

  return [];
}

function validateRecord(
  record: Record<string, unknown>,
  options: CliOptions,
  context: { file: string; line: number },
  seenIds: Set<string>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const chunkId = record.chunk_id;
  const sourcePath = record.source_path;
  const content = record.content;
  const tokenCount = record.token_count;

  if (typeof chunkId !== "string" || chunkId.trim().length === 0) {
    issues.push({
      file: context.file,
      line: context.line,
      message: "chunk_id must be a non-empty string",
      severity: "error",
    });
  } else if (seenIds.has(chunkId)) {
    issues.push({
      file: context.file,
      line: context.line,
      message: `Duplicate chunk_id ${chunkId}`,
      severity: "error",
    });
  } else {
    seenIds.add(chunkId);
  }

  if (typeof sourcePath !== "string" || sourcePath.trim().length === 0) {
    issues.push({
      file: context.file,
      line: context.line,
      message: "source_path must be a non-empty string",
      severity: "error",
    });
  }

  if (typeof content !== "string" || content.trim().length === 0) {
    issues.push({
      file: context.file,
      line: context.line,
      message: "content must be a non-empty string",
      severity: "error",
    });
  } else {
    const tokenEstimate = content.trim().split(/\s+/).length;
    if (tokenEstimate < options.minTokens) {
      issues.push({
        file: context.file,
        line: context.line,
        message:
          `content is too short (${tokenEstimate} tokens, expected >= ${options.minTokens})`,
        severity: options.strict ? "error" : "warning",
      });
    }
  }

  if (tokenCount !== undefined && typeof tokenCount !== "number") {
    issues.push({
      file: context.file,
      line: context.line,
      message: "token_count must be numeric when provided",
      severity: "warning",
    });
  }

  return issues;
}

async function lintFile(
  path: string,
  options: CliOptions,
): Promise<LintResult> {
  const content = await readFile(path, "utf8");
  const lines = content.split(/\r?\n/);
  const seenIds = new Set<string>();
  const issues: ValidationIssue[] = [];
  let chunks = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      continue;
    }
    chunks += 1;
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      issues.push(
        ...validateRecord(
          parsed,
          options,
          { file: path, line: index + 1 },
          seenIds,
        ),
      );
    } catch (error) {
      issues.push({
        file: path,
        line: index + 1,
        message: `Invalid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
        severity: "error",
      });
    }
  }

  return { file: path, chunks, issues };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const fileSets = await Promise.all(options.paths.map(collectJsonlFiles));
  const files = [...new Set(fileSets.flat())];

  if (!files.length) {
    console.warn("No JSONL files detected. Nothing to lint.");
    return;
  }

  const results = await Promise.all(
    files.map((file) => lintFile(file, options)),
  );
  const allIssues = results.flatMap((result) => result.issues);

  for (const issue of allIssues) {
    const level = issue.severity === "error" ? "ERROR" : "WARN";
    console.log(
      `[lint:kb] ${level} ${issue.file}:${issue.line} ${issue.message}`,
    );
  }

  const totalChunks = results.reduce((sum, result) => sum + result.chunks, 0);
  const errorCount =
    allIssues.filter((issue) => issue.severity === "error").length;
  const warningCount =
    allIssues.filter((issue) => issue.severity === "warning").length;

  console.log(
    `[lint:kb] Reviewed ${files.length} file${
      files.length === 1 ? "" : "s"
    } (${totalChunks} chunk${totalChunks === 1 ? "" : "s"})`,
  );
  console.log(
    `[lint:kb] Found ${errorCount} error${
      errorCount === 1 ? "" : "s"
    } and ${warningCount} warning${warningCount === 1 ? "" : "s"}`,
  );

  if (errorCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[lint:kb] Linting failed");
  console.error(error);
  process.exitCode = 1;
});
