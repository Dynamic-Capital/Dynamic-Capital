import { registerHandler } from "../_shared/serve.ts";
import { bad, corsHeaders, methodNotAllowed, ok } from "../_shared/http.ts";
import { createClient, type SupabaseClient } from "../_shared/client.ts";
import {
  fetchCovalentBalances,
  fetchCovalentTransactions,
  fetchEthereumAccountSnapshot,
  fetchEthereumTransactions,
  fetchGlassnodeMetric,
  fetchMoralisBalance,
  fetchMoralisTransactions,
  fetchTonAccountSnapshot,
  fetchTonTransactions,
  type GlassnodeMetricOptions,
  type OnchainAccountSnapshot,
  type OnchainTransaction,
} from "../_shared/onchain/index.ts";

interface SyncMetricRequest {
  provider: "glassnode";
  metric: string;
  options?: GlassnodeMetricOptions;
}

type SyncSource = "ton" | "etherscan" | "covalent" | "moralis";

interface SyncJob {
  chainId: string;
  address: string;
  sources?: SyncSource[];
  metrics?: SyncMetricRequest[];
  transactions?: {
    limit?: number;
  };
}

interface SyncRequest {
  jobs: SyncJob[];
}

interface SyncSummary {
  chainId: string;
  address: string;
  balances: number;
  activity: number;
  metrics: number;
  errors: string[];
}

function inferSources(chainId: string): SyncSource[] {
  if (chainId.startsWith("ton")) return ["ton"];
  if (chainId.startsWith("ethereum")) return ["etherscan"];
  return ["covalent"];
}

function ensureArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

async function persistBalances(
  supabase: SupabaseClient,
  snapshot: OnchainAccountSnapshot,
): Promise<number> {
  const rows = snapshot.balances.map((balance) => ({
    chain_id: balance.chainId,
    address: balance.address,
    token_address: balance.tokenAddress ?? null,
    token_symbol: balance.symbol,
    token_decimals: balance.decimals,
    balance: balance.amount,
    usd_value: balance.usdValue ?? null,
    observed_at: balance.updatedAt,
    metadata: {
      raw: balance.raw ?? null,
      fetched_at: snapshot.fetchedAt,
    },
  }));
  if (rows.length === 0) return 0;
  const { error } = await supabase.from("onchain_balances").upsert(rows, {
    onConflict: "chain_id,address,token_address,observed_at",
  });
  if (error) throw error;
  return rows.length;
}

async function persistTransactions(
  supabase: SupabaseClient,
  address: string,
  transactions: OnchainTransaction[],
): Promise<number> {
  const rows = transactions.map((tx) => ({
    chain_id: tx.chainId,
    address,
    tx_hash: tx.hash,
    direction: tx.direction,
    counterparty: tx.direction === "inbound" ? tx.from : tx.to,
    token_symbol: tx.symbol ?? null,
    amount: tx.value,
    status: tx.status ?? "confirmed",
    block_number: tx.blockNumber ?? null,
    block_timestamp: tx.blockTimestamp ?? null,
    fee: tx.fee ?? null,
    metadata: { raw: tx.raw ?? null },
  }));
  if (rows.length === 0) return 0;
  const { error } = await supabase.from("onchain_activity").upsert(rows, {
    onConflict: "chain_id,tx_hash,address",
  });
  if (error) throw error;
  return rows.length;
}

async function handleSource(
  job: SyncJob,
  source: SyncSource,
  supabase: SupabaseClient,
): Promise<{ balances: number; activity: number }> {
  switch (source) {
    case "ton": {
      const snapshot = await fetchTonAccountSnapshot(job.address);
      const txs = await fetchTonTransactions(job.address, {
        limit: job.transactions?.limit ?? 20,
      });
      const balances = await persistBalances(supabase, snapshot);
      const activity = await persistTransactions(supabase, job.address, txs);
      return { balances, activity };
    }
    case "etherscan": {
      const snapshot = await fetchEthereumAccountSnapshot(job.address);
      const txs = await fetchEthereumTransactions(job.address, {
        offset: job.transactions?.limit ?? 20,
      });
      const balances = await persistBalances(supabase, snapshot);
      const activity = await persistTransactions(supabase, job.address, txs);
      return { balances, activity };
    }
    case "covalent": {
      const snapshot = await fetchCovalentBalances(job.chainId, job.address);
      const txs = await fetchCovalentTransactions(job.chainId, job.address, {
        pageSize: job.transactions?.limit ?? 25,
      });
      const balances = await persistBalances(supabase, snapshot);
      const activity = await persistTransactions(supabase, job.address, txs);
      return { balances, activity };
    }
    case "moralis": {
      const snapshot = await fetchMoralisBalance(job.chainId, job.address);
      const txs = await fetchMoralisTransactions(job.chainId, job.address, {
        limit: job.transactions?.limit ?? 25,
      });
      const balances = await persistBalances(supabase, snapshot);
      const activity = await persistTransactions(supabase, job.address, txs);
      return { balances, activity };
    }
    default:
      throw new Error(`Unsupported source ${source}`);
  }
}

async function persistMetrics(
  supabase: SupabaseClient,
  metrics: Awaited<ReturnType<typeof fetchGlassnodeMetric>>,
): Promise<number> {
  const rows = metrics.map((metric) => ({
    provider: metric.provider,
    metric: metric.metric,
    value: metric.value,
    unit: metric.unit ?? null,
    observed_at: metric.observedAt,
    tags: metric.tags ?? {},
    metadata: { raw: metric.raw ?? null },
  }));
  if (rows.length === 0) return 0;
  const { error } = await supabase.from("onchain_metrics").upsert(rows, {
    onConflict: "provider,metric,observed_at",
  });
  if (error) throw error;
  return rows.length;
}

async function processJob(
  job: SyncJob,
  supabase: SupabaseClient,
): Promise<SyncSummary> {
  const summary: SyncSummary = {
    chainId: job.chainId,
    address: job.address,
    balances: 0,
    activity: 0,
    metrics: 0,
    errors: [],
  };

  const sources = job.sources ?? inferSources(job.chainId);
  for (const source of sources) {
    try {
      const result = await handleSource(job, source, supabase);
      summary.balances += result.balances;
      summary.activity += result.activity;
    } catch (error) {
      summary.errors.push(
        `${source}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  for (const metric of ensureArray(job.metrics)) {
    if (metric.provider !== "glassnode") {
      summary.errors.push(`Unsupported metric provider ${metric.provider}`);
      continue;
    }
    try {
      const metrics = await fetchGlassnodeMetric(metric.metric, metric.options);
      summary.metrics += await persistMetrics(supabase, metrics);
    } catch (error) {
      summary.errors.push(
        `glassnode:${metric.metric}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return summary;
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders(req) });
  }
  if (req.method !== "POST") return methodNotAllowed(req);

  let body: SyncRequest;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON payload", undefined, req);
  }

  if (!body?.jobs || !Array.isArray(body.jobs) || body.jobs.length === 0) {
    return bad("jobs array required", undefined, req);
  }

  const supabase = createClient("service");
  const results: SyncSummary[] = [];
  for (const job of body.jobs) {
    if (!job?.chainId || !job?.address) {
      results.push({
        chainId: job?.chainId ?? "",
        address: job?.address ?? "",
        balances: 0,
        activity: 0,
        metrics: 0,
        errors: ["Missing chainId or address"],
      });
      continue;
    }
    results.push(await processJob(job, supabase));
  }

  return ok({ results }, req);
});

export default handler;
