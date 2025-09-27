import { maybe, need } from "../env.ts";
import type {
  OnchainAccountSnapshot,
  OnchainBalance,
  OnchainTransaction,
} from "./types.ts";

const DEFAULT_BASE = "https://api.covalenthq.com/v1/";

function getBaseUrl(): string {
  const base = maybe("COVALENT_API_BASE_URL") ?? DEFAULT_BASE;
  return base.endsWith("/") ? base : `${base}/`;
}

function getApiKey(): string {
  return need("COVALENT_API_KEY");
}

async function covalentRequest<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(path.replace(/^\//, ""), getBaseUrl());
  const key = getApiKey();
  url.searchParams.set("key", key);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Covalent request failed (${res.status}): ${text}`);
  }
  const body = await res.json();
  if (body.error) {
    throw new Error(`Covalent error: ${body.error}`);
  }
  return body as T;
}

export async function fetchCovalentBalances(
  chainId: string,
  address: string,
): Promise<OnchainAccountSnapshot> {
  const resp = await covalentRequest<{
    data: { items: Array<Record<string, unknown>> };
  }>(`${chainId}/address/${address}/balances_v2/`);
  const balances: OnchainBalance[] = (resp.data?.items ?? []).map((item) => {
    const decimals = Number(item.contract_decimals ?? 18);
    const balanceRaw = item.balance ?? "0";
    const balanceBig = BigInt(String(balanceRaw || "0"));
    const divisor = 10n ** BigInt(decimals > 0 ? decimals : 0);
    const whole = balanceBig / divisor;
    const fraction = balanceBig % divisor;
    const fractionStr = decimals > 0
      ? fraction.toString().padStart(decimals, "0").replace(/0+$/, "")
      : "";
    const amount = fractionStr
      ? `${whole.toString()}.${fractionStr}`
      : whole.toString();
    return {
      chainId,
      address,
      tokenAddress: String(item.contract_address ?? ""),
      symbol: String(
        item.contract_ticker_symbol ?? item.contract_name ?? "UNKNOWN",
      ),
      decimals,
      amount,
      usdValue: typeof item.quote === "number" ? item.quote : null,
      updatedAt: new Date().toISOString(),
      raw: item,
    };
  });
  return {
    chainId,
    address,
    balances,
    fetchedAt: new Date().toISOString(),
    raw: resp,
  };
}

export async function fetchCovalentTransactions(
  chainId: string,
  address: string,
  opts: { pageSize?: number; pageNumber?: number } = {},
): Promise<OnchainTransaction[]> {
  const resp = await covalentRequest<{
    data: { items: Array<Record<string, unknown>> };
  }>(`${chainId}/address/${address}/transactions_v3/`, {
    page_size: opts.pageSize ?? 25,
    page_number: opts.pageNumber ?? 0,
  });
  const items = resp.data?.items ?? [];
  return items.map((tx) => {
    const from = String(tx.from_address ?? tx.from ?? "");
    const to = String(tx.to_address ?? tx.to ?? "");
    const value = String(tx.value ?? tx.value_quote ?? "0");
    const symbol = String(tx.value_quote_symbol ?? tx.gas_quote_symbol ?? "");
    const status = tx.success === false ? "failed" : "confirmed";
    return {
      chainId,
      hash: String(tx.tx_hash ?? tx.hash ?? ""),
      from,
      to,
      value,
      symbol: symbol || undefined,
      direction: from === to
        ? "self"
        : from.toLowerCase() === address.toLowerCase()
        ? "outbound"
        : "inbound",
      status,
      blockNumber: tx.block_height ? String(tx.block_height) : undefined,
      blockTimestamp: tx.block_signed_at
        ? new Date(String(tx.block_signed_at)).toISOString()
        : undefined,
      fee: tx.fees_paid ? String(tx.fees_paid) : undefined,
      raw: tx,
    };
  });
}
