import { need, optionalEnv } from "../env.ts";
import type {
  OnchainAccountSnapshot,
  OnchainBalance,
  OnchainTransaction,
} from "./types.ts";

const TON_CHAIN_ID = "ton-mainnet";

function getBaseUrl(): string {
  const base = optionalEnv("TON_API_BASE_URL") ??
    optionalEnv("TON_INDEXER_URL") ??
    need("TON_API_BASE_URL");
  return base.endsWith("/") ? base : `${base}/`;
}

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    accept: "application/json",
  };
  const apiKey = optionalEnv("TON_API_KEY");
  if (apiKey) headers["authorization"] = `Bearer ${apiKey}`;
  return headers;
}

async function tonRequest<T>(
  path: string,
  search?: Record<string, string | number | undefined>,
): Promise<T> {
  const base = getBaseUrl();
  const url = new URL(path.replace(/^\//, ""), base);
  if (search) {
    for (const [key, value] of Object.entries(search)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url, { headers: buildHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TON request failed (${res.status}): ${text}`);
  }
  return await res.json() as T;
}

function toTonAmount(value: unknown): number {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  if (Math.abs(numeric) > 1_000_000) {
    return numeric / 1_000_000_000;
  }
  return numeric;
}

function pickTimestamp(candidate: unknown, fallback: Date): string {
  if (typeof candidate === "string" || typeof candidate === "number") {
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return fallback.toISOString();
}

export async function fetchTonAccountSnapshot(
  address: string,
): Promise<OnchainAccountSnapshot> {
  const data = await tonRequest<Record<string, unknown>>(`accounts/${address}`);
  const balanceNano = data.balance ?? data.balance_nano ?? data.account_balance;
  const tonAmount = toTonAmount(balanceNano);
  const balance: OnchainBalance = {
    chainId: TON_CHAIN_ID,
    address,
    tokenAddress: "native",
    symbol: "TON",
    decimals: 9,
    amount: tonAmount.toString(),
    usdValue: typeof data.balance_usd === "number" ? data.balance_usd : null,
    updatedAt: pickTimestamp(
      data.updated_at ?? data.last_activity_time,
      new Date(),
    ),
    raw: data,
  };
  return {
    chainId: TON_CHAIN_ID,
    address,
    balances: [balance],
    transactions: [],
    fetchedAt: new Date().toISOString(),
    raw: data,
  };
}

function normalizeTonTransaction(
  tx: Record<string, unknown>,
  account: string,
): OnchainTransaction {
  const hash = String(tx.hash ?? tx.transaction_id ?? tx.id ?? "");
  const from = String(
    tx.source ?? tx.from ?? tx.in_msg?.source ?? account,
  );
  const to = String(
    tx.destination ?? tx.to ?? tx.in_msg?.destination ??
      tx.out_msgs?.[0]?.destination ?? account,
  );
  const amountSource = tx.amount ?? tx.value ?? tx.in_msg?.value ??
    tx.in_msg?.amount ?? 0;
  const feeSource = tx.fee ?? tx.fees ?? tx.in_msg?.fee ?? 0;
  const amount = toTonAmount(amountSource);
  const fee = toTonAmount(feeSource);
  const direction = from === to
    ? "self"
    : from === account
    ? "outbound"
    : "inbound";
  return {
    chainId: TON_CHAIN_ID,
    hash,
    from,
    to,
    value: amount.toString(),
    symbol: "TON",
    decimals: 9,
    direction,
    status: String(tx.status ?? tx.transaction_type ?? "confirmed"),
    blockNumber: tx.block_number ? String(tx.block_number) : undefined,
    blockTimestamp: pickTimestamp(
      tx.block_time ?? tx.created_at ?? tx.utime,
      new Date(),
    ),
    fee: fee ? fee.toString() : undefined,
    raw: tx,
  };
}

export async function fetchTonTransactions(
  address: string,
  opts: { limit?: number; beforeLt?: string } = {},
): Promise<OnchainTransaction[]> {
  const data = await tonRequest<Record<string, unknown>>(
    `accounts/${address}/transactions`,
    { limit: opts.limit ?? 20, before_lt: opts.beforeLt },
  );
  const items = Array.isArray(data.transactions)
    ? data.transactions
    : Array.isArray(data.items)
    ? data.items
    : [];
  return items.map((tx) =>
    normalizeTonTransaction(tx as Record<string, unknown>, address)
  );
}

export async function lookupTonTransaction(
  txHash: string,
  accountAddress?: string,
): Promise<OnchainTransaction> {
  const data = await tonRequest<Record<string, unknown>>(
    `transactions/${txHash}`,
  );
  const fallbackAccount = accountAddress ??
    String(data.account ?? data.address ?? data.source ?? "");
  return normalizeTonTransaction(data, fallbackAccount);
}
