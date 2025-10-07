import { registerHandler } from "../_shared/serve.ts";
import { bad, corsHeaders, mna, ok, oops, unauth } from "../_shared/http.ts";
import { createClient } from "../_shared/client.ts";
import { need, optionalEnv } from "../_shared/env.ts";
import { normalizeAllocatorInvestorKey } from "../_shared/private-pool.ts";
import {
  TonIndexClient,
  type TonTransactionPayload,
} from "../_shared/ton-index.ts";
import { normaliseTonAddress } from "../_shared/ton-address.ts";

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

function extractBlockSeqno(proof: ProofPayload): number | null {
  if (!proof.blockId) return null;
  const parts = proof.blockId.split(":");
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (!part) continue;
    const decimal = Number(part);
    if (Number.isInteger(decimal) && decimal >= 0) {
      return decimal;
    }
    const hex = Number.parseInt(part, 16);
    if (!Number.isNaN(hex) && hex >= 0) {
      return hex;
    }
  }
  return null;
}

function deriveTonAmount(payload: TonTransactionPayload): number | null {
  const candidates: Array<number | null | undefined> = [
    payload.amountTon,
    payload.amount,
    payload.value,
    payload.in_msg?.value,
    ...(payload.out_msgs ?? []).map((msg) => msg.value ?? null),
  ];
  for (const candidate of candidates) {
    if (candidate == null) continue;
    const numeric = Number(candidate);
    if (!Number.isFinite(numeric) || numeric <= 0) continue;
    const ton = numeric > 1_000_000 ? numeric / 1_000_000_000 : numeric;
    if (Number.isFinite(ton) && ton > 0) {
      return ton;
    }
  }
  return null;
}

function collectAddresses(payload: TonTransactionPayload): string[] {
  const addresses: string[] = [];
  const push = (value?: string | null) => {
    if (!value) return;
    try {
      const normalised = normaliseTonAddress(value).raw.toUpperCase();
      if (!addresses.includes(normalised)) {
        addresses.push(normalised);
      }
    } catch {
      // ignore addresses we cannot normalise
    }
  };
  push(payload.account?.address ?? null);
  push(payload.in_msg?.source ?? null);
  push(payload.in_msg?.destination ?? null);
  for (const msg of payload.out_msgs ?? []) {
    push(msg.source ?? null);
    push(msg.destination ?? null);
  }
  return addresses;
}

async function verifyOnChainEvent(
  event: Required<AllocatorEvent>,
  proof: ProofPayload,
  client: TonIndexClient,
): Promise<
  | {
    ok: true;
    details: {
      amountTon: number;
      blockSeqno: number | null;
      investorAddress: string;
      timestamp: string | null;
    };
  }
  | { ok: false; error: string; hint?: string }
> {
  let transaction: TonTransactionPayload;
  try {
    transaction = await client.getTransaction(event.tonTxHash);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Failed to query TON index";
    return {
      ok: false as const,
      error: "Unable to fetch transaction",
      hint: message,
    };
  }

  const expectedInvestor = normaliseTonAddress(event.investorKey).raw
    .toUpperCase();
  const addresses = collectAddresses(transaction);
  if (!addresses.includes(expectedInvestor)) {
    return {
      ok: false as const,
      error: "Transaction does not involve the investor wallet",
    };
  }

  const amountTon = deriveTonAmount(transaction);
  if (!amountTon) {
    return {
      ok: false as const,
      error: "Unable to determine TON amount from transaction",
    };
  }
  const expectedTon = event.usdtAmount / event.fxRate;
  const tolerance = Math.max(0.05, expectedTon * 0.02);
  if (amountTon + tolerance < expectedTon) {
    return {
      ok: false as const,
      error: "On-chain TON amount is below expected threshold",
    };
  }

  const proofSeqno = extractBlockSeqno(proof);
  const blockSeqno = transaction.mc_block_seqno ?? proofSeqno ?? null;
  if (
    transaction.mc_block_seqno != null &&
    proofSeqno != null &&
    transaction.mc_block_seqno !== proofSeqno
  ) {
    return {
      ok: false as const,
      error: "Proof block ID does not match transaction sequence",
    };
  }

  const timestampCandidate = transaction.now ?? transaction.utime ?? null;
  let timestampIso: string | null = null;
  if (timestampCandidate != null) {
    const numeric = Number(timestampCandidate);
    if (Number.isFinite(numeric)) {
      const millis = numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
      timestampIso = new Date(millis).toISOString();
    }
  }

  return {
    ok: true as const,
    details: {
      amountTon,
      blockSeqno,
      investorAddress: expectedInvestor,
      timestamp: timestampIso,
    },
  };
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

  const indexClient = new TonIndexClient({
    baseUrl: optionalEnv("TON_ALLOCATOR_INDEX_URL") ??
      optionalEnv("TON_INDEX_BASE_URL") ??
      undefined,
    apiKey: optionalEnv("TON_INDEX_API_KEY") ?? undefined,
  });

  const verification = await verifyOnChainEvent(
    normalized,
    parsed.proof,
    indexClient,
  );
  if (!verification.ok) {
    const hint = "hint" in verification ? verification.hint : undefined;
    return bad(verification.error, hint, req);
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
    on_chain_investor: verification.details.investorAddress,
    on_chain_amount_ton: verification.details.amountTon,
    on_chain_block_seqno: verification.details.blockSeqno,
    on_chain_timestamp: verification.details.timestamp,
    verification_error: null,
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
