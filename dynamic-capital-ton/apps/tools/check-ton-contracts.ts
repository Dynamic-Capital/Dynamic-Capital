#!/usr/bin/env -S deno run -A

import {
  computeSha256Hex,
  loadProjectConfig,
  readJettonMetadata,
  resolveProjectRoot,
} from "./_shared.ts";
import {
  join,
} from "https://deno.land/std@0.224.0/path/mod.ts";

interface DnsRecords {
  [key: string]: string;
}

interface AccountStatusRow {
  name: string;
  address: string;
  status: string;
  interfaces: string;
}

interface FetchError {
  name: string;
  address: string;
  reason: string;
}

const COMPARISON_FIELDS = [
  { key: "name", label: "Name" },
  { key: "symbol", label: "Symbol" },
  { key: "decimals", label: "Decimals" },
  { key: "image", label: "Image URL" },
  { key: "address", label: "Jetton Address" },
] as const;

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

async function parseDnsRecords(projectRoot: string): Promise<DnsRecords> {
  const recordsPath = join(projectRoot, "storage", "dns-records.txt");
  const text = await Deno.readTextFile(recordsPath);
  const entries: DnsRecords = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!key || !value) {
      continue;
    }
    entries[key] = value;
  }

  return entries;
}

async function fetchJson<T>(url: string, description: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to fetch ${description} (status ${response.status}): ${body}`,
    );
  }
  return await response.json() as T;
}

interface TonapiJettonResponse {
  verification?: string;
  metadata?: Record<string, unknown>;
}

interface TonapiAccountResponse {
  status?: string;
  interfaces?: string[];
  is_wallet?: boolean;
}

interface MetadataComparison {
  Field: string;
  Local: string;
  Tonapi: string;
  Match: string;
}

async function compareJettonMetadata(projectRoot: string) {
  const config = await loadProjectConfig(projectRoot);
  const jettonAddress = config.token?.address ?? "";

  if (!jettonAddress) {
    throw new Error("Jetton address missing from config.yaml → token.address");
  }

  const metadataInfo = await readJettonMetadata(projectRoot);
  const metadataSha = await computeSha256Hex(metadataInfo.bytes);
  const tonapiData = await fetchJson<TonapiJettonResponse>(
    `https://tonapi.io/v2/jettons/${jettonAddress}`,
    "Tonapi jetton data",
  );
  const remoteMetadata = tonapiData.metadata ?? {};

  const comparisons: MetadataComparison[] = COMPARISON_FIELDS.map(
    ({ key, label }) => {
      const localValue = normalizeValue(metadataInfo.json[key]);
      const remoteValue = normalizeValue(remoteMetadata[key]);
      return {
        Field: label,
        Local: localValue,
        Tonapi: remoteValue,
        Match: localValue === remoteValue ? "✅" : "⚠️",
      };
    },
  );

  const mismatches = comparisons.filter((entry) => entry.Match !== "✅");

  return {
    jettonAddress,
    metadataPath: metadataInfo.path,
    metadataSha,
    comparisons,
    mismatches,
    verification: tonapiData.verification ?? "unknown",
  };
}

function isAddressCandidate(value: string | undefined): value is string {
  if (!value) {
    return false;
  }
  if (value.includes("...")) {
    return false;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return false;
  }
  if (value.startsWith("<") && value.endsWith(">")) {
    return false;
  }
  return true;
}

async function collectAccountStatuses(
  records: DnsRecords,
): Promise<{ rows: AccountStatusRow[]; errors: FetchError[] }> {
  const targets: { key: string; name: string }[] = [
    { key: "treasury_wallet", name: "Treasury wallet" },
    { key: "stonfi_pool", name: "STON.fi pool" },
    { key: "stonfi_jetton_wallet", name: "STON.fi jetton wallet" },
    { key: "dedust_pool", name: "DeDust pool" },
    { key: "dedust_jetton_wallet", name: "DeDust jetton wallet" },
    { key: "wallet_v5r1", name: "DAO wallet (v5R1)" },
  ];

  const rows: AccountStatusRow[] = [];
  const errors: FetchError[] = [];

  for (const target of targets) {
    const address = records[target.key];
    if (!isAddressCandidate(address)) {
      continue;
    }

    try {
      const account = await fetchJson<TonapiAccountResponse>(
        `https://tonapi.io/v2/accounts/${address}`,
        `${target.name} account data`,
      );
      const interfaces = account.interfaces?.join(", ") ?? "(none)";
      rows.push({
        name: target.name,
        address,
        status: account.status ?? "unknown",
        interfaces,
      });
    } catch (error) {
      errors.push({
        name: target.name,
        address,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { rows, errors };
}

async function main() {
  const projectRoot = resolveProjectRoot(import.meta.url);
  const jettonSummary = await compareJettonMetadata(projectRoot);
  const dnsRecords = await parseDnsRecords(projectRoot);
  const { rows: accountRows, errors: accountErrors } =
    await collectAccountStatuses(dnsRecords);

  console.log("Dynamic Capital → TON contract verification summary\n");
  console.log(`Jetton address: ${jettonSummary.jettonAddress}`);
  console.log(`Local metadata path: ${jettonSummary.metadataPath}`);
  console.log(`Local metadata SHA-256: ${jettonSummary.metadataSha}`);
  console.log(
    `Tonviewer page: https://tonviewer.com/jetton/${jettonSummary.jettonAddress}\n`,
  );

  console.log("Metadata comparison:");
  console.table(jettonSummary.comparisons);

  console.log(
    `\nTonapi verification flag: ${jettonSummary.verification ?? "unknown"}`,
  );

  if (accountRows.length > 0) {
    console.log("\nAccount status checks:");
    console.table(accountRows);
  } else {
    console.log("\nAccount status checks: (no DNS targets with addresses)");
  }

  if (accountErrors.length > 0) {
    console.warn("\nEncountered errors while fetching account data:");
    for (const error of accountErrors) {
      console.warn(`- ${error.name} (${error.address}): ${error.reason}`);
    }
  }

  let exitCode = 0;

  if (jettonSummary.mismatches.length > 0) {
    console.warn(
      "\n⚠️ Detected jetton metadata differences. Investigate before resubmission.",
    );
    exitCode = Math.max(exitCode, 2);
  }

  if (
    jettonSummary.verification !== "whitelist" &&
    jettonSummary.verification !== "verified"
  ) {
    console.warn(
      "\n⚠️ Tonviewer/Tonapi still report the jetton as unverified. Follow up on the submitted ticket.",
    );
    exitCode = Math.max(exitCode, 3);
  }

  const inactiveAccounts = accountRows.filter((row) => row.status !== "active");
  if (inactiveAccounts.length > 0) {
    console.warn("\n⚠️ Some accounts are not active:");
    for (const row of inactiveAccounts) {
      console.warn(`- ${row.name} (${row.address}): status ${row.status}`);
    }
    exitCode = Math.max(exitCode, 4);
  }

  if (accountErrors.length > 0) {
    exitCode = Math.max(exitCode, 5);
  }

  Deno.exit(exitCode);
}

if (import.meta.main) {
  await main();
}

