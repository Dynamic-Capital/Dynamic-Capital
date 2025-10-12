import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

import { beginCell } from "@ton/core";

function resolveRepoRoot(currentModuleUrl: string): string {
  const here = dirname(fileURLToPath(currentModuleUrl));
  return resolve(here, "..", "..");
}

async function readJsonFile<T>(path: string): Promise<T> {
  const text = await readFile(path, "utf8");
  return JSON.parse(text) as T;
}

function computeSha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

interface DnsRecordsFile {
  readonly records?: {
    readonly metadata?: string;
  };
}

async function resolveMetadataUri(repoRoot: string): Promise<string> {
  const dnsPath = join(repoRoot, "public", "dns", "active.json");

  try {
    const dns = await readJsonFile<DnsRecordsFile>(dnsPath);
    const metadataUri = dns.records?.metadata?.trim();
    if (metadataUri) {
      validateMetadataUri(metadataUri, dnsPath);
      return metadataUri;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  const fallback = "https://dynamiccapital.ton/jetton-metadata.json";
  validateMetadataUri(fallback, dnsPath);
  return fallback;
}

function validateMetadataUri(uri: string, source: string): void {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Invalid metadata URI resolved from ${source}: ${uri} (${reason})`,
    );
  }

  if (parsed.protocol !== "https:") {
    throw new Error(
      `Metadata URI must use HTTPS. Resolved ${uri} from ${source}.`,
    );
  }

  if (
    !parsed.hostname.endsWith("dynamiccapital.ton") &&
    !parsed.hostname.endsWith("dynamic.capital")
  ) {
    throw new Error(
      `Metadata URI must resolve to dynamiccapital.ton or dynamic.capital. ` +
        `Resolved ${uri} from ${source}.`,
    );
  }
}

async function writeSummary(
  path: string,
  summary: Record<string, unknown>,
): Promise<void> {
  const text = `${JSON.stringify(summary, null, 2)}\n`;
  await writeFile(path, text, "utf8");
}

async function main() {
  const repoRoot = resolveRepoRoot(import.meta.url);
  const projectRoot = join(repoRoot, "dynamic-capital-ton");
  const metadataPath = join(
    projectRoot,
    "contracts",
    "jetton",
    "metadata.json",
  );
  const metadataBytes = await readFile(metadataPath);
  const metadataText = metadataBytes.toString("utf8");
  const metadata = JSON.parse(metadataText) as Record<string, unknown>;

  const metadataUri = await resolveMetadataUri(repoRoot);

  const metadataSha256 = computeSha256Hex(metadataBytes);

  const contentCell = beginCell()
    .storeUint(0, 8)
    .storeRef(beginCell().storeStringRefTail(metadataUri).endCell())
    .endCell();

  const boc = Buffer.from(contentCell.toBoc({ idx: false }));
  const bocPath = join(
    projectRoot,
    "contracts",
    "jetton",
    "metadata-content.boc",
  );
  await writeFile(bocPath, boc);

  const summaryPath = join(
    projectRoot,
    "contracts",
    "jetton",
    "metadata-content.json",
  );
  const summary = {
    metadataUri,
    metadataSha256,
    cellHash: contentCell.hash().toString("hex"),
    bocBase64: boc.toString("base64"),
    metadataPreview: {
      name: metadata.name,
      symbol: metadata.symbol,
      decimals: metadata.decimals,
      sameAsCount: Array.isArray(metadata.sameAs)
        ? metadata.sameAs.length
        : undefined,
    },
    generatedAt: new Date().toISOString(),
  } satisfies Record<string, unknown>;
  await writeSummary(summaryPath, summary);

  console.log("Jetton metadata content cell regenerated.\n");
  console.log(`  Metadata URI: ${metadataUri}`);
  console.log(`  Metadata SHA-256: ${metadataSha256}`);
  console.log(`  Cell hash: ${summary.cellHash}`);
  console.log(`  BOC written to: ${bocPath} (gitignored)`);
  console.log(`  Summary written to: ${summaryPath}`);
}

await main();
