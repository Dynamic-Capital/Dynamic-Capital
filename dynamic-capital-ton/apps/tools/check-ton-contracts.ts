#!/usr/bin/env -S deno run -A

import {
  computeSha256Hex,
  loadProjectConfig,
  readJettonMetadata,
  resolveProjectRoot,
} from "./_shared.ts";
import { Address, Cell } from "npm:@ton/core";
import {
  join,
} from "https://deno.land/std@0.224.0/path/mod.ts";

const DEFAULT_TIMEOUT_MS = 15_000;

const TON_DOMAIN_SUFFIX = ".ton";

interface HttpTarget {
  key: string;
  name: string;
  fallbackKey?: string;
}

interface DnsRecords {
  [key: string]: string;
}

interface AccountStatusRow {
  name: string;
  address: string;
  rawAddress?: string;
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

function normalizeFriendlyAddress(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  try {
    return Address.parse(value).toString();
  } catch (_error) {
    return undefined;
  }
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

async function fetchJson<T>(
  url: string,
  description: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Timed out while fetching ${description} (${url})`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to fetch ${description} (status ${response.status}): ${body}`,
    );
  }
  try {
    return await response.json() as T;
  } catch (error) {
    const body = await response.text();
    throw new Error(
      `Failed to parse ${description} response as JSON: ${error instanceof Error ? error.message : String(error)}. Body: ${body}`,
    );
  }
}

interface TonapiJettonResponse {
  verification?: string;
  metadata?: Record<string, unknown>;
}

interface TonapiAccountResponse {
  address?: string;
  status?: string;
  interfaces?: string[];
  is_wallet?: boolean;
}

interface TonapiStatusResponse {
  rest_online?: boolean;
  indexing_latency?: number;
  last_known_masterchain_seqno?: number;
}

interface TonapiJettonHolderResponse {
  addresses?: Array<{
    address?: string;
    owner?: {
      address?: string;
    };
  }>;
  total?: number;
}

interface HttpCheckRow {
  Name: string;
  URL: string;
  Status: string;
  Healthy: string;
  "Content-Type": string;
  Note: string;
}

interface HttpCheckResult {
  rows: HttpCheckRow[];
  errors: FetchError[];
}

interface ToncenterRunGetMethodResponse {
  ok: boolean;
  result?: {
    stack?: unknown[];
  };
  error?: string;
  code?: number;
}

interface JettonWalletData {
  owner?: string;
  master?: string;
}

interface WalletOwnershipRow {
  wallet: string;
  walletAddress: string;
  ownerExpected?: string;
  ownerActual?: string;
  masterExpected?: string;
  masterActual?: string;
  ownerMatches: boolean | undefined;
  masterMatches: boolean | undefined;
}

interface WalletOwnershipResult {
  rows: WalletOwnershipRow[];
  errors: FetchError[];
}

interface WalletAdvisory {
  name: string;
  address: string;
  message: string;
  severity: "info" | "action";
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

function normalizeUrl(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

function isHttpUrl(value: string | undefined): value is string {
  if (!value) {
    return false;
  }
  const normalized = normalizeUrl(value);
  return normalized.startsWith("http://") || normalized.startsWith("https://");
}

function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0
    ? 0
    : 4 - (normalized.length % 4);
  const padded = normalized + "=".repeat(padding);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function friendlyToRawAddress(address: string | undefined): string | undefined {
  if (!address) {
    return undefined;
  }
  if (address.includes(":")) {
    return address;
  }
  try {
    const bytes = base64ToBytes(address);
    if (bytes.length !== 36) {
      return undefined;
    }
    const workchainByte = bytes[1];
    const workchain = workchainByte > 127 ? workchainByte - 256 : workchainByte;
    const hash = Array.from(bytes.slice(2, 34))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    return `${workchain}:${hash}`;
  } catch (_error) {
    return undefined;
  }
}

async function httpProbe(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { Accept: "*/*" },
      });
    }
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Request timed out (${url})`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isTonDomain(url: URL): boolean {
  return url.hostname.toLowerCase().endsWith(TON_DOMAIN_SUFFIX);
}

function buildTonFallbackUrl(primary: URL, fallbackRaw?: string): string | undefined {
  if (fallbackRaw && isHttpUrl(fallbackRaw)) {
    return normalizeUrl(fallbackRaw);
  }
  if (isTonDomain(primary)) {
    const host = primary.hostname;
    const scheme = primary.protocol === "https:" ? "https" : "http";
    const replacementHost = host === "dynamiccapital.ton"
      ? "dynamic.capital"
      : host.endsWith(".dynamiccapital.ton")
      ? `${host.replace(/\.dynamiccapital\.ton$/, ".dynamic.capital")}`
      : "";
    if (replacementHost) {
      const path = primary.pathname.startsWith("/")
        ? primary.pathname
        : `/${primary.pathname}`;
      return `${scheme}://${replacementHost}${path}${primary.search}${primary.hash}`;
    }
  }
  return undefined;
}

async function checkHttpEndpoints(records: DnsRecords): Promise<HttpCheckResult> {
  const targets: HttpTarget[] = [
    { key: "metadata", name: "Jetton metadata", fallbackKey: "metadata_fallback" },
    { key: "manifest", name: "TON Connect manifest", fallbackKey: "manifest_fallback" },
    { key: "api", name: "Dynamic Capital API", fallbackKey: "api_fallback" },
    { key: "docs", name: "Docs portal", fallbackKey: "docs_fallback" },
  ];

  const rows: HttpCheckRow[] = [];
  const errors: FetchError[] = [];

  for (const target of targets) {
    const rawUrl = records[target.key];
    if (!isHttpUrl(rawUrl)) {
      continue;
    }
    const url = normalizeUrl(rawUrl);
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch (urlError) {
      const reason = urlError instanceof Error ? urlError.message : String(urlError);
      errors.push({
        name: target.name,
        address: url,
        reason: `invalid URL: ${reason}`,
      });
      rows.push({
        Name: target.name,
        URL: url,
        Status: "invalid URL",
        Healthy: "⚠️",
        "Content-Type": "(unknown)",
        Note: reason,
      });
      continue;
    }
    const noteParts: string[] = [];

    let response: Response | null = null;
    let statusSummary = "unreachable";
    let healthy = false;
    let contentType = "(unknown)";

    try {
      response = await httpProbe(url);
      statusSummary = `${response.status} ${response.statusText}`;
      healthy = response.ok;
      contentType = response.headers.get("content-type") ?? contentType;
      if (response.url && response.url !== url) {
        noteParts.push(`redirected → ${response.url}`);
      }
    } catch (error) {
      noteParts.push(
        `fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    let usedFallback = false;
    const fallbackRaw = target.fallbackKey ? records[target.fallbackKey] : undefined;
    const fallbackUrl = buildTonFallbackUrl(urlObj, fallbackRaw);

    if (!healthy && fallbackUrl) {
      try {
        const fallbackResponse = await httpProbe(fallbackUrl);
        noteParts.push(
          `${response ? `primary ${statusSummary}; ` : ""}fallback → ${fallbackUrl} (${fallbackResponse.status} ${fallbackResponse.statusText})`,
        );
        if (fallbackResponse.ok) {
          healthy = true;
          usedFallback = true;
          statusSummary = `${fallbackResponse.status} ${fallbackResponse.statusText}`;
          contentType = fallbackResponse.headers.get("content-type") ?? contentType;
        } else if (!response) {
          statusSummary = `${fallbackResponse.status} ${fallbackResponse.statusText}`;
        }
      } catch (fallbackError) {
        noteParts.push(
          `fallback failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
      }
    }

    if (!healthy) {
      errors.push({
        name: target.name,
        address: url,
        reason: noteParts.join("; ") || statusSummary,
      });
    }

    rows.push({
      Name: target.name,
      URL: url,
      Status: usedFallback ? `${statusSummary} (fallback)` : statusSummary,
      Healthy: healthy ? "✅" : "⚠️",
      "Content-Type": contentType,
      Note: noteParts.join("; "),
    });
  }

  return { rows, errors };
}

async function fetchTonapiStatus(): Promise<TonapiStatusResponse> {
  return await fetchJson<TonapiStatusResponse>(
    "https://tonapi.io/v2/status",
    "Tonapi service status",
  );
}

async function fetchJettonHolders(
  jettonAddress: string,
): Promise<Set<string>> {
  const seen = new Set<string>();
  const limit = 256;
  let offset = 0;

  while (true) {
    const data = await fetchJson<TonapiJettonHolderResponse>(
      `https://tonapi.io/v2/jettons/${jettonAddress}/holders?limit=${limit}&offset=${offset}`,
      "Tonapi jetton holder list",
    );
    const addresses = data.addresses ?? [];
    if (addresses.length === 0) {
      break;
    }
    for (const entry of addresses) {
      const ownerAddress = entry.owner?.address ?? entry.address;
      if (ownerAddress) {
        seen.add(ownerAddress);
      }
    }
    offset += addresses.length;
    if (data.total !== undefined && offset >= data.total) {
      break;
    }
  }

  return seen;
}

async function fetchJettonWalletData(
  walletAddress: string,
): Promise<JettonWalletData> {
  const response = await fetch("https://toncenter.com/api/v2/runGetMethod", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      address: walletAddress,
      method: "get_wallet_data",
      stack: [],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Toncenter get_wallet_data failed (status ${response.status}): ${body}`,
    );
  }

  const payload = await response.json() as ToncenterRunGetMethodResponse;
  if (!payload.ok) {
    throw new Error(
      payload.error ? `Toncenter error: ${payload.error}` :
        `Toncenter error code ${payload.code ?? "unknown"}`,
    );
  }

  const stack = payload.result?.stack;
  if (!Array.isArray(stack) || stack.length < 3) {
    throw new Error("Toncenter stack response missing wallet data entries");
  }

  const ownerEntry = stack[1];
  const masterEntry = stack[2];

  const ownerCellB64 =
    Array.isArray(ownerEntry) && ownerEntry[1] &&
      typeof (ownerEntry[1] as { bytes?: unknown }).bytes === "string"
      ? (ownerEntry[1] as { bytes: string }).bytes
      : undefined;
  const masterCellB64 =
    Array.isArray(masterEntry) && masterEntry[1] &&
      typeof (masterEntry[1] as { bytes?: unknown }).bytes === "string"
      ? (masterEntry[1] as { bytes: string }).bytes
      : undefined;

  const owner = ownerCellB64
    ? Cell.fromBase64(ownerCellB64).beginParse().loadAddress()?.toString()
    : undefined;
  const master = masterCellB64
    ? Cell.fromBase64(masterCellB64).beginParse().loadAddress()?.toString()
    : undefined;

  return { balance: BigInt(0), owner, master };
}

async function verifyWalletOwnership(
  records: DnsRecords,
  jettonMaster: string,
): Promise<WalletOwnershipResult> {
  const checks: {
    walletKey: keyof DnsRecords;
    ownerKey: keyof DnsRecords;
    walletName: string;
    ownerName: string;
  }[] = [
    {
      walletKey: "stonfi_jetton_wallet",
      ownerKey: "stonfi_pool",
      walletName: "STON.fi jetton wallet",
      ownerName: "STON.fi router",
    },
    {
      walletKey: "dedust_jetton_wallet",
      ownerKey: "dedust_pool",
      walletName: "DeDust jetton wallet",
      ownerName: "DeDust vault",
    },
  ];

  const rows: WalletOwnershipRow[] = [];
  const errors: FetchError[] = [];
  const expectedMaster = normalizeFriendlyAddress(jettonMaster);

  for (const check of checks) {
    const walletAddressRaw = records[check.walletKey];
    if (!isAddressCandidate(walletAddressRaw)) {
      continue;
    }

    const ownerExpected = normalizeFriendlyAddress(
      typeof records[check.ownerKey] === "string"
        ? records[check.ownerKey]
        : undefined,
    );

    try {
      const data = await fetchJettonWalletData(walletAddressRaw);
      const ownerActual = normalizeFriendlyAddress(data.owner);
      const masterActual = normalizeFriendlyAddress(data.master);
      const ownerMatches = ownerExpected && ownerActual
        ? ownerExpected === ownerActual
        : undefined;
      const masterMatches = expectedMaster && masterActual
        ? expectedMaster === masterActual
        : undefined;
      rows.push({
        wallet: check.walletName,
        walletAddress: walletAddressRaw,
        ownerExpected,
        ownerActual,
        masterExpected: expectedMaster,
        masterActual,
        ownerMatches,
        masterMatches,
      });
    } catch (error) {
      errors.push({
        name: check.walletName,
        address: walletAddressRaw,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { rows, errors };
}

interface StonAssetResponse {
  asset?: {
    tags?: string[];
  };
}

async function fetchStonAssetTags(
  records: DnsRecords,
): Promise<string[] | undefined> {
  const jettonMaster = records["jetton_master"];
  if (!jettonMaster || !jettonMaster.startsWith("EQ")) {
    return undefined;
  }
  try {
    const asset = await fetchJson<StonAssetResponse>(
      `https://api.ston.fi/v1/assets/${jettonMaster}`,
      "STON.fi asset metadata",
    );
    return asset.asset?.tags;
  } catch (_error) {
    return undefined;
  }
}

async function buildWalletAdvisories(
  jettonAddress: string,
  records: DnsRecords,
  rows: AccountStatusRow[],
): Promise<WalletAdvisory[]> {
  const inactiveRows = rows.filter((row) => row.status === "nonexist");
  if (inactiveRows.length === 0) {
    return [];
  }

  const holderSet = await fetchJettonHolders(jettonAddress);
  const stonTags = await fetchStonAssetTags(records);
  const advisories: WalletAdvisory[] = [];

  for (const row of inactiveRows) {
    const rawAddress = row.rawAddress ?? friendlyToRawAddress(row.address);
    const holderKnown = rawAddress ? holderSet.has(rawAddress) : false;
    let message =
      "Tonapi reports this jetton wallet contract is not deployed yet.";

    if (!holderKnown) {
      message +=
        " Deploy a minimal DCT transfer from the jetton minter to this address or add liquidity so the wallet initializes before onboarding.";
    }

    if (row.name.toLowerCase().includes("ston.fi") && stonTags?.includes("no_liquidity")) {
      message +=
        " STON.fi currently flags the asset with `no_liquidity`; seed the pool to clear the warning.";
    }

    advisories.push({
      name: row.name,
      address: row.address,
      message,
      severity: holderKnown ? "info" : "action",
    });
  }

  return advisories;
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
        rawAddress: account.address,
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
  const tonapiStatus = await fetchTonapiStatus();
  const { rows: accountRows, errors: accountErrors } =
    await collectAccountStatuses(dnsRecords);
  const httpChecks = await checkHttpEndpoints(dnsRecords);
  const walletAdvisories = await buildWalletAdvisories(
    jettonSummary.jettonAddress,
    dnsRecords,
    accountRows,
  );
  const walletOwnership = await verifyWalletOwnership(
    dnsRecords,
    jettonSummary.jettonAddress,
  );

  for (const row of walletOwnership.rows) {
    if (row.ownerMatches === false) {
      walletAdvisories.push({
        name: row.wallet,
        address: row.walletAddress,
        severity: "action",
        message: row.ownerExpected
          ? `DNS owner ${row.ownerExpected} does not match Toncenter response ${row.ownerActual ?? "(unknown)"}. Update the resolver or rotate the wallet before onboarding.`
          : `DNS is missing the ${row.wallet} owner reference; Toncenter reports ${row.ownerActual ?? "(unknown)"}. Populate storage/dns-records.txt and push the resolver update.`,
      });
    } else if (row.masterMatches === false) {
      walletAdvisories.push({
        name: row.wallet,
        address: row.walletAddress,
        severity: "action",
        message:
          `Toncenter reports master ${row.masterActual ?? "(unknown)"}; ensure the wallet is derived from ${jettonSummary.jettonAddress} before onboarding.`,
      });
    }
  }

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

  if (tonapiStatus.rest_online !== undefined) {
    const statusEmoji = tonapiStatus.rest_online ? "✅" : "⚠️";
    console.log(
      `Tonapi REST gateway: ${statusEmoji} (latency ${tonapiStatus.indexing_latency ?? "?"}s, masterchain seqno ${tonapiStatus.last_known_masterchain_seqno ?? "?"})`,
    );
  }

  if (accountRows.length > 0) {
    console.log("\nAccount status checks:");
    console.table(
      accountRows.map(({ name, address, status, interfaces }) => ({
        name,
        address,
        status,
        interfaces,
      })),
    );
  } else {
    console.log("\nAccount status checks: (no DNS targets with addresses)");
  }

  if (accountErrors.length > 0) {
    console.warn("\nEncountered errors while fetching account data:");
    for (const error of accountErrors) {
      console.warn(`- ${error.name} (${error.address}): ${error.reason}`);
    }
  }

  if (httpChecks.rows.length > 0) {
    console.log("\nDomain endpoint checks:");
    console.table(httpChecks.rows);
  }

  if (httpChecks.errors.length > 0) {
    console.warn("\nEncountered errors while probing HTTP endpoints:");
    for (const error of httpChecks.errors) {
      console.warn(`- ${error.name} (${error.address}): ${error.reason}`);
    }
  }

  if (walletAdvisories.length > 0) {
    console.warn("\nJetton wallet remediation guidance:");
    for (const advisory of walletAdvisories) {
      const prefix = advisory.severity === "action" ? "- [ACTION]" : "- [INFO]";
      console.warn(`${prefix} ${advisory.name} (${advisory.address}): ${advisory.message}`);
    }
  }

  if (walletOwnership.rows.length > 0) {
    console.log("\nJetton wallet ownership checks:");
    console.table(
      walletOwnership.rows.map((row) => ({
        Wallet: row.wallet,
        Address: row.walletAddress,
        "Owner (Toncenter)": row.ownerActual ?? "(unknown)",
        "Owner (DNS expected)": row.ownerExpected ?? "(missing)",
        "Master (Toncenter)": row.masterActual ?? "(unknown)",
        "Owner matches": row.ownerMatches === undefined
          ? "(n/a)"
          : row.ownerMatches
          ? "✅"
          : "⚠️",
        "Master matches": row.masterMatches === undefined
          ? "(n/a)"
          : row.masterMatches
          ? "✅"
          : "⚠️",
      })),
    );
  }

  if (walletOwnership.errors.length > 0) {
    console.warn("\nEncountered errors while verifying wallet ownership:");
    for (const error of walletOwnership.errors) {
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

  const httpFailures = httpChecks.rows.filter((row) => row.Healthy !== "✅");
  if (httpFailures.length > 0 || httpChecks.errors.length > 0) {
    exitCode = Math.max(exitCode, 6);
  }

  if (tonapiStatus.rest_online === false) {
    exitCode = Math.max(exitCode, 7);
  }

  const ownershipMismatches = walletOwnership.rows.filter((row) =>
    row.ownerMatches === false || row.masterMatches === false
  );
  if (ownershipMismatches.length > 0) {
    console.warn("\n⚠️ Jetton wallet ownership does not match DNS expectations:");
    for (const row of ownershipMismatches) {
      const parts: string[] = [];
      if (row.ownerMatches === false) {
        parts.push(
          `expected owner ${row.ownerExpected ?? "(missing)"}, got ${row.ownerActual ?? "(unknown)"}`,
        );
      }
      if (row.masterMatches === false) {
        parts.push(
          `expected master ${row.masterExpected ?? "(missing)"}, got ${row.masterActual ?? "(unknown)"}`,
        );
      }
      console.warn(`- ${row.wallet} (${row.walletAddress}): ${parts.join("; ")}`);
    }
    exitCode = Math.max(exitCode, 8);
  }

  if (walletOwnership.errors.length > 0) {
    exitCode = Math.max(exitCode, 5);
  }

  Deno.exit(exitCode);
}

if (import.meta.main) {
  await main();
}

