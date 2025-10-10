#!/usr/bin/env tsx
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type BundleManifest = {
  bundles?: Array<{
    id?: string;
    label?: string;
    paths?: string[];
    expectedSha256?: string;
  }>;
};

interface BundleSummary {
  id: string;
  label: string | null;
  sourcePaths: string[];
  stagingDir: string;
  uploadHint: string;
  expectedSha256: string | null;
  computedSha256: string;
  matchesExpected: boolean | null;
  generatedAt: string;
}

interface CliOptions {
  manifestPath: string;
  outputDir: string;
  bundleFilter: Set<string> | null;
}

interface StagedEntry {
  originalRelative: string;
  stagedAbsolute: string;
}

const repoRoot = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "..",
  "..",
);

function defaultManifestPath(): string {
  return join(repoRoot, "dynamic-capital-ton", "storage", "manifest.json");
}

function defaultOutputDir(): string {
  return join(repoRoot, "dynamic-capital-ton", "storage", "predeploy");
}

function printHelp(): void {
  console.log(`Usage: npm run ton:build-site-predeploy [-- <options>]

Options:
  --manifest <path>   Override the manifest file (default: ${
    relative(
      repoRoot,
      defaultManifestPath(),
    )
  })
  --out <dir>         Directory where the predeployment bundles are staged
                       (default: ${relative(repoRoot, defaultOutputDir())})
  --bundle <id>       Only build the specified bundle (repeatable)
  --help              Show this message
`);
}

class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliError";
  }
}

function requireValue(
  argv: string[],
  index: number,
  flag: string,
): string {
  const value = argv[index + 1];
  if (!value) {
    throw new CliError(`Expected a value after ${flag}`);
  }
  return value;
}

function parseArgs(argv: string[]): CliOptions | null {
  const bundleFilter = new Set<string>();
  let manifestPath: string | null = null;
  let outputDir: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      printHelp();
      return null;
    }
    if (token === "--manifest") {
      manifestPath = requireValue(argv, index, "--manifest");
      index += 1;
      continue;
    }
    if (token.startsWith("--manifest=")) {
      manifestPath = token.slice("--manifest=".length);
      continue;
    }
    if (token === "--out" || token === "--output") {
      outputDir = requireValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token.startsWith("--out=") || token.startsWith("--output=")) {
      const [, value] = token.split("=", 2);
      outputDir = value ?? null;
      continue;
    }
    if (token === "--bundle") {
      const value = requireValue(argv, index, "--bundle");
      bundleFilter.add(value.trim());
      index += 1;
      continue;
    }
    if (token.startsWith("--bundle=")) {
      const value = token.slice("--bundle=".length);
      if (value) {
        bundleFilter.add(value.trim());
      }
      continue;
    }
  }

  return {
    manifestPath: resolve(repoRoot, manifestPath ?? defaultManifestPath()),
    outputDir: resolve(repoRoot, outputDir ?? defaultOutputDir()),
    bundleFilter: bundleFilter.size > 0 ? bundleFilter : null,
  };
}

async function ensureDir(path: string): Promise<void> {
  await fs.mkdir(path, { recursive: true });
}

function normalizePath(value: string): string {
  return value.split(/\\+/g).join("/");
}

function isWithinRepo(targetPath: string): boolean {
  if (targetPath === repoRoot) {
    return true;
  }
  const relativeToRepo = relative(repoRoot, targetPath);
  return !relativeToRepo.startsWith("..") && !isAbsolute(relativeToRepo);
}

function resolveRepoPath(rawPath: string, bundleId: string): string {
  const absolute = resolve(repoRoot, rawPath);
  if (!isWithinRepo(absolute)) {
    throw new Error(
      `Resolved path '${rawPath}' for bundle '${bundleId}' escapes the repository`,
    );
  }
  return absolute;
}

async function hashPath(
  absolutePath: string,
  hash: import("node:crypto").Hash,
  relativePath: string,
): Promise<void> {
  const stats = await fs.stat(absolutePath);
  if (stats.isFile()) {
    const data = await fs.readFile(absolutePath);
    hash.update(`file:${relativePath}:${data.length}\n`);
    hash.update(data);
    return;
  }

  if (stats.isDirectory()) {
    hash.update(`dir:${relativePath}\n`);
    const entries = await fs.readdir(absolutePath, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.name === "." || entry.name === "..") continue;
      if (!entry.isDirectory() && !entry.isFile()) continue;
      const nextAbsolute = join(absolutePath, entry.name);
      const nextRelative = relativePath
        ? `${relativePath}/${entry.name}`
        : entry.name;
      await hashPath(nextAbsolute, hash, nextRelative);
    }
    return;
  }

  throw new Error(`Unsupported entry type at ${relativePath}`);
}

function sanitizeId(id: string): string {
  const cleaned = id.replace(/[^a-z0-9_.-]+/gi, "-").replace(/^-+|-+$/g, "");
  return cleaned || "bundle";
}

async function copyEntry(
  source: string,
  destination: string,
): Promise<void> {
  const stats = await fs.lstat(source);
  if (stats.isSymbolicLink()) {
    throw new Error(
      `Symbolic links are not supported in staged bundles (${source})`,
    );
  }
  if (stats.isFile()) {
    await ensureDir(dirname(destination));
    await fs.copyFile(source, destination);
    return;
  }

  if (stats.isDirectory()) {
    const entries = await fs.readdir(source, { withFileTypes: true });
    await ensureDir(destination);
    await Promise.all(
      entries.map(async (entry) => {
        if (entry.name === "." || entry.name === "..") return;
        const nextSource = join(source, entry.name);
        const nextDestination = join(destination, entry.name);
        await copyEntry(nextSource, nextDestination);
      }),
    );
    return;
  }

  throw new Error(`Unsupported entry type at ${source}`);
}

async function copySourceIntoStage(
  stagingDir: string,
  bundleId: string,
  sourcePaths: string[],
): Promise<StagedEntry[]> {
  const stagedEntries: StagedEntry[] = [];
  const seen = new Set<string>();

  for (const rawSource of sourcePaths) {
    const normalized = normalizePath(rawSource.trim());
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const absoluteSource = resolveRepoPath(normalized, bundleId);
    let stats;
    try {
      stats = await fs.lstat(absoluteSource);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(
          `Source path '${normalized}' for bundle '${bundleId}' does not exist`,
        );
      }
      throw error;
    }

    const destination = join(stagingDir, ...normalized.split("/"));
    await copyEntry(absoluteSource, destination);

    if (stats.isDirectory()) {
      stagedEntries.push({
        originalRelative: normalized,
        stagedAbsolute: destination,
      });
      continue;
    }

    if (stats.isSymbolicLink()) {
      throw new Error(
        `Symbolic links are not supported in bundle '${bundleId}' (at ${normalized})`,
      );
    }

    stagedEntries.push({
      originalRelative: normalized,
      stagedAbsolute: destination,
    });
  }

  return stagedEntries;
}

async function writeBundleMetadata(
  stagingDir: string,
  summary: BundleSummary,
): Promise<void> {
  const metadataPath = join(stagingDir, "PREDEPLOY_METADATA.json");
  await fs.writeFile(metadataPath, JSON.stringify(summary, null, 2) + "\n");
}

function buildMarkdownSummary(
  rootRelativeOutput: string,
  generatedAt: string,
  bundles: BundleSummary[],
): string {
  const lines: string[] = [];
  lines.push("# TON Site Pre-deployment Build Summary");
  lines.push("");
  lines.push(`Output directory: \`${rootRelativeOutput}\``);
  lines.push(`Generated at: ${generatedAt}`);
  lines.push("");

  for (const bundle of bundles) {
    const title = bundle.label
      ? `${bundle.label} (\`${bundle.id}\`)`
      : `Bundle \`${bundle.id}\``;
    lines.push(`## ${title}`);
    lines.push("");
    lines.push(`- Source paths: ${bundle.sourcePaths.join(", ") || "(none)"}`);
    lines.push(
      `- Staging directory: \`${relative(repoRoot, bundle.stagingDir)}\``,
    );
    lines.push(`- Upload from: \`${relative(repoRoot, bundle.uploadHint)}\``);
    lines.push(`- Computed SHA-256: \`${bundle.computedSha256}\``);
    if (bundle.expectedSha256) {
      lines.push(`- Manifest SHA-256: \`${bundle.expectedSha256}\``);
      lines.push(
        `- Matches manifest: ${bundle.matchesExpected ? "yes" : "no"}`,
      );
    } else {
      lines.push("- Manifest SHA-256: (not specified)");
    }
    lines.push("- Metadata file: `PREDEPLOY_METADATA.json`");
    lines.push(
      "- Next step: `toncli storage upload <path above> --dns dynamiccapital.ton`",
    );
    lines.push("");
  }

  return lines.join("\n") + "\n";
}

async function computeBundleHashFromStage(
  entries: StagedEntry[],
): Promise<string> {
  const hash = createHash("sha256");
  for (const entry of entries) {
    await hashPath(entry.stagedAbsolute, hash, entry.originalRelative);
  }
  return hash.digest("hex");
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (!options) {
    return;
  }

  try {
    await fs.access(options.manifestPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Manifest not found at ${options.manifestPath}`);
    }
    throw error;
  }

  const manifestRaw = await fs.readFile(options.manifestPath, "utf8");
  let manifest: BundleManifest;
  try {
    manifest = JSON.parse(manifestRaw) as BundleManifest;
  } catch (error) {
    throw new Error(
      `Unable to parse manifest at ${options.manifestPath}: ${
        (error as Error).message
      }`,
    );
  }

  const bundles = Array.isArray(manifest.bundles) ? manifest.bundles : [];
  if (bundles.length === 0) {
    console.warn(
      `No bundles declared in manifest ${options.manifestPath}. Nothing to do.`,
    );
    return;
  }

  await ensureDir(options.outputDir);

  const summaries: BundleSummary[] = [];
  const generationTimestamp = new Date().toISOString();
  for (const bundle of bundles) {
    const id = (bundle.id ?? "").trim();
    if (!id) {
      console.warn("Skipping bundle with missing id");
      continue;
    }
    if (options.bundleFilter && !options.bundleFilter.has(id)) {
      continue;
    }

    const label = (bundle.label ?? "").trim();
    const sanitizedId = sanitizeId(id);
    const stagingDir = join(options.outputDir, sanitizedId);
    await fs.rm(stagingDir, { recursive: true, force: true });
    await ensureDir(stagingDir);

    const sourcePaths = Array.isArray(bundle.paths)
      ? bundle.paths.filter((entry): entry is string =>
        typeof entry === "string"
      )
      : [];
    if (sourcePaths.length === 0) {
      console.warn(`Bundle '${id}' has no source paths; skipping.`);
      continue;
    }

    console.log(
      `→ Building bundle '${id}' (${sourcePaths.length} path${
        sourcePaths.length === 1 ? "" : "s"
      })`,
    );

    const stagedEntries = await copySourceIntoStage(
      stagingDir,
      id,
      sourcePaths,
    );
    if (stagedEntries.length === 0) {
      console.warn(`Bundle '${id}' produced no staged entries; skipping.`);
      continue;
    }

    const computedSha256 = await computeBundleHashFromStage(stagedEntries);
    const expectedSha256 = (bundle.expectedSha256 ?? "").trim().toLowerCase() ||
      null;
    const matchesExpected = expectedSha256
      ? computedSha256 === expectedSha256
      : null;

    const primaryUploadPath = stagedEntries.length === 1
      ? stagedEntries[0].stagedAbsolute
      : stagingDir;

    const summary: BundleSummary = {
      id,
      label: label || null,
      sourcePaths: sourcePaths.map((entry) => normalizePath(entry)),
      stagingDir,
      uploadHint: primaryUploadPath,
      expectedSha256,
      computedSha256,
      matchesExpected,
      generatedAt: generationTimestamp,
    };

    await writeBundleMetadata(stagingDir, summary);
    summaries.push(summary);

    console.log(
      `   Staged at ${
        relative(repoRoot, primaryUploadPath)
      } (SHA-256: ${computedSha256})`,
    );
    if (matchesExpected === false) {
      console.warn(
        `   ⚠️  Computed hash does not match manifest (${expectedSha256}).`,
      );
    }
  }

  if (summaries.length === 0) {
    console.warn("No bundles were staged.");
    return;
  }

  const summaryOutput = {
    generatedAt: generationTimestamp,
    outputDir: options.outputDir,
    bundles: summaries,
  };

  const summaryPath = join(options.outputDir, "summary.json");
  await fs.writeFile(
    summaryPath,
    JSON.stringify(summaryOutput, null, 2) + "\n",
  );

  const markdown = buildMarkdownSummary(
    relative(repoRoot, options.outputDir),
    generationTimestamp,
    summaries,
  );
  await fs.writeFile(join(options.outputDir, "SUMMARY.md"), markdown);

  console.log("");
  console.log(
    `Pre-deployment bundles staged in ${relative(repoRoot, options.outputDir)}`,
  );
  console.log(
    `Review ${relative(repoRoot, summaryPath)} for a machine-readable summary.`,
  );
}

try {
  await main();
} catch (error) {
  if (error instanceof CliError) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  console.error((error as Error).message);
  process.exitCode = 1;
}
