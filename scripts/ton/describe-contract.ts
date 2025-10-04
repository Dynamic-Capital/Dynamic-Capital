#!/usr/bin/env node

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const HELP_MESSAGE =
  `Usage: npx tsx scripts/ton/describe-contract.ts <address>\n\n` +
  "Fetches account metadata from tonapi.io and prints a concise summary.\n" +
  "The address may include an optional ton:// prefix.";

const TON_API_BASE = "https://tonapi.io/v2";

interface TonAccountResponse {
  address?: string;
  balance?: number;
  last_activity?: number;
  status?: string;
  interfaces?: string[];
  get_methods?: string[];
  is_wallet?: boolean;
}

interface AccountSummary {
  address: string;
  balanceTons?: string;
  rawBalance?: number;
  lastActivityIso?: string;
  status?: string;
  interfaces: string[];
  getMethods: string[];
  isWallet?: boolean;
}

function normaliseAddress(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Address must not be empty");
  }
  return trimmed.replace(/^ton:\/\//i, "");
}

async function requestAccount(address: string): Promise<TonAccountResponse> {
  const endpoint = `${TON_API_BASE}/accounts/${encodeURIComponent(address)}`;
  const args = [
    "-sS",
    "-H",
    "Accept: application/json",
    "-H",
    "User-Agent: dynamic-capital-ton-account-query/1.0",
    "-w",
    "\n%{http_code}",
    endpoint,
  ];

  let stdout: string;
  try {
    ({ stdout } = await execFileAsync("curl", args));
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr?.trim();
    const suffix = stderr ? `: ${stderr}` : "";
    throw new Error(`curl request to tonapi.io failed${suffix}`);
  }
  const trimmed = stdout.trimEnd();
  const lines = trimmed.split("\n");
  const statusText = lines.pop() ?? "";
  const status = Number.parseInt(statusText, 10);
  if (!Number.isFinite(status)) {
    throw new Error(`Unexpected response from curl (status: ${statusText})`);
  }
  const body = lines.join("\n");
  if (status < 200 || status >= 300) {
    let message = body.trim() || `HTTP ${status}`;
    try {
      const payload = JSON.parse(body) as { error?: string };
      message = payload.error || message;
    } catch (error) {
      if (error instanceof Error) {
        message = `${message} (parse error: ${error.message})`;
      }
    }
    throw new Error(message);
  }

  try {
    return JSON.parse(body) as TonAccountResponse;
  } catch (error) {
    throw new Error(
      `Unable to parse tonapi.io response: ${(error as Error).message}`,
    );
  }
}

function formatBalance(value?: number): { raw?: number; tons?: string } {
  if (typeof value !== "number") {
    return {};
  }
  if (!Number.isFinite(value)) {
    return { raw: value };
  }
  const tons = value / 1_000_000_000;
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 9,
  });
  return { raw: value, tons: formatter.format(tons) };
}

function formatTimestamp(epoch?: number): string | undefined {
  if (typeof epoch !== "number" || !Number.isFinite(epoch)) {
    return undefined;
  }
  const millis = epoch * 1000;
  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
}

function dedupeStrings(values: readonly (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const normalised = value.trim();
    if (!normalised) continue;
    const key = normalised.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalised);
  }
  return result;
}

function buildSummary(
  payload: TonAccountResponse,
  address: string,
): AccountSummary {
  const interfaces = Array.isArray(payload.interfaces)
    ? dedupeStrings(payload.interfaces)
    : [];
  const getMethods = Array.isArray(payload.get_methods)
    ? dedupeStrings(payload.get_methods)
    : [];
  const balance = formatBalance(payload.balance);
  return {
    address,
    balanceTons: balance.tons,
    rawBalance: balance.raw,
    lastActivityIso: formatTimestamp(payload.last_activity),
    status: payload.status?.trim() || undefined,
    interfaces,
    getMethods,
    isWallet: typeof payload.is_wallet === "boolean"
      ? payload.is_wallet
      : undefined,
  };
}

function printSummary(summary: AccountSummary): void {
  console.log(`Address: ${summary.address}`);
  if (summary.status) {
    console.log(`Status: ${summary.status}`);
  }
  if (summary.balanceTons) {
    console.log(`Balance: ${summary.balanceTons} TON`);
  } else if (typeof summary.rawBalance === "number") {
    console.log(`Balance (raw nanotons): ${summary.rawBalance}`);
  }
  if (summary.lastActivityIso) {
    console.log(`Last activity: ${summary.lastActivityIso}`);
  }
  if (summary.interfaces.length > 0) {
    console.log(`Interfaces: ${summary.interfaces.join(", ")}`);
  }
  if (summary.getMethods.length > 0) {
    console.log(`Get methods: ${summary.getMethods.join(", ")}`);
  }
  if (typeof summary.isWallet === "boolean") {
    console.log(`Is wallet: ${summary.isWallet ? "yes" : "no"}`);
  }
}

async function main(): Promise<void> {
  const [, , rawAddress, ...rest] = process.argv;
  if (!rawAddress || rawAddress === "--help" || rest.includes("--help")) {
    console.error(HELP_MESSAGE);
    process.exit(1);
  }

  try {
    const address = normaliseAddress(rawAddress);
    const payload = await requestAccount(address);
    const summary = buildSummary(payload, address);
    printSummary(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Lookup failed: ${message}`);
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(`Unexpected error: ${(error as Error).message}`);
  process.exit(2);
});
