import { registerHandler } from "../_shared/serve.ts";
import { bad, corsHeaders, mna, ok, oops } from "../_shared/http.ts";
import { createClient } from "../_shared/client.ts";
import { optionalEnv } from "../_shared/env.ts";
import { fetchTonUsdRate } from "../_shared/pricing.ts";
import { TonIndexClient } from "../_shared/ton-index.ts";
import {
  DynamicWalletEngine,
  WalletAccount,
  WalletBalance,
} from "../_shared/ton-wallet-engine.ts";
import { normaliseTonAddress } from "../_shared/ton-address.ts";

interface WalletConfigInput {
  address: string;
  owner: string;
  riskTier?: "conservative" | "standard" | "aggressive";
  tags?: string[];
}

interface SnapshotRequestBody {
  observedAt?: string;
}

interface SummaryRecord {
  wallet_address: string;
  owner: string;
  risk_tier: string;
  tags: string[];
  total_value_usd: number;
  available_value_usd: number;
  buffer_ratio: number;
  diversification_score: number;
  exposures: unknown;
  actions: unknown;
  alerts: string[];
  account_state: unknown;
  price_map: Record<string, number>;
  observed_at: string;
  ton_price_source: string | null;
  ton_price_usd: number | null;
}

function parseWalletConfig(raw: string | null): WalletConfigInput[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `TON_TREASURY_WALLETS is not valid JSON: ${error.message}`
        : "TON_TREASURY_WALLETS is not valid JSON",
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error("TON_TREASURY_WALLETS must be an array of wallet configs");
  }
  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`wallet config at index ${index} must be an object`);
    }
    const { address, owner, riskTier, tags } = entry as Record<string, unknown>;
    if (typeof address !== "string" || typeof owner !== "string") {
      throw new Error(
        `wallet config at index ${index} missing address or owner`,
      );
    }
    if (riskTier && typeof riskTier !== "string") {
      throw new Error(`wallet config at index ${index} has invalid riskTier`);
    }
    if (tags && !Array.isArray(tags)) {
      throw new Error(`wallet config at index ${index} has invalid tags`);
    }
    return {
      address,
      owner,
      riskTier: riskTier as WalletConfigInput["riskTier"],
      tags: tags as string[] | undefined,
    };
  });
}

function parseExposureLimits(raw: string | null): Record<string, number> {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `TON_WALLET_EXPOSURE_LIMITS invalid JSON: ${error.message}`
        : "TON_WALLET_EXPOSURE_LIMITS invalid JSON",
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("TON_WALLET_EXPOSURE_LIMITS must be a JSON object");
  }
  const limits: Record<string, number> = {};
  for (const [asset, value] of Object.entries(parsed)) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw new Error(`Exposure limit for ${asset} is not a number`);
    }
    limits[asset] = numeric;
  }
  return limits;
}

function toSummaryRecord(
  summary: ReturnType<DynamicWalletEngine["evaluateWallet"]>,
  accountState: unknown,
  priceMap: Record<string, number>,
  observedAt: string,
  priceSource: string | null,
  tonPrice: number | null,
): SummaryRecord {
  return {
    wallet_address: summary.account.address,
    owner: summary.account.owner,
    risk_tier: summary.account.riskTier,
    tags: summary.account.tags,
    total_value_usd: summary.totalValueUsd,
    available_value_usd: summary.availableValueUsd,
    buffer_ratio: summary.bufferRatio,
    diversification_score: summary.diversificationScore,
    exposures: summary.exposures.map((exposure) => ({
      asset: exposure.asset,
      balance_total: exposure.balanceTotal,
      balance_available: exposure.balanceAvailable,
      balance_locked: exposure.balanceLocked,
      usd_value: exposure.usdValue,
      share: exposure.share,
      utilisation: exposure.utilisation,
    })),
    actions: summary.actions.map((action) => ({
      category: action.category,
      description: action.description,
      priority: action.priority,
      metadata: action.metadata ?? {},
    })),
    alerts: summary.alerts.slice(),
    account_state: accountState,
    price_map: priceMap,
    observed_at: observedAt,
    ton_price_source: priceSource,
    ton_price_usd: tonPrice,
  };
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") return mna();

  const walletEnv = optionalEnv("TON_TREASURY_WALLETS");
  let walletConfigs: WalletConfigInput[];
  try {
    walletConfigs = parseWalletConfig(walletEnv ?? null);
  } catch (error) {
    return bad(
      error instanceof Error ? error.message : "Invalid wallet config",
      undefined,
      req,
    );
  }
  if (walletConfigs.length === 0) {
    return bad("No treasury wallets configured", undefined, req);
  }

  let body: SnapshotRequestBody | null = null;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      body = await req.json();
    } catch (error) {
      return bad(
        error instanceof Error ? error.message : "Invalid JSON",
        undefined,
        req,
      );
    }
  }

  const observedAt = body?.observedAt ?? new Date().toISOString();
  const exposureLimitsEnv = optionalEnv("TON_WALLET_EXPOSURE_LIMITS");
  let exposureLimits: Record<string, number>;
  try {
    exposureLimits = parseExposureLimits(exposureLimitsEnv ?? null);
  } catch (error) {
    return bad(
      error instanceof Error ? error.message : "Invalid exposure limits",
      undefined,
      req,
    );
  }

  const baseBuffer = optionalEnv("TON_WALLET_BASE_BUFFER_TARGET");
  const engine = new DynamicWalletEngine({
    exposureLimits,
    baseBufferTarget: baseBuffer ? Number(baseBuffer) : undefined,
  });

  const addressMap = new Map<string, WalletConfigInput>();
  for (const config of walletConfigs) {
    const { raw } = normaliseTonAddress(config.address);
    const account = new WalletAccount({
      address: raw,
      owner: config.owner,
      riskTier: config.riskTier,
      tags: config.tags,
    });
    engine.registerAccount(account);
    addressMap.set(account.address, config);
  }

  const indexClient = new TonIndexClient({
    baseUrl: optionalEnv("TON_INDEX_BASE_URL") ?? undefined,
    apiKey: optionalEnv("TON_INDEX_API_KEY") ?? undefined,
  });

  const accountStates = await indexClient.getAccountStates(
    Array.from(addressMap.keys()),
  );

  const tonRate = await fetchTonUsdRate();
  const tonPrice = tonRate.rate ?? null;
  const priceMap: Record<string, number> = {};
  if (tonPrice && tonPrice > 0) {
    priceMap["TON"] = tonPrice;
  }

  const supabase = createClient("service");

  const summaryRecords: SummaryRecord[] = [];
  const alertRecords: Array<
    { wallet_address: string; alert: string; observed_at: string }
  > = [];

  for (const state of accountStates) {
    const config = addressMap.get(state.address.toUpperCase());
    if (!config) continue;
    const balances: WalletBalance[] = [];
    balances.push(
      new WalletBalance({
        asset: "TON",
        total: state.balance / 1_000_000_000,
        metadata: {
          raw_balance: state.balance,
          status: state.status,
        },
      }),
    );
    engine.ingestBalances(state.address, balances);
    const summary = engine.evaluateWallet(state.address, priceMap);
    const record = toSummaryRecord(
      summary,
      state,
      priceMap,
      observedAt,
      tonRate.source ?? null,
      tonPrice,
    );
    summaryRecords.push(record);
    for (const alert of summary.alerts) {
      alertRecords.push({
        wallet_address: summary.account.address,
        alert,
        observed_at: observedAt,
      });
    }
  }

  if (summaryRecords.length === 0) {
    return bad("No wallet states returned by TON index", undefined, req);
  }

  const { error: summaryError } = await supabase
    .from("ton_wallet_summaries")
    .upsert(summaryRecords, { onConflict: "wallet_address,observed_at" });

  if (summaryError) {
    console.error("ton-wallet-snapshot upsert error", summaryError);
    return oops(
      "Failed to persist wallet summaries",
      summaryError.message,
      req,
    );
  }

  if (alertRecords.length > 0) {
    const { error: alertsError } = await supabase
      .from("ton_wallet_alerts")
      .upsert(alertRecords, { onConflict: "wallet_address,alert,observed_at" });
    if (alertsError) {
      console.error("ton-wallet-snapshot alerts error", alertsError);
    }
  }

  return ok({
    ok: true,
    walletsProcessed: summaryRecords.length,
    observedAt,
    tonPriceUsd: tonPrice,
    tonPriceSource: tonRate.source,
  }, req);
});

export default handler;
