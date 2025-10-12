import { mkdir, readFile, writeFile } from "fs/promises";
import { resolve, dirname, relative } from "path";
import { fileURLToPath } from "url";

const modulePath = fileURLToPath(import.meta.url);
const __dirname = dirname(modulePath);
const repoRoot = resolve(__dirname, "..", "..");

const defaultActivePath = resolve(repoRoot, "public", "dns", "active.json");
const defaultStoragePath = resolve(
  repoRoot,
  "dynamic-capital-ton",
  "storage",
  "dns-records.txt",
);

function parseArgs(argv) {
  const args = { output: null, active: defaultActivePath, storage: defaultStoragePath };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--output" && i + 1 < argv.length) {
      args.output = resolve(argv[i + 1]);
      i += 1;
    } else if (arg === "--active" && i + 1 < argv.length) {
      args.active = resolve(argv[i + 1]);
      i += 1;
    } else if (arg === "--storage" && i + 1 < argv.length) {
      args.storage = resolve(argv[i + 1]);
      i += 1;
    }
  }
  return args;
}

function parseStorage(contents) {
  return contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .reduce((acc, line) => {
      const [key, ...rest] = line.split("=");
      if (!key || rest.length === 0) return acc;
      acc[key] = rest.join("=").trim();
      return acc;
    }, {});
}

function collectDifferences(expected, storage) {
  const differences = [];
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

function summariseSignature(signature) {
  return typeof signature === "string" && signature.length > 0
    ? signature.slice(0, 16)
    : null;
}

async function main() {
  const { output, active, storage } = parseArgs(process.argv.slice(2));
  const activeContents = JSON.parse(await readFile(active, "utf8"));
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
    daoSignaturePreview: summariseSignature(activeContents.signatures?.dao ?? ""),
    treasurySignaturePreview: summariseSignature(
      activeContents.signatures?.treasury ?? "",
    ),
    generatedAt: new Date().toISOString(),
  };

  const payload = { ok, verification };

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

const isMain = process.argv[1]
  ? resolve(process.argv[1]) === modulePath
  : false;

if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}
