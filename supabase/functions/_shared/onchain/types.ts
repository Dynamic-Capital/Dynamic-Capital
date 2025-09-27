export interface OnchainBalance {
  chainId: string;
  address: string;
  tokenAddress?: string | null;
  symbol: string;
  decimals: number;
  amount: string;
  usdValue?: number | null;
  updatedAt: string;
  raw?: unknown;
}

export interface OnchainTransaction {
  chainId: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  symbol?: string;
  decimals?: number;
  direction: "inbound" | "outbound" | "self";
  status?: "pending" | "confirmed" | "failed";
  blockNumber?: string;
  blockTimestamp?: string;
  fee?: string;
  raw?: unknown;
}

export interface OnchainMetric {
  provider: string;
  metric: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  observedAt: string;
  raw?: unknown;
}

export interface OnchainAccountSnapshot {
  chainId: string;
  address: string;
  balances: OnchainBalance[];
  transactions?: OnchainTransaction[];
  fetchedAt: string;
  raw?: unknown;
}
