#!/usr/bin/env node

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface TonDnsResponse {
  name?: string;
  expiring_at?: number;
  item?: {
    address?: string;
    owner?: {
      address?: string;
      name?: string;
      is_wallet?: boolean;
    };
    dns?: string;
  };
  error?: string;
}

interface QueryResult {
  domain: string;
  resolverAddress?: string;
  ownerAddress?: string;
  ownerName?: string;
  ownerIsWallet?: boolean;
  expiresAtIso?: string;
}

const HELP_MESSAGE =
  `Usage: npx tsx scripts/ton/query-ton-domain.ts <domain>\n\nLooks up TON DNS metadata for the provided domain using tonapi.io.\nOutputs the resolver contract address and owner wallet when available.`;

function formatIso(expiringAt?: number): string | undefined {
  if (!expiringAt) {
    return undefined;
  }
  const millis = expiringAt * 1000;
  if (!Number.isFinite(millis)) {
    return undefined;
  }
  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
}

async function requestTonApi(
  domain: string,
): Promise<{ status: number; body: string }> {
  const endpoint = `https://tonapi.io/v2/dns/${encodeURIComponent(domain)}`;
  const args = [
    "-sS",
    "-H",
    "Accept: application/json",
    "-H",
    "User-Agent: dynamic-capital-ton-domain-query/1.0",
    "-w",
    "\n%{http_code}",
    endpoint,
  ];

  try {
    const { stdout } = await execFileAsync("curl", args);
    const trimmed = stdout.trimEnd();
    const lines = trimmed.split("\n");
    const statusText = lines.pop() ?? "";
    const status = Number.parseInt(statusText, 10);
    if (!Number.isFinite(status)) {
      throw new Error(`Unexpected response from curl (status: ${statusText})`);
    }
    const body = lines.join("\n");
    return { status, body };
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr?.trim();
    const suffix = stderr ? `: ${stderr}` : "";
    throw new Error(
      `curl request to tonapi.io failed${suffix || ""}`,
    );
  }
}

async function fetchDns(domain: string): Promise<TonDnsResponse> {
  const { status, body } = await requestTonApi(domain);

  if (status < 200 || status >= 300) {
    try {
      const payload = JSON.parse(body) as TonDnsResponse;
      throw new Error(payload.error || body.trim() || `HTTP ${status}`);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(body.trim() || `HTTP ${status}`);
    }
  }

  try {
    return JSON.parse(body) as TonDnsResponse;
  } catch (error) {
    throw new Error(
      `Unable to parse tonapi.io response: ${(error as Error).message}`,
    );
  }
}

function buildResult(domain: string, payload: TonDnsResponse): QueryResult {
  const resolverAddress = payload.item?.address;
  const owner = payload.item?.owner;

  return {
    domain,
    resolverAddress,
    ownerAddress: owner?.address,
    ownerName: owner?.name,
    ownerIsWallet: owner?.is_wallet,
    expiresAtIso: formatIso(payload.expiring_at),
  };
}

function printResult(result: QueryResult): void {
  console.log(`Domain: ${result.domain}`);
  if (result.resolverAddress) {
    console.log(`Resolver address: ${result.resolverAddress}`);
  } else {
    console.log("Resolver address: (not available)");
  }

  if (result.ownerAddress) {
    console.log(`Owner address: ${result.ownerAddress}`);
    if (result.ownerName && result.ownerName !== result.domain) {
      console.log(`Owner name: ${result.ownerName}`);
    }
    if (typeof result.ownerIsWallet === "boolean") {
      console.log(`Owner is wallet: ${result.ownerIsWallet ? "yes" : "no"}`);
    }
  } else {
    console.log("Owner address: (not available)");
  }

  if (result.expiresAtIso) {
    console.log(`Expires at: ${result.expiresAtIso}`);
  }
}

async function main(): Promise<void> {
  const [, , rawDomain, ...rest] = process.argv;
  if (!rawDomain || rest.length > 0 && rest[0] === "--help") {
    console.error(HELP_MESSAGE);
    process.exit(1);
  }

  const domain = rawDomain.trim();
  if (!domain) {
    console.error(HELP_MESSAGE);
    process.exit(1);
  }

  try {
    const payload = await fetchDns(domain);
    const result = buildResult(domain, payload);
    printResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Lookup failed for ${domain}: ${message}`);
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(`Unexpected error: ${(error as Error).message}`);
  process.exit(2);
});
