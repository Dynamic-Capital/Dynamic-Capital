import { createClient } from "../_shared/client.ts";
import { maybe } from "../_shared/env.ts";
import {
  bad,
  corsHeaders,
  methodNotAllowed,
  ok,
  oops,
} from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";
import { ensureEcosystemUser } from "../_shared/ecosystem.ts";

const supabase = createClient("service");

const NANO_IN_TON = 1_000_000_000;
const DEFAULT_TOLERANCE_TON = Number(maybe("TON_AMOUNT_TOLERANCE")) || 0.05;

interface VerifyPaymentRequest {
  txHash?: unknown;
  tx_hash?: unknown;
  wallet?: unknown;
  amountTon?: unknown;
  amount_ton?: unknown;
  amount?: unknown;
  userId?: unknown;
  authUserId?: unknown;
  email?: unknown;
  role?: unknown;
  dctBalance?: unknown;
  metadata?: Record<string, unknown> | null;
}

interface VerificationSuccess {
  ok: true;
  source: string;
  amountTon: number | null;
  metadata: Record<string, unknown> | null;
}

interface VerificationFailure {
  ok: false;
  error: string;
  detail?: unknown;
}

type VerificationResult = VerificationSuccess | VerificationFailure;

function sanitizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeHash(value: unknown): string | null {
  const raw = sanitizeString(value);
  if (!raw) return null;
  if (raw.length < 16) return null;
  return raw.toLowerCase();
}

function normalizeWallet(value: unknown): string | null {
  return sanitizeString(value);
}

function normalizeAmount(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return null;
  return num;
}

function nanosToTon(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return value / NANO_IN_TON;
}

function collectAddresses(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const seen = new Set<string>();
  const record = payload as Record<string, unknown>;

  const push = (value: unknown) => {
    const addr = sanitizeString(value);
    if (addr) {
      seen.add(addr.toLowerCase());
    }
  };

  if (record.account && typeof record.account === "object") {
    push((record.account as Record<string, unknown>).address);
    push((record.account as Record<string, unknown>).wallet);
  }
  if (record.in_msg && typeof record.in_msg === "object") {
    const msg = record.in_msg as Record<string, unknown>;
    push(msg.source);
    push(msg.sender);
    push(msg.destination);
  }
  if (Array.isArray(record.out_msgs)) {
    for (const entry of record.out_msgs) {
      if (entry && typeof entry === "object") {
        const msg = entry as Record<string, unknown>;
        push(msg.destination);
        push(msg.source);
      }
    }
  }
  if (Array.isArray(record.actions)) {
    for (const action of record.actions) {
      if (action && typeof action === "object") {
        const meta = action as Record<string, unknown>;
        push(meta.address);
        if (meta.payload && typeof meta.payload === "object") {
          push((meta.payload as Record<string, unknown>).destination);
        }
      }
    }
  }

  return [...seen];
}

function collectTonValues(payload: unknown): number[] {
  if (!payload || typeof payload !== "object") return [];
  const amounts: number[] = [];
  const push = (value: unknown) => {
    const parsed = normalizeAmount(value);
    if (parsed !== null) amounts.push(parsed);
  };

  const record = payload as Record<string, unknown>;
  push(record.amount);
  push(record.value);

  if (record.in_msg && typeof record.in_msg === "object") {
    const msg = record.in_msg as Record<string, unknown>;
    push(msg.value);
    push(msg.amount);
  }

  if (Array.isArray(record.out_msgs)) {
    for (const entry of record.out_msgs) {
      if (entry && typeof entry === "object") {
        const msg = entry as Record<string, unknown>;
        push(msg.value);
        push(msg.amount);
      }
    }
  }

  return amounts
    .filter((value) => Number.isFinite(value))
    .map((value) => nanosToTon(value) ?? value)
    .filter((value): value is number => Number.isFinite(value));
}

function amountsClose(a: number, b: number, tolerance = DEFAULT_TOLERANCE_TON) {
  return Math.abs(a - b) <= tolerance;
}

async function verifyViaExternalService(
  txHash: string,
  wallet: string,
  amountTon: number | null,
): Promise<VerificationResult | null> {
  const verifierUrl = maybe("TON_VERIFIER_URL");
  if (!verifierUrl) return null;

  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    const token = maybe("TON_VERIFIER_TOKEN");
    if (token) {
      headers.Authorization = token.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;
    }

    const response = await fetch(verifierUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ txHash, wallet, amountTon }),
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        error: "EXTERNAL_VERIFIER_HTTP_ERROR",
        detail: { status: response.status, body: text },
      };
    }

    const payload = await response.json();
    if (payload?.verified === true) {
      const resolved = typeof payload?.amountTon === "number"
        ? payload.amountTon
        : amountTon;
      return {
        ok: true,
        source: payload?.source ?? "external",
        amountTon: resolved ?? null,
        metadata: payload?.metadata ?? payload ?? null,
      };
    }

    if (payload?.verdict === "unknown" || payload?.verified === null) {
      return null; // fall back to tonapi verification
    }

    return {
      ok: false,
      error: payload?.error ?? "TRANSACTION_NOT_VERIFIED",
      detail: payload,
    };
  } catch (error) {
    console.error("External TON verifier failure", error);
    return {
      ok: false,
      error: "EXTERNAL_VERIFIER_ERROR",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function verifyViaTonApi(
  txHash: string,
  wallet: string,
  amountTon: number | null,
): Promise<VerificationResult> {
  const baseUrl = maybe("TON_TRANSACTION_API") ??
    "https://tonapi.io/v2/blockchain/transactions";
  const apiKey = maybe("TON_API_KEY") ?? maybe("TON_API_TOKEN");
  const endpoint = baseUrl.includes("{txHash}")
    ? baseUrl.replace("{txHash}", encodeURIComponent(txHash))
    : `${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(txHash)}`;

  const headers = new Headers({ accept: "application/json" });
  if (apiKey) {
    headers.set(
      "Authorization",
      apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`,
    );
  }

  const response = await fetch(endpoint, { headers });
  if (!response.ok) {
    const text = await response.text();
    return {
      ok: false,
      error: "TON_LOOKUP_FAILED",
      detail: { status: response.status, body: text },
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    return {
      ok: false,
      error: "TON_LOOKUP_PARSE_ERROR",
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  const addresses = collectAddresses(payload);
  if (addresses.length > 0 && !addresses.includes(wallet.toLowerCase())) {
    return {
      ok: false,
      error: "WALLET_MISMATCH",
      detail: { wallet, addresses },
    };
  }

  const values = collectTonValues(payload);
  if (amountTon !== null && amountTon !== undefined && values.length > 0) {
    const matched = values.find((value) => amountsClose(value, amountTon));
    if (matched === undefined) {
      return {
        ok: false,
        error: "AMOUNT_MISMATCH",
        detail: { expected: amountTon, observed: values },
      };
    }
  }

  return {
    ok: true,
    source: "tonapi",
    amountTon: amountTon ?? values[0] ?? null,
    metadata: {
      addresses,
      values,
    },
  };
}

async function verifyTransaction(
  txHash: string,
  wallet: string,
  amountTon: number | null,
): Promise<VerificationResult> {
  const external = await verifyViaExternalService(txHash, wallet, amountTon);
  if (external) {
    if (external.ok) return external;
    if (external.error !== "TRANSACTION_NOT_VERIFIED") {
      return external;
    }
    console.warn(
      "External verifier rejected transaction, falling back to tonapi",
      {
        error: external.error,
        detail: external.detail,
      },
    );
  }

  return await verifyViaTonApi(txHash, wallet, amountTon);
}

export const handler = registerHandler(async (req) => {
  const url = new URL(req.url);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  if (req.method === "GET" && url.pathname.endsWith("/version")) {
    return ok({ name: "verify-payment", ts: new Date().toISOString() }, req);
  }

  if (req.method !== "POST") {
    return methodNotAllowed(req);
  }

  let body: VerifyPaymentRequest;
  try {
    body = await req.json() as VerifyPaymentRequest;
  } catch {
    return bad("INVALID_JSON", null, req);
  }

  const txHash = normalizeHash(body.txHash ?? body.tx_hash);
  const wallet = normalizeWallet(body.wallet);
  const amountTon = normalizeAmount(
    body.amountTon ?? body.amount_ton ?? body.amount,
  );

  if (!txHash) {
    return bad("MISSING_TX_HASH", null, req);
  }
  if (!wallet) {
    return bad("MISSING_WALLET", null, req);
  }

  try {
    const verification = await verifyTransaction(txHash, wallet, amountTon);
    if (!verification.ok) {
      return bad(verification.error, verification.detail, req);
    }

    let userId: string | null = null;
    try {
      const user = await ensureEcosystemUser(supabase, {
        userId: body.userId as string | undefined,
        authUserId: body.authUserId as string | undefined,
        wallet,
        email: body.email as string | undefined,
        role: body.role as string | undefined,
        dctBalance: body.dctBalance as number | string | undefined,
        metadata: body.metadata ?? null,
      });
      userId = user.id;
    } catch (error) {
      console.error("Failed to ensure ecosystem user", error);
    }

    const upsertPayload: Record<string, unknown> = {
      tx_hash: txHash,
      wallet,
      verified: true,
      verified_at: new Date().toISOString(),
      verification_source: verification.source,
      verification_metadata: verification.metadata ?? null,
    };

    if (amountTon !== null && amountTon !== undefined) {
      upsertPayload.amount_ton = amountTon;
    }
    if (userId) {
      upsertPayload.ecosystem_user_id = userId;
    }

    const { data: payment, error } = await supabase
      .from("payments")
      .upsert(upsertPayload, { onConflict: "tx_hash" })
      .select("id, ecosystem_user_id, verified, verified_at")
      .maybeSingle();

    if (error) {
      console.error("Failed to persist payment verification", error.message);
      return oops("PAYMENT_PERSISTENCE_FAILED", error.message, req);
    }

    return ok({
      paymentId: payment?.id ?? null,
      userId: payment?.ecosystem_user_id ?? userId,
      verified: payment?.verified ?? true,
      verifiedAt: payment?.verified_at ?? new Date().toISOString(),
      amountTon: amountTon ?? verification.amountTon,
      source: verification.source,
    }, req);
  } catch (error) {
    console.error("verify-payment error", error);
    return oops(
      "VERIFY_PAYMENT_FAILED",
      error instanceof Error ? error.message : String(error),
      req,
    );
  }
});

export default handler;

if (import.meta.main) {
  Deno.serve(handler);
}
