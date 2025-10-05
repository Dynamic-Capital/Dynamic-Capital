#!/usr/bin/env tsx
import { Address } from "@ton/core";

import {
  TON_MAINNET_ACCOUNT_DEFINITIONS,
  type TonMainnetAccountDefinition,
} from "../../shared/ton/mainnet-addresses";

const DEFAULT_TONCENTER_BASE = "https://toncenter.com/api/v2";
const DEFAULT_TIMEOUT_MS = 8_000;
const NANOTON_IN_TON = 1_000_000_000n;

interface CliOptions {
  toncenterBase: string;
  timeoutMs: number;
  json: boolean;
  showHelp: boolean;
  apiKey?: string;
  accountSpecs: string[];
}

interface ToncenterAccountState {
  balanceNanoton?: string;
  balanceTon?: string;
  balanceDisplay?: string;
  state?: string;
  lastPaid?: string;
  rawResponse?: unknown;
  ok: boolean;
  error?: string;
  url: string;
}

interface ProbeSummary {
  timestamp: string;
  toncenterBase: string;
  timeoutMs: number;
  accounts: Array<
    & TonMainnetAccountDefinition
    & ToncenterAccountState
    & { rawAddress: string }
  >;
  ok: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  let toncenterBase = DEFAULT_TONCENTER_BASE;
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let json = false;
  let showHelp = false;
  const apiKeyFromEnv = process.env.TONCENTER_API_KEY ??
    process.env.TONCENTER_MAINNET_API_KEY;
  let apiKey = apiKeyFromEnv ?? undefined;
  const accountSpecs: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;

    if (token === "--help" || token === "-h") {
      showHelp = true;
      break;
    }

    if (token === "--json") {
      json = true;
      continue;
    }

    if (token === "--toncenter-base" || token === "--toncenter") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --toncenter-base");
      }
      toncenterBase = value;
      index += 1;
      continue;
    }

    if (token === "--timeout" || token === "--timeout-ms") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --timeout");
      }
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Invalid timeout value: ${value}`);
      }
      timeoutMs = parsed;
      index += 1;
      continue;
    }

    if (token === "--api-key") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --api-key");
      }
      apiKey = value.trim();
      index += 1;
      continue;
    }

    if (token === "--account" || token === "--address") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --account");
      }
      accountSpecs.push(value.trim());
      index += 1;
      continue;
    }

    throw new Error(`Unrecognised argument: ${token}`);
  }

  return { toncenterBase, timeoutMs, json, showHelp, apiKey, accountSpecs };
}

function printHelp() {
  console.log(`Usage: ton:mainnet-status [options]

Checks the on-chain status of Dynamic Capital's primary TON mainnet addresses.

Options:
  --toncenter-base <url>  Override the toncenter API base (default: ${DEFAULT_TONCENTER_BASE})
  --timeout <ms>          Request timeout per probe (default: ${DEFAULT_TIMEOUT_MS}ms)
  --api-key <key>         Provide a toncenter API key (defaults to TONCENTER_API_KEY env)
  --account <spec>        Additional account in label=address format (repeatable)
  --json                  Emit JSON instead of human-readable output
  --help                  Show this message`);
}

function normaliseBaseUrl(base: string): string {
  const trimmed = base.trim();
  if (!trimmed) return DEFAULT_TONCENTER_BASE;
  try {
    const url = new URL(trimmed);
    return url.toString().replace(/\/?$/, "");
  } catch {
    return DEFAULT_TONCENTER_BASE;
  }
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function slugifyKey(label: string, fallbackIndex: number): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `custom-${fallbackIndex}`;
}

function parseAccountSpec(
  spec: string,
  index: number,
): TonMainnetAccountDefinition {
  const trimmed = spec.trim();
  if (!trimmed) {
    throw new Error("Account specification cannot be empty");
  }

  const separatorIndex = trimmed.indexOf("=");
  let label = `Custom account ${index}`;
  let addressValue = trimmed;

  if (separatorIndex > -1) {
    label = trimmed.slice(0, separatorIndex).trim() || label;
    addressValue = trimmed.slice(separatorIndex + 1).trim();
  }

  if (!addressValue) {
    throw new Error(`Missing address for account specification: ${spec}`);
  }

  let friendlyAddress: string;
  try {
    const parsed = Address.parse(addressValue);
    friendlyAddress = parsed.toString({ urlSafe: true, bounceable: true });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Invalid TON address format";
    throw new Error(`Unable to parse address for ${label}: ${message}`);
  }

  return {
    key: slugifyKey(label, index),
    label,
    friendlyAddress,
  };
}

function buildAccountList(
  accountSpecs: string[],
): TonMainnetAccountDefinition[] {
  const accounts = [...TON_MAINNET_ACCOUNT_DEFINITIONS];

  accountSpecs.forEach((spec, offset) => {
    const index = offset + 1;
    const account = parseAccountSpec(spec, index);
    accounts.push(account);
  });

  return accounts;
}

function formatNanoton(balance: string): {
  balanceTon: string;
  balanceDisplay: string;
} | null {
  try {
    const value = BigInt(balance);
    const tons = value / NANOTON_IN_TON;
    const remainder = value % NANOTON_IN_TON;
    const remainderString = remainder.toString().padStart(9, "0");
    const trimmedRemainder = remainderString.replace(/0+$/, "");
    const tonString = trimmedRemainder
      ? `${tons.toString()}.${trimmedRemainder}`
      : tons.toString();
    const displayRemainder = trimmedRemainder ? `.${trimmedRemainder}` : "";
    const display = `${tons.toLocaleString("en-US")}${displayRemainder} TON`;
    return {
      balanceTon: tonString,
      balanceDisplay: display,
    };
  } catch {
    return null;
  }
}

function buildToncenterUrl(
  base: string,
  method: string,
  query: Record<string, string>,
): URL {
  const url = new URL(method, ensureTrailingSlash(base));
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url;
}

async function fetchWithTimeout(
  url: URL,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseTimestamp(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString();
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return new Date(parsed * 1000).toISOString();
    }
  }
  return undefined;
}

async function probeAccount(
  account: TonMainnetAccountDefinition,
  options: { base: string; timeoutMs: number; apiKey?: string },
): Promise<ToncenterAccountState & { rawAddress: string }> {
  let rawAddress: string;
  try {
    rawAddress = Address.parse(account.friendlyAddress).toRawString();
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Invalid TON address format";
    return {
      rawAddress: account.friendlyAddress,
      ok: false,
      error: `Failed to parse friendly address: ${message}`,
      url: "",
    };
  }

  const query: Record<string, string> = { address: rawAddress };
  if (options.apiKey) {
    query.api_key = options.apiKey;
  }

  const url = buildToncenterUrl(options.base, "getAddressInformation", query);
  let response: Response;
  let rawBody = "";

  try {
    response = await fetchWithTimeout(url, options.timeoutMs);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Unknown network error";
    return {
      rawAddress,
      ok: false,
      error: `Network error: ${message}`,
      url: url.toString(),
    };
  }

  try {
    rawBody = await response.text();
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Failed to read response body";
    return {
      rawAddress,
      ok: false,
      error: message,
      url: url.toString(),
    };
  }

  if (!response.ok) {
    const preview = rawBody.slice(0, 200);
    const statusText = response.statusText || "Unexpected response";
    return {
      rawAddress,
      ok: false,
      error: `HTTP ${response.status} ${statusText}${
        preview ? `: ${preview}` : ""
      }`,
      url: url.toString(),
    };
  }

  let payload: unknown;
  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Invalid JSON payload";
    return {
      rawAddress,
      ok: false,
      error: `Failed to parse JSON: ${message}`,
      url: url.toString(),
    };
  }

  if (!payload || typeof payload !== "object") {
    return {
      rawAddress,
      ok: false,
      error: "Toncenter returned an unexpected payload shape",
      rawResponse: payload,
      url: url.toString(),
    };
  }

  const okField = (payload as { ok?: boolean }).ok;
  if (okField === false) {
    const errorMessage = (payload as { error?: string }).error;
    return {
      rawAddress,
      ok: false,
      error: errorMessage ?? "Toncenter reported an error",
      rawResponse: payload,
      url: url.toString(),
    };
  }

  const result = (payload as { result?: Record<string, unknown> }).result ?? {};
  const state = typeof result.state === "string" ? result.state : undefined;
  const balanceRaw = (() => {
    const value = result.balance;
    if (typeof value === "string") return value;
    if (typeof value === "number") return value.toString();
    return undefined;
  })();
  const lastPaid = parseTimestamp(result.last_paid);

  let balanceNanoton: string | undefined;
  let balanceTon: string | undefined;
  let balanceDisplay: string | undefined;

  if (balanceRaw) {
    const formatted = formatNanoton(balanceRaw);
    balanceNanoton = balanceRaw;
    if (formatted) {
      balanceTon = formatted.balanceTon;
      balanceDisplay = formatted.balanceDisplay;
    }
  }

  return {
    rawAddress,
    ok: true,
    state,
    balanceNanoton,
    balanceTon,
    balanceDisplay,
    lastPaid,
    rawResponse: result,
    url: url.toString(),
  };
}

async function main() {
  let options: CliOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    printHelp();
    process.exitCode = 1;
    return;
  }

  if (options.showHelp) {
    printHelp();
    return;
  }

  const toncenterBase = normaliseBaseUrl(options.toncenterBase);
  const accounts = buildAccountList(options.accountSpecs);

  if (!options.json) {
    console.log(
      `Checking TON mainnet status via ${toncenterBase} (timeout=${options.timeoutMs}ms)...`,
    );
  }

  const results = await Promise.all(
    accounts.map((account) =>
      probeAccount(account, {
        base: toncenterBase,
        timeoutMs: options.timeoutMs,
        apiKey: options.apiKey,
      })
    ),
  );

  const summaries: ProbeSummary["accounts"] = accounts.map((
    account,
    index,
  ) => ({
    ...account,
    ...results[index],
  }));

  const ok = summaries.every((summary) => summary.ok);
  const summary: ProbeSummary = {
    timestamp: new Date().toISOString(),
    toncenterBase,
    timeoutMs: options.timeoutMs,
    accounts: summaries,
    ok,
  };

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    for (const account of summaries) {
      console.log(`\n${account.label}`);
      console.log(`  Friendly: ${account.friendlyAddress}`);
      console.log(`  Raw:      ${account.rawAddress}`);
      console.log(`  Endpoint: ${account.url || "n/a"}`);
      if (account.description) {
        console.log(`  Note:     ${account.description}`);
      }
      if (account.ok) {
        console.log(`  State:    ${account.state ?? "unknown"}`);
        if (account.balanceDisplay) {
          console.log(
            `  Balance:  ${account.balanceDisplay} (${account.balanceNanoton} nanoton)`,
          );
        } else if (account.balanceNanoton) {
          console.log(`  Balance:  ${account.balanceNanoton} nanoton`);
        } else {
          console.log("  Balance:  unavailable");
        }
        if (account.lastPaid) {
          console.log(`  Last paid: ${account.lastPaid}`);
        }
      } else {
        console.log(`  Error:    ${account.error ?? "Unknown error"}`);
      }
    }

    console.log(
      `\nOverall status: ${
        ok ? "✅ All probes succeeded" : "⚠️ Issues detected"
      }`,
    );
  }

  if (!ok) {
    process.exitCode = 1;
  }
}

await main();
