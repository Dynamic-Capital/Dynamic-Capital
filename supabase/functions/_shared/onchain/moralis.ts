import { maybe, need } from "../env.ts";
import type {
  OnchainAccountSnapshot,
  OnchainBalance,
  OnchainTransaction,
} from "./types.ts";

const DEFAULT_BASE = "https://deep-index.moralis.io/api/v2/";

function getBaseUrl(): string {
  const base = maybe("MORALIS_API_BASE_URL") ?? DEFAULT_BASE;
  return base.endsWith("/") ? base : `${base}/`;
}

function buildHeaders(): HeadersInit {
  return {
    accept: "application/json",
    "X-API-Key": need("MORALIS_API_KEY"),
  };
}

async function moralisRequest<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(path.replace(/^\//, ""), getBaseUrl());
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url, { headers: buildHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Moralis request failed (${res.status}): ${text}`);
  }
  return await res.json() as T;
}

export async function fetchMoralisBalance(
  chainId: string,
  address: string,
): Promise<OnchainAccountSnapshot> {
  const data = await moralisRequest<Record<string, unknown>>(
    `${address}/balance`,
    {
      chain: chainId,
    },
  );
  const balanceRaw = String(data.balance ?? "0");
  const decimals = Number(data.decimals ?? 18);
  const divisor = 10n ** BigInt(decimals > 0 ? decimals : 0);
  const whole = BigInt(balanceRaw || "0") / divisor;
  const fraction = BigInt(balanceRaw || "0") % divisor;
  const fractionStr = decimals > 0
    ? fraction.toString().padStart(decimals, "0").replace(/0+$/, "")
    : "";
  const amount = fractionStr
    ? `${whole.toString()}.${fractionStr}`
    : whole.toString();
  const balance: OnchainBalance = {
    chainId,
    address,
    tokenAddress: "native",
    symbol: String(data.symbol ?? data.token_symbol ?? "UNKNOWN"),
    decimals,
    amount,
    updatedAt: new Date().toISOString(),
    raw: data,
  };
  return {
    chainId,
    address,
    balances: [balance],
    fetchedAt: new Date().toISOString(),
    raw: data,
  };
}

export async function fetchMoralisTransactions(
  chainId: string,
  address: string,
  opts: { fromBlock?: number; toBlock?: number; limit?: number } = {},
): Promise<OnchainTransaction[]> {
  const data = await moralisRequest<{ result: Array<Record<string, unknown>> }>(
    `${address}`,
    {
      chain: chainId,
      from_block: opts.fromBlock,
      to_block: opts.toBlock,
      limit: opts.limit ?? 25,
    },
  );
  const items = Array.isArray(data.result) ? data.result : [];
  return items.map((tx) => {
    const from = String(tx.from_address ?? tx.from ?? "");
    const to = String(tx.to_address ?? tx.to ?? "");
    const value = String(tx.value ?? tx.value_decimal ?? "0");
    const status = tx.receipt_status === "0" ? "failed" : "confirmed";
    const direction = from.toLowerCase() === address.toLowerCase()
      ? to.toLowerCase() === address.toLowerCase() ? "self" : "outbound"
      : "inbound";
    return {
      chainId,
      hash: String(tx.hash ?? tx.transaction_hash ?? ""),
      from,
      to,
      value,
      symbol: String(tx.value_symbol ?? tx.token_symbol ?? ""),
      decimals: Number(tx.value_decimals ?? 18),
      direction,
      status,
      blockNumber: tx.block_number ? String(tx.block_number) : undefined,
      blockTimestamp: tx.block_timestamp
        ? new Date(String(tx.block_timestamp)).toISOString()
        : undefined,
      fee: tx.gas_price ? String(tx.gas_price) : undefined,
      raw: tx,
    };
  });
}
