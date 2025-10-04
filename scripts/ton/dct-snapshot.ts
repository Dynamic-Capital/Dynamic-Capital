import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { parse as parseYaml } from "yaml";

const execFileAsync = promisify(execFile);

const TON_API_BASE = "https://tonapi.io/v2";
const STONFI_API_BASE = "https://api.ston.fi/v1";
const DEDUST_API_BASE = "https://api.dedust.io/v1";

interface JettonSummaryResponse {
  mintable?: boolean;
  total_supply?: string;
  admin?: {
    address?: string;
    name?: string;
    is_wallet?: boolean;
  };
  metadata?: {
    name?: string;
    symbol?: string;
    decimals?: string | number;
  };
  holders_count?: number;
}

interface JettonHolderResponse {
  addresses?: Array<{
    address?: string;
    balance?: string;
    owner?: {
      address?: string;
      name?: string;
      is_wallet?: boolean;
    };
  }>;
  total?: number;
}

interface AccountJettonsResponse {
  balances?: Array<{
    balance?: string;
    wallet_address?: { address?: string };
    jetton?: { address?: string; symbol?: string };
  }>;
}

interface TonAccountResponse {
  balance?: number;
}

interface RepositoryConfig {
  token?: {
    name?: string;
    symbol?: string;
    decimals?: number;
    address?: string;
    maxSupply?: number | string;
  };
}

type DexCheckStatus =
  | { venue: "STON.fi" | "DeDust"; status: "not_listed"; httpStatus: number }
  | {
    venue: "STON.fi" | "DeDust";
    status: "listed";
    httpStatus: number;
    note?: string;
  }
  | {
    venue: "STON.fi" | "DeDust";
    status: "error";
    httpStatus: number;
    message: string;
  };

function getRepoRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "..");
}

async function loadConfig(): Promise<
  Required<RepositoryConfig>["token"] & { maxSupply?: bigint }
> {
  const root = getRepoRoot();
  const raw = await readFile(
    resolve(root, "dynamic-capital-ton", "config.yaml"),
    "utf8",
  );
  const config = parseYaml(raw) as RepositoryConfig;
  const token = config.token;
  if (!token?.address) {
    throw new Error(
      "Token address missing from dynamic-capital-ton/config.yaml",
    );
  }
  const decimals = typeof token.decimals === "number"
    ? token.decimals
    : Number.parseInt(String(token.decimals ?? ""), 10);
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error("Token decimals missing or invalid in configuration");
  }
  const maxSupply = token.maxSupply === undefined ? undefined : (() => {
    const parsed = token.maxSupply;
    try {
      return BigInt(
        typeof parsed === "number" ? Math.trunc(parsed) : parsed,
      );
    } catch (error) {
      throw new Error(
        `Token maxSupply invalid in configuration: ${(error as Error).message}`,
      );
    }
  })();
  return {
    name: token.name ?? "Dynamic Capital Token",
    symbol: token.symbol ?? "DCT",
    decimals,
    address: token.address,
    maxSupply,
  };
}

async function curlRequest(
  url: string,
): Promise<{ status: number; body: string }> {
  const args = [
    "-sS",
    "-H",
    "Accept: application/json",
    "-H",
    "User-Agent: dynamic-capital-dct-snapshot/1.0",
    "-w",
    "\n%{http_code}",
    url,
  ];
  try {
    const { stdout } = await execFileAsync("curl", args);
    const trimmed = stdout.trimEnd();
    const lines = trimmed.split("\n");
    const statusText = lines.pop() ?? "";
    const status = Number.parseInt(statusText, 10);
    if (!Number.isFinite(status)) {
      throw new Error(`Unexpected status code from curl output: ${statusText}`);
    }
    const body = lines.join("\n");
    return { status, body };
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr?.trim();
    const suffix = stderr ? `: ${stderr}` : "";
    throw new Error(`curl request failed${suffix}`);
  }
}

async function fetchJson<T>(
  url: string,
  { label }: { label: string },
): Promise<T> {
  const { status, body } = await curlRequest(url);
  if (status < 200 || status >= 300) {
    throw new Error(
      `${label} request failed with status ${status}: ${body.slice(0, 200)}`,
    );
  }
  try {
    return JSON.parse(body) as T;
  } catch (error) {
    throw new Error(
      `${label} response parse error: ${(error as Error).message}`,
    );
  }
}

async function fetchJsonAllowing404<T>(
  url: string,
): Promise<{ status: number; data?: T }> {
  const { status, body } = await curlRequest(url);
  if (status === 404) {
    return { status };
  }
  if (status < 200 || status >= 300) {
    throw new Error(
      `Request to ${url} failed with status ${status}: ${body.slice(0, 200)}`,
    );
  }
  try {
    return { status, data: JSON.parse(body) as T };
  } catch (error) {
    throw new Error(
      `Unable to parse response from ${url}: ${(error as Error).message}`,
    );
  }
}

function toBigInt(value: string | number | bigint | undefined): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string" && value.trim()) {
    try {
      return BigInt(value.trim());
    } catch (error) {
      throw new Error(
        `Unable to parse bigint value: ${(error as Error).message}`,
      );
    }
  }
  return null;
}

function formatJettonAmount(value: bigint, decimals: number): string {
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = value / divisor;
  const remainder = value % divisor;
  if (remainder === BigInt(0)) {
    return whole.toString();
  }
  const fraction = remainder.toString().padStart(decimals, "0").replace(
    /0+$/,
    "",
  );
  return `${whole.toString()}.${fraction}`;
}

function formatTonAmount(nanoTons: bigint): string {
  return formatJettonAmount(nanoTons, 9);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

async function checkDexPresence(
  tokenAddress: string,
): Promise<DexCheckStatus[]> {
  const results: DexCheckStatus[] = [];

  // STON.fi exposes jetton metadata under /jettons/<address> when listed.
  {
    const url = `${STONFI_API_BASE}/jettons/${
      encodeURIComponent(tokenAddress)
    }`;
    try {
      const { status } = await fetchJsonAllowing404(url);
      if (status === 404) {
        results.push({
          venue: "STON.fi",
          status: "not_listed",
          httpStatus: status,
        });
      } else {
        results.push({
          venue: "STON.fi",
          status: "listed",
          httpStatus: status,
        });
      }
    } catch (error) {
      results.push({
        venue: "STON.fi",
        status: "error",
        httpStatus: 0,
        message: (error as Error).message,
      });
    }
  }

  // DeDust returns 404 for unknown jetton roots when querying findByToken.
  {
    const url = `${DEDUST_API_BASE}/pools/findByToken?token_root=${
      encodeURIComponent(tokenAddress)
    }`;
    try {
      const { status } = await fetchJsonAllowing404(url);
      if (status === 404) {
        results.push({
          venue: "DeDust",
          status: "not_listed",
          httpStatus: status,
        });
      } else {
        results.push({ venue: "DeDust", status: "listed", httpStatus: status });
      }
    } catch (error) {
      results.push({
        venue: "DeDust",
        status: "error",
        httpStatus: 0,
        message: (error as Error).message,
      });
    }
  }

  return results;
}

function printHeader(title: string): void {
  console.log("\n" + title);
  console.log("".padEnd(title.length, "="));
}

function printList(entries: Array<[string, string]>): void {
  for (const [label, value] of entries) {
    console.log(`${label}: ${value}`);
  }
}

async function main(): Promise<void> {
  const token = await loadConfig();
  const jettonSummary = await fetchJson<JettonSummaryResponse>(
    `${TON_API_BASE}/jettons/${encodeURIComponent(token.address)}`,
    { label: "jetton summary" },
  );
  const holdersResponse = await fetchJson<JettonHolderResponse>(
    `${TON_API_BASE}/jettons/${
      encodeURIComponent(token.address)
    }/holders?limit=16`,
    { label: "jetton holders" },
  );

  const totalSupplyRaw = toBigInt(jettonSummary.total_supply);
  if (totalSupplyRaw === null) {
    throw new Error("Jetton total supply missing in tonapi response");
  }

  const supplyFormatted = formatJettonAmount(totalSupplyRaw, token.decimals);
  const holderCount = holdersResponse.total ?? jettonSummary.holders_count ?? 0;
  const topHolders = holdersResponse.addresses ?? [];

  printHeader(`Dynamic Capital Token Snapshot — ${new Date().toISOString()}`);
  printList([
    ["Jetton master", token.address],
    ["Token", `${token.name} (${token.symbol})`],
    ["Mintable", jettonSummary.mintable ? "yes" : "no"],
    ["Total supply", `${supplyFormatted} ${token.symbol}`],
    ["Holder count", holderCount.toString()],
  ]);

  let mintedMatchesConfiguredMax = false;
  if (token.maxSupply !== undefined) {
    const decimalsFactor = BigInt(10) ** BigInt(token.decimals);
    const configuredMaxRaw = token.maxSupply * decimalsFactor;
    const configuredMax = formatJettonAmount(configuredMaxRaw, token.decimals);
    const difference = configuredMaxRaw - totalSupplyRaw;

    printHeader("Supply controls");
    printList([
      [
        "Configured max supply",
        `${configuredMax} ${token.symbol}`,
      ],
      [
        "Minted supply",
        `${supplyFormatted} ${token.symbol}`,
      ],
      [
        "Remaining to mint",
        difference <= BigInt(0)
          ? "0"
          : `${formatJettonAmount(difference, token.decimals)} ${token.symbol}`,
      ],
    ]);

    if (difference === BigInt(0)) {
      mintedMatchesConfiguredMax = true;
      console.log(
        "On-chain total supply matches the configured max supply.",
      );
    } else if (difference > BigInt(0)) {
      console.log(
        "⚠️  Mint and transfer the remaining supply to the treasury before locking minting.",
      );
    } else {
      console.log(
        "⚠️  Reported total supply exceeds the configured maxSupply; investigate immediately.",
      );
    }
  }

  if (topHolders.length === 0) {
    console.log("No holders reported by tonapi.");
  } else {
    printHeader("Top holders");
    topHolders.forEach((entry, index) => {
      const balanceRaw = toBigInt(entry.balance);
      const balance = balanceRaw === null
        ? "unknown"
        : `${formatJettonAmount(balanceRaw, token.decimals)} ${token.symbol}`;
      const ownerLabel = entry.owner?.name
        ? `${entry.owner.name} (${entry.owner.address ?? "unknown"})`
        : entry.owner?.address ?? entry.address ?? "unknown";
      printList([
        ["Rank", (index + 1).toString()],
        ["Owner", ownerLabel],
        ["Jetton wallet", entry.address ?? "unknown"],
        ["Balance", balance],
        ["Wallet type", entry.owner?.is_wallet ? "wallet" : "contract"],
      ]);
      console.log("");
    });
  }

  const adminAddress = jettonSummary.admin?.address;
  if (adminAddress) {
    const accountJettons = await fetchJson<AccountJettonsResponse>(
      `${TON_API_BASE}/accounts/${encodeURIComponent(adminAddress)}/jettons`,
      { label: "admin jettons" },
    );
    const accountSummary = await fetchJson<TonAccountResponse>(
      `${TON_API_BASE}/accounts/${encodeURIComponent(adminAddress)}`,
      { label: "admin account" },
    );

    const matching = accountJettons.balances?.find((item) =>
      item.jetton?.address?.toLowerCase() === token.address.toLowerCase()
    );

    printHeader("Admin wallet");
    printList([
      ["Address", adminAddress],
      ["Domain", jettonSummary.admin?.name ?? "(none)"],
      [
        "TON balance",
        accountSummary.balance !== undefined
          ? `${formatTonAmount(BigInt(accountSummary.balance))} TON`
          : "unknown",
      ],
      ["Jetton wallet", matching?.wallet_address?.address ?? "unknown"],
      [
        "Jetton balance",
        matching?.balance
          ? `${
            formatJettonAmount(BigInt(matching.balance), token.decimals)
          } ${token.symbol}`
          : "0",
      ],
    ]);

    if (holderCount > 0 && totalSupplyRaw > BigInt(0)) {
      const adminBalance = matching?.balance
        ? BigInt(matching.balance)
        : BigInt(0);
      const adminShare = Number(adminBalance) / Number(totalSupplyRaw);
      if (Number.isFinite(adminShare)) {
        console.log(
          `Admin controls ${formatPercent(adminShare)} of the reported supply.`,
        );
      }

      if (adminBalance === totalSupplyRaw) {
        console.log("Treasury wallet holds 100% of minted jettons.");
      } else {
        const shortfall = totalSupplyRaw - adminBalance;
        console.log(
          `⚠️  Transfer ${
            formatJettonAmount(shortfall, token.decimals)
          } ${token.symbol} to the treasury to consolidate control.`,
        );
      }
    }
  }

  if (token.maxSupply !== undefined && mintedMatchesConfiguredMax) {
    if (jettonSummary.mintable) {
      console.log(
        "⚠️  Jetton remains mintable. Lock minting by submitting the set_mintable(false) transaction from the treasury multisig.",
      );
    } else {
      console.log("Minting is locked on-chain.");
    }
  }

  const dexStatuses = await checkDexPresence(token.address);
  printHeader("DEX listings");
  for (const entry of dexStatuses) {
    if (entry.status === "listed") {
      console.log(`${entry.venue}: listed (HTTP ${entry.httpStatus})`);
    } else if (entry.status === "not_listed") {
      console.log(`${entry.venue}: not listed (HTTP ${entry.httpStatus})`);
    } else {
      console.log(`${entry.venue}: error — ${entry.message}`);
    }
  }
}

main().catch((error) => {
  console.error(`Snapshot generation failed: ${(error as Error).message}`);
  process.exitCode = 1;
});
