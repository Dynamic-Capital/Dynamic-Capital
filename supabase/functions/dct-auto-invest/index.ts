import { registerHandler } from "../_shared/serve.ts";
import { bad, corsHeaders, json, methodNotAllowed } from "../_shared/http.ts";
import { createClient } from "../_shared/client.ts";
import { need, optionalEnv } from "../_shared/env.ts";
import {
  roundTon,
  type SplitConfig,
  SubscriptionManager,
  SubscriptionManagerError,
  type VerifiedTonPayment,
} from "./subscription-manager.ts";

interface SubscriptionRequest {
  initData?: string;
  paymentId?: string;
  tonAmount: number;
  tonTxHash: string;
  plan: string;
  telegramId?: number;
  walletAddress: string;
  tonDomain?: string;
  splits?: Partial<SplitConfig>;
  nextRenewalAt?: string;
  metadata?: Record<string, unknown>;
}

interface SplitBounds {
  min: number;
  max: number;
}

const DEFAULT_SPLITS: SplitConfig = {
  operationsPct: 60,
  autoInvestPct: 30,
  buybackBurnPct: 10,
};

const SPLIT_BOUNDS: Record<keyof SplitConfig, SplitBounds> = {
  operationsPct: { min: 40, max: 75 },
  autoInvestPct: { min: 15, max: 45 },
  buybackBurnPct: { min: 5, max: 20 },
};

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeAddress(addr: string): string {
  return addr.trim().toLowerCase();
}

function validateSplits(
  partial: Partial<SplitConfig> | undefined,
): SplitConfig {
  const merged: SplitConfig = {
    operationsPct: partial?.operationsPct ?? DEFAULT_SPLITS.operationsPct,
    autoInvestPct: partial?.autoInvestPct ?? DEFAULT_SPLITS.autoInvestPct,
    buybackBurnPct: partial?.buybackBurnPct ?? DEFAULT_SPLITS.buybackBurnPct,
  };

  const sum = merged.operationsPct + merged.autoInvestPct +
    merged.buybackBurnPct;
  if (sum !== 100) {
    throw new Error("Split percentages must sum to 100");
  }

  for (
    const [key, bounds] of Object.entries(SPLIT_BOUNDS) as [
      keyof SplitConfig,
      SplitBounds,
    ][]
  ) {
    const value = merged[key];
    if (value < bounds.min || value > bounds.max) {
      throw new Error(`${key} must be between ${bounds.min} and ${bounds.max}`);
    }
  }

  return merged;
}

async function verifyTonPayment(
  txHash: string,
  expectedWallet: string,
  expectedAmount: number,
): Promise<VerifiedTonPayment> {
  const indexerUrl = optionalEnv("TON_INDEXER_URL");
  if (!indexerUrl) {
    return { ok: true, amountTon: expectedAmount };
  }

  const response = await fetch(
    `${indexerUrl.replace(/\/$/, "")}/transactions/${txHash}`,
  );
  if (!response.ok) {
    return { ok: false, error: `Indexer returned ${response.status}` };
  }

  const payload = await response.json();
  const destination: string | undefined = payload.destination ??
    payload.account?.address ??
    payload.in_msg?.destination ??
    payload.out_msg?.destination;
  if (!destination) {
    return { ok: false, error: "Indexer response missing destination" };
  }

  const normalizedDestination = normalizeAddress(String(destination));
  if (normalizedDestination !== normalizeAddress(expectedWallet)) {
    return { ok: false, error: "Funds not received by intake wallet" };
  }

  const amountCandidate = payload.amountTon ?? payload.amount ??
    payload.value ?? payload.coins ?? payload.in_msg?.value ?? 0;
  const amountNumeric = Number(amountCandidate);
  const amountTon = amountNumeric > 1_000_000
    ? amountNumeric / 1_000_000_000
    : amountNumeric;
  if (!Number.isFinite(amountTon) || amountTon <= 0) {
    return { ok: false, error: "Indexer response missing amount" };
  }

  if (amountTon + 1e-6 < expectedAmount) {
    return { ok: false, error: "TON amount less than expected" };
  }

  const blockTime: string | undefined = typeof payload.timestamp === "string"
    ? payload.timestamp
    : payload.utime
    ? new Date(Number(payload.utime) * 1000).toISOString()
    : undefined;

  return { ok: true, amountTon, blockTime };
}

async function notifyBot(message: Record<string, unknown>): Promise<void> {
  const botWebhook = optionalEnv("BOT_WEBHOOK_URL");
  if (!botWebhook) return;

  await fetch(botWebhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(message),
  });
}

export const handler = registerHandler(async (req) => {
  const baseCors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: baseCors });
  }

  if (req.method !== "POST") {
    return methodNotAllowed(req);
  }

  let body: SubscriptionRequest;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON payload", undefined, req);
  }

  if (!isNumber(body.tonAmount) || body.tonAmount <= 0) {
    return bad("tonAmount must be a positive number", undefined, req);
  }

  if (!body.tonTxHash || typeof body.tonTxHash !== "string") {
    return bad("tonTxHash is required", undefined, req);
  }

  if (!body.walletAddress || typeof body.walletAddress !== "string") {
    return bad("walletAddress is required", undefined, req);
  }

  if (!body.plan) {
    return bad("plan is required", undefined, req);
  }

  let splits: SplitConfig;
  try {
    splits = validateSplits(body.splits);
  } catch (error) {
    return bad(
      error instanceof Error ? error.message : "Invalid splits",
      undefined,
      req,
    );
  }

  const intakeWallet = need("INTAKE_WALLET");
  const operationsWallet = need("OPERATIONS_TREASURY_WALLET");
  const dctMaster = need("DCT_JETTON_MASTER");

  const verification = await verifyTonPayment(
    body.tonTxHash,
    intakeWallet,
    body.tonAmount,
  );

  if (!verification.ok) {
    return bad(verification.error, undefined, req);
  }

  const tonAmount = roundTon(body.tonAmount);
  const operationsTon = roundTon((tonAmount * splits.operationsPct) / 100);
  const autoInvestTon = roundTon((tonAmount * splits.autoInvestPct) / 100);
  const burnTon = roundTon(tonAmount - operationsTon - autoInvestTon);

  const supabase = createClient("service");
  const manager = new SubscriptionManager({ supabase });

  let receipt;
  try {
    receipt = await manager.payFor(
      {
        telegramId: body.telegramId ?? null,
        walletAddress: body.walletAddress,
        tonDomain: body.tonDomain ?? null,
        metadata: body.metadata ?? null,
      },
      {
        plan: body.plan,
        tonTxHash: body.tonTxHash,
        tonAmount,
        operationsTon,
        autoInvestTon,
        burnTon,
        splits,
        verification,
        operationsWallet,
        dctMaster,
        nextRenewalAt: body.nextRenewalAt ?? null,
        paymentId: body.paymentId ?? null,
      },
    );
  } catch (error) {
    if (error instanceof SubscriptionManagerError) {
      return bad(error.message, undefined, req);
    }
    return bad("Subscription processing failed", undefined, req);
  }

  const responsePayload = {
    ok: true,
    data: receipt,
  };

  await notifyBot({
    type: "dct.subscription.processed",
    payload: responsePayload.data,
  }).catch(() => undefined);

  return json(responsePayload, 200, {}, req);
});

export default handler;
