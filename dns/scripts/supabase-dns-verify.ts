import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type ParsedArgs = {
  readonly output: string | null;
  readonly active: string;
  readonly storage: string;
};

type ActiveSignatures = {
  readonly dao?: string;
  readonly treasury?: string;
};

type ActivePayload = {
  readonly domain?: string;
  readonly records?: Record<string, string>;
  readonly signatures?: ActiveSignatures;
};

const modulePath = fileURLToPath(import.meta.url);
const moduleDir = dirname(modulePath);
const repoRoot = resolve(moduleDir, "..", "..");

const defaultActivePath = resolve(repoRoot, "public", "dns", "active.json");
const defaultStoragePath = resolve(
  repoRoot,
  "dynamic-capital-ton",
  "storage",
  "dns-records.txt",
);

function parseArgs(argv: readonly string[]): ParsedArgs {
  let output: string | null = null;
  let active = defaultActivePath;
  let storage = defaultStoragePath;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output" && index + 1 < argv.length) {
      output = resolve(argv[index + 1]);
      index += 1;
    } else if (arg === "--active" && index + 1 < argv.length) {
      active = resolve(argv[index + 1]);
      index += 1;
    } else if (arg === "--storage" && index + 1 < argv.length) {
      storage = resolve(argv[index + 1]);
      index += 1;
    }
  }

  return { output, active, storage };
}

function parseStorage(contents: string): Record<string, string> {
  return contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .reduce<Record<string, string>>((accumulator, line) => {
      const [key, ...rest] = line.split("=");
      if (!key || rest.length === 0) {
        return accumulator;
      }
      accumulator[key] = rest.join("=").trim();
      return accumulator;
    }, {});
}

function collectDifferences(
  expected: Record<string, string>,
  storage: Record<string, string>,
): string[] {
  const differences: string[] = [];
  for (const [key, value] of Object.entries(expected)) {
    if (!(key in storage)) {
      differences.push(`storage missing key ${key}`);
      continue;
    }
    if (storage[key] !== value) {
      differences.push(`value mismatch for ${key}`);
    }
  }

  for (const key of Object.keys(storage)) {
    if (!(key in expected) && key !== "signature" && key !== "updated") {
      differences.push(`unexpected storage key ${key}`);
    }
  }

  return differences;
}

function summariseSignature(signature: string | undefined): string | null {
  return typeof signature === "string" && signature.length > 0
    ? signature.slice(0, 16)
    : null;
}

async function main(): Promise<void> {
  const { output, active, storage } = parseArgs(process.argv.slice(2));
  const activeContents = JSON.parse(
    await readFile(active, "utf8"),
  ) as ActivePayload;
  const storageMap = parseStorage(await readFile(storage, "utf8"));

  const expectedRecords = activeContents.records ?? {};
  const differences = collectDifferences(expectedRecords, storageMap);

  if (!activeContents.signatures?.dao) {
    differences.push("dao signature missing");
  }
  if (!activeContents.signatures?.treasury) {
    differences.push("treasury signature missing");
  }

  const ok = differences.length === 0;
  const verification = {
    domain: activeContents.domain,
    source: active.startsWith(repoRoot) ? relative(repoRoot, active) : active,
    matchesStorage: ok,
    comparedKeys: Object.keys(expectedRecords).length,
    differences: ok ? undefined : differences,
    daoSignaturePreview: summariseSignature(activeContents.signatures?.dao),
    treasurySignaturePreview: summariseSignature(
      activeContents.signatures?.treasury,
    ),
    generatedAt: new Date().toISOString(),
  } as const;

  const payload = { ok, verification } as const;

  if (output) {
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(`Verification written to ${output}`);
  } else {
    console.log(JSON.stringify(payload, null, 2));
  }

  if (!ok) {
    process.exitCode = 1;
  }
}

const isMain = Boolean(process.argv[1])
  && resolve(process.argv[1]!) === modulePath;

if (isMain) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : error;
    console.error(message);
    process.exitCode = 1;
  });
}
