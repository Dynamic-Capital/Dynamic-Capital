import { maybe, need } from "../env.ts";
import type {
  OnchainAccountSnapshot,
  OnchainBalance,
  OnchainTransaction,
} from "./types.ts";

const ETH_CHAIN_ID = "ethereum-mainnet";

function getBaseUrl(): string {
  return (maybe("ETHERSCAN_API_BASE_URL") ?? "https://api.etherscan.io")
    .replace(/\/$/, "");
}

function getApiKey(): string {
  return need("ETHERSCAN_API_KEY");
}

async function etherscanRequest<T>(params: Record<string, string>): Promise<T> {
  const search = new URLSearchParams({ ...params, apikey: getApiKey() });
  const url = `${getBaseUrl()}/api?${search.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Etherscan request failed (${res.status}): ${text}`);
  }
  const body = await res.json();
  if (body.status === "0" && body.message !== "OK" && body.result) {
    throw new Error(`Etherscan error: ${body.result}`);
  }
  return body as T;
}

function weiToEth(value: string): string {
  const bigInt = BigInt(value || "0");
  const decimals = 18n;
  const divisor = 10n ** decimals;
  const whole = bigInt / divisor;
  const fraction = bigInt % divisor;
  const fractionStr = fraction.toString().padStart(Number(decimals), "0")
    .replace(/0+$/, "");
  return fractionStr ? `${whole.toString()}.${fractionStr}` : whole.toString();
}

function normalizeStatus(
  value: string | undefined,
): "pending" | "confirmed" | "failed" {
  if (value === "0") return "failed";
  if (value === "1") return "confirmed";
  return "pending";
}

export async function fetchEthereumAccountSnapshot(
  address: string,
): Promise<OnchainAccountSnapshot> {
  const balanceResp = await etherscanRequest<
    { status: string; message: string; result: string }
  >({
    module: "account",
    action: "balance",
    address,
    tag: "latest",
  });
  const balanceValue = weiToEth(balanceResp.result ?? "0");
  const balance: OnchainBalance = {
    chainId: ETH_CHAIN_ID,
    address,
    tokenAddress: "native",
    symbol: "ETH",
    decimals: 18,
    amount: balanceValue,
    updatedAt: new Date().toISOString(),
    raw: balanceResp,
  };
  return {
    chainId: ETH_CHAIN_ID,
    address,
    balances: [balance],
    fetchedAt: new Date().toISOString(),
    raw: balanceResp,
  };
}

export async function fetchEthereumTransactions(
  address: string,
  opts: {
    startBlock?: number;
    endBlock?: number;
    page?: number;
    offset?: number;
  } = {},
): Promise<OnchainTransaction[]> {
  const params: Record<string, string> = {
    module: "account",
    action: "txlist",
    address,
    startblock: String(opts.startBlock ?? 0),
    endblock: String(opts.endBlock ?? 99999999),
    sort: "desc",
  };
  if (opts.page) params.page = String(opts.page);
  if (opts.offset) params.offset = String(opts.offset);
  const txResp = await etherscanRequest<
    { result: Array<Record<string, string>> }
  >(params);
  const items = Array.isArray(txResp.result) ? txResp.result : [];
  return items.map((tx) => {
    const value = weiToEth(tx.value ?? "0");
    const fee = weiToEth(
      (BigInt(tx.gasPrice || "0") * BigInt(tx.gasUsed || "0")).toString(),
    );
    const status = normalizeStatus(tx.txreceipt_status ?? tx.isError);
    const direction = tx.from?.toLowerCase() === address.toLowerCase()
      ? tx.to?.toLowerCase() === address.toLowerCase() ? "self" : "outbound"
      : "inbound";
    return {
      chainId: ETH_CHAIN_ID,
      hash: tx.hash ?? "",
      from: tx.from ?? "",
      to: tx.to ?? "",
      value,
      symbol: "ETH",
      decimals: 18,
      direction,
      status,
      blockNumber: tx.blockNumber,
      blockTimestamp: tx.timeStamp
        ? new Date(Number(tx.timeStamp) * 1000).toISOString()
        : undefined,
      fee,
      raw: tx,
    };
  });
}
