import { registerHandler } from "../_shared/serve.ts";
import { bad, corsHeaders, mna, ok, oops, unauth } from "../_shared/http.ts";
import { createClient } from "../_shared/client.ts";
import { need } from "../_shared/env.ts";
import { normalizeAllocatorInvestorKey } from "../_shared/private-pool.ts";
import {
  decimalToScaledBigInt,
  extractJettonMintSummary,
  type TonEventPayload,
} from "./tonapi.ts";

interface AllocatorEvent {
  depositId: string;
  investorKey: string;
  usdtAmount: number;
  dctAmount: number;
  fxRate: number;
  tonTxHash: string;
  valuationUsdt?: number;
}

interface ProofPayload {
  blockId: string;
  shardProof: string;
  signature: string;
  routerTxHash?: string;
}

interface WebhookBody {
  event?: AllocatorEvent;
  proof?: ProofPayload;
  observedAt?: string;
  tonEvent?: TonEventPayload | null;
}

type SupabaseServiceClient = ReturnType<typeof createClient>;

function getSupabaseServiceClient(): SupabaseServiceClient {
  const injected = (globalThis as {
    __SUPABASE_SERVICE_CLIENT__?: SupabaseServiceClient;
  }).__SUPABASE_SERVICE_CLIENT__;
  return injected ?? createClient("service");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, "");
  if (clean.length % 2 !== 0) throw new Error("hex length must be even");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    out[i / 2] = Number.parseInt(clean.slice(i, i + 2), 16);
  }
  return out;
}

async function verifySignature(
  secret: string,
  payload: string,
  signature: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const sigBytes = hexToBytes(signature);
  return await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(payload),
  );
}

function normalizeEvent(event: AllocatorEvent): Required<AllocatorEvent> {
  const { depositId, investorKey, usdtAmount, dctAmount, fxRate, tonTxHash } =
    event;
  if (!depositId || !investorKey || !tonTxHash) {
    throw new Error("Missing required identifiers");
  }
  if (!Number.isFinite(usdtAmount) || usdtAmount <= 0) {
    throw new Error("Invalid usdtAmount");
  }
  if (!Number.isFinite(dctAmount) || dctAmount <= 0) {
    throw new Error("Invalid dctAmount");
  }
  if (!Number.isFinite(fxRate) || fxRate <= 0) {
    throw new Error("Invalid fxRate");
  }
  const valuation = event.valuationUsdt ?? usdtAmount;
  return {
    depositId: String(depositId),
    investorKey: normalizeAllocatorInvestorKey(String(investorKey)),
    usdtAmount: Number(usdtAmount),
    dctAmount: Number(dctAmount),
    fxRate: Number(fxRate),
    tonTxHash: String(tonTxHash),
    valuationUsdt: Number(valuation),
  };
}

function normalizeTonHash(hash: string): string {
  return hash.replace(/^0x/i, "").toLowerCase();
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") return mna();

  const signature = req.headers.get("x-allocator-signature");
  if (!signature) return unauth("Missing signature", req);
  const secret = need("TON_ALLOCATOR_WEBHOOK_SECRET");
  const rawBody = await req.text();

  const verified = await verifySignature(secret, rawBody, signature).catch(
    (err) => {
      console.error("ton-allocator-webhook signature error", err);
      return false;
    },
  );
  if (!verified) {
    return unauth("Invalid signature", req);
  }

  let parsed: WebhookBody;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return bad("Bad JSON", undefined, req);
  }
  if (!parsed.event || !parsed.proof) {
    return bad("Missing event or proof", undefined, req);
  }

  let normalized: Required<AllocatorEvent>;
  try {
    normalized = normalizeEvent(parsed.event);
  } catch (err) {
    return bad(
      err instanceof Error ? err.message : "Invalid event",
      undefined,
      req,
    );
  }

  const tonEventSummary = extractJettonMintSummary(parsed.tonEvent);
  if (tonEventSummary) {
    try {
      const expectedRaw = decimalToScaledBigInt(
        normalized.dctAmount,
        tonEventSummary.decimals,
      );
      if (expectedRaw !== tonEventSummary.amountRaw) {
        return bad("TON event mint mismatch", undefined, req);
      }
    } catch {
      return bad("Invalid TON event mint data", undefined, req);
    }
    const expectedHash = normalizeTonHash(normalized.tonTxHash);
    const matchesTxHash = tonEventSummary.txHashes.some((hash) =>
      normalizeTonHash(hash) === expectedHash
    );
    if (!matchesTxHash) {
      return bad("TON event transaction mismatch", undefined, req);
    }
  }

  const supabase = getSupabaseServiceClient();
  const now = new Date().toISOString();

  const insertPayload = {
    deposit_id: normalized.depositId,
    investor_key: normalized.investorKey,
    ton_tx_hash: normalized.tonTxHash,
    usdt_amount: normalized.usdtAmount,
    dct_amount: normalized.dctAmount,
    fx_rate: normalized.fxRate,
    valuation_usdt: normalized.valuationUsdt,
    proof_payload: parsed.proof,
    event_payload: parsed.event,
    observed_at: parsed.observedAt ?? now,
    verified_at: now,
  };

  const { data, error } = await supabase
    .from("ton_pool_events")
    .insert(insertPayload)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return ok({ ok: true, duplicate: true }, req);
    }
    console.error("ton-allocator-webhook insert error", error);
    return oops("Failed to persist event", error.message, req);
  }

  if (data?.id) {
    try {
      await supabase.rpc("notify_ton_pool_event", { p_event_id: data.id });
    } catch (notifyError) {
      console.error("notify_ton_pool_event error", notifyError);
    }
  }

  return ok({ ok: true, eventId: data?.id ?? null }, req);
});

export default handler;
