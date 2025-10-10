import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Cell, loadStateInit } from "https://esm.sh/@ton/core@0.62.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nacl from "https://esm.sh/tweetnacl@1.0.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
type SupabaseClient = typeof supabase;

interface Dependencies {
  supabase: SupabaseClient;
}

const defaultDeps: Dependencies = { supabase };

const DEFAULT_PROOF_DOMAIN = "dynamiccapital.ton";
const TON_PROOF_DOMAIN = (() => {
  const raw = Deno.env.get("TON_PROOF_DOMAIN")?.trim();
  if (!raw) return [DEFAULT_PROOF_DOMAIN];
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
})();

const PROOF_MAX_AGE_SECONDS = (() => {
  const raw = Deno.env.get("TON_PROOF_MAX_AGE_SECONDS")?.trim();
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 300;
})();

const SESSION_EXPIRY_BUFFER_SECONDS = 10;

function jsonResponse(
  body: Record<string, unknown>,
  init?: ResponseInit,
): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...corsHeaders,
      ...init?.headers,
    },
  });
}

function badRequest(message: string): Response {
  return jsonResponse({ error: message }, { status: 400 });
}

function unauthorized(message: string): Response {
  return jsonResponse({ error: message }, { status: 401 });
}

function forbidden(message: string): Response {
  return jsonResponse({ error: message }, { status: 403 });
}

function internal(message: string): Response {
  return jsonResponse({ error: message }, { status: 500 });
}

type TonProofDomain = {
  lengthBytes: number;
  value: string;
};

type TonProofPayload = {
  timestamp: number;
  domain: TonProofDomain;
  payload: string;
  signature: string;
};

type ChallengeRequestBody = {
  action: "challenge";
  telegram_id: string;
};

type VerifyRequestBody = {
  action: "verify";
  telegram_id: string;
  address: string;
  publicKey?: string | null;
  walletStateInit?: string | null;
  walletAppName?: string | null;
  proof?: TonProofPayload | null;
};

type TonConnectSessionRow = {
  id: string;
  telegram_id: string;
  payload: string;
  expires_at: string;
  verified_at: string | null;
  wallet_address: string | null;
  wallet_public_key: string | null;
  proof_timestamp: string | null;
  wallet_app_name: string | null;
  proof_signature: string | null;
};

function toBase64Url(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function randomPayload(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

function sanitizeTelegramId(raw: string): string {
  return String(raw ?? "").trim();
}

function sanitizeAddress(raw: string): string {
  return raw.trim();
}

function parseRawAddress(value: string): {
  workchain: number;
  hash: Uint8Array;
} {
  const trimmed = value.trim();
  const [wcRaw, hashRaw] = trimmed.split(":");
  if (wcRaw === undefined || hashRaw === undefined) {
    throw new Error("Address must be in <wc>:<hash> format");
  }
  const workchain = Number(wcRaw);
  if (!Number.isInteger(workchain)) {
    throw new Error("Invalid workchain value");
  }
  const hashHex = hashRaw.trim().toLowerCase();
  if (hashHex.length !== 64) {
    throw new Error("Address hash must contain 64 hex characters");
  }
  const hash = hexToBytes(hashHex);
  if (hash.length !== 32) {
    throw new Error("Address hash must decode to 32 bytes");
  }
  return { workchain, hash };
}

function hexToBytes(value: string): Uint8Array {
  if (value.length % 2 !== 0) {
    throw new Error("Hex value length must be even");
  }
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < value.length; i += 2) {
    const byte = Number.parseInt(value.slice(i, i + 2), 16);
    if (!Number.isFinite(byte)) {
      throw new Error("Invalid hex value");
    }
    bytes[i / 2] = byte;
  }
  return bytes;
}

function decodeBase64(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function derivePublicKeyFromStateInit(stateInitRaw: string): Uint8Array | null {
  const trimmed = stateInitRaw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const root = Cell.fromBase64(trimmed);
    const stateInit = loadStateInit(root.beginParse());
    const dataCell = stateInit.data;
    if (!dataCell) {
      return null;
    }

    const extract = (candidate: typeof dataCell): Uint8Array | null => {
      const inspectSlice = candidate.beginParse();

      const readWithOffsets = () => {
        try {
          const slice = inspectSlice.clone(true);
          if (slice.remainingBits >= 64) {
            slice.loadUint(32);
            slice.loadUint(32);
          }
          if (slice.remainingBits >= 256) {
            const key = slice.loadBuffer(32);
            return new Uint8Array(key);
          }
        } catch {}
        return null;
      };

      const readRaw = () => {
        try {
          const slice = inspectSlice.clone(true);
          if (slice.remainingBits >= 256) {
            const key = slice.loadBuffer(32);
            return new Uint8Array(key);
          }
        } catch {}
        return null;
      };

      return readWithOffsets() ?? readRaw();
    };

    const candidates = [dataCell, ...dataCell.refs];
    for (const candidate of candidates) {
      const key = extract(candidate);
      if (key) {
        return key;
      }
      for (const ref of candidate.refs) {
        const nested = extract(ref);
        if (nested) {
          return nested;
        }
      }
    }

    return null;
  } catch (error) {
    console.error(
      "[ton-connect-session] Failed to derive public key from wallet state init",
      error,
    );
    return null;
  }
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

async function buildVerificationMessage(
  address: string,
  proof: TonProofPayload,
): Promise<Uint8Array> {
  const { workchain, hash } = parseRawAddress(address);
  const domainBytes = new TextEncoder().encode(proof.domain.value);
  const payloadBytes = new TextEncoder().encode(proof.payload);
  if (domainBytes.length !== proof.domain.lengthBytes) {
    throw new Error("Domain length mismatch");
  }

  const wcBuffer = new ArrayBuffer(4);
  new DataView(wcBuffer).setInt32(0, workchain, false);

  const domainLengthBuffer = new ArrayBuffer(4);
  new DataView(domainLengthBuffer).setUint32(0, proof.domain.lengthBytes, true);

  const timestampBuffer = new ArrayBuffer(8);
  const timestamp = BigInt(proof.timestamp);
  const timestampView = new DataView(timestampBuffer);
  timestampView.setBigUint64(0, timestamp, true);

  const prefix = new TextEncoder().encode("ton-proof-item-v2/");
  const message = concatBytes(
    prefix,
    new Uint8Array(wcBuffer),
    hash,
    new Uint8Array(domainLengthBuffer),
    domainBytes,
    new Uint8Array(timestampBuffer),
    payloadBytes,
  );

  const messageHash = await sha256(message);
  const envelope = concatBytes(
    new Uint8Array([0xff, 0xff]),
    new TextEncoder().encode("ton-connect"),
    messageHash,
  );

  return await sha256(envelope);
}

function isTonProofPayload(value: unknown): value is TonProofPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.timestamp !== "number") {
    return false;
  }
  if (!candidate.domain || typeof candidate.domain !== "object") {
    return false;
  }
  const domain = candidate.domain as Record<string, unknown>;
  if (typeof domain.value !== "string" || typeof domain.lengthBytes !== "number") {
    return false;
  }
  return typeof candidate.payload === "string" && typeof candidate.signature === "string";
}

async function handleChallenge(
  body: ChallengeRequestBody,
  deps: Dependencies,
): Promise<Response> {
  const telegramId = sanitizeTelegramId(body.telegram_id);
  if (!telegramId) {
    return badRequest("telegram_id is required");
  }

  const payload = randomPayload();
  const expiresAt = new Date(Date.now() + (PROOF_MAX_AGE_SECONDS + SESSION_EXPIRY_BUFFER_SECONDS) * 1000);

  await deps.supabase
    .from("ton_connect_sessions")
    .delete()
    .eq("telegram_id", telegramId)
    .lt("expires_at", new Date().toISOString())
    .is("verified_at", null);

  const { error } = await deps.supabase.from("ton_connect_sessions").insert({
    telegram_id: telegramId,
    payload,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error("[ton-connect-session] Failed to insert challenge", error);
    return internal("Unable to prepare TON proof challenge");
  }

  return jsonResponse({
    payload,
    expires_at: expiresAt.toISOString(),
  });
}

function isAllowedDomain(domain: string): boolean {
  return TON_PROOF_DOMAIN.some((allowed) => allowed === domain);
}

function ensureFreshTimestamp(timestamp: number): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return Math.abs(nowSeconds - timestamp) <= PROOF_MAX_AGE_SECONDS;
}

async function handleVerify(
  body: VerifyRequestBody,
  deps: Dependencies,
): Promise<Response> {
  const telegramId = sanitizeTelegramId(body.telegram_id);
  if (!telegramId) {
    return badRequest("telegram_id is required");
  }

  const address = sanitizeAddress(body.address ?? "");
  if (!address) {
    return badRequest("address is required");
  }

  if (!isTonProofPayload(body.proof)) {
    return badRequest("proof payload is malformed");
  }

  const proof = body.proof;
  if (!isAllowedDomain(proof.domain.value)) {
    return forbidden("Proof domain is not authorized");
  }

  if (!ensureFreshTimestamp(proof.timestamp)) {
    return unauthorized("Proof payload expired. Please reconnect your wallet.");
  }

  const signatureBytes = (() => {
    try {
      return decodeBase64(proof.signature);
    } catch {
      return null;
    }
  })();

  if (!signatureBytes) {
    return badRequest("Invalid proof signature encoding");
  }

  const rawPublicKey = (body.publicKey ?? "").trim();
  const walletStateInit = typeof body.walletStateInit === "string"
    ? body.walletStateInit.trim()
    : "";

  let publicKey: Uint8Array | null = null;
  let publicKeyHexLower: string | null = null;

  if (rawPublicKey) {
    try {
      publicKeyHexLower = rawPublicKey.toLowerCase();
      publicKey = hexToBytes(publicKeyHexLower);
    } catch (error) {
      console.error("[ton-connect-session] Invalid public key", error);
      return badRequest("Invalid wallet public key");
    }
  }

  if (!publicKey && walletStateInit) {
    const derivedKey = derivePublicKeyFromStateInit(walletStateInit);
    if (derivedKey) {
      publicKey = derivedKey;
      publicKeyHexLower = bytesToHex(derivedKey);
    }
  }

  if (!publicKey || !publicKeyHexLower) {
    return badRequest("Wallet public key is required for verification");
  }

  const { data: session, error: sessionError } = await deps.supabase
    .from("ton_connect_sessions")
    .select(
      "id, telegram_id, payload, expires_at, verified_at, wallet_address, wallet_public_key, proof_timestamp, wallet_app_name, proof_signature",
    )
    .eq("telegram_id", telegramId)
    .eq("payload", proof.payload)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<TonConnectSessionRow>();

  if (sessionError) {
    console.error("[ton-connect-session] Failed to load challenge", sessionError);
    return internal("Unable to verify proof session");
  }

  if (!session) {
    return unauthorized("Proof challenge not found. Please retry the connection.");
  }

  const expiresAt = Date.parse(session.expires_at);
  if (Number.isFinite(expiresAt) && expiresAt < Date.now()) {
    return unauthorized("Proof challenge expired. Please reconnect your wallet.");
  }

  let message: Uint8Array;
  try {
    message = await buildVerificationMessage(address, proof);
  } catch (error) {
    console.error("[ton-connect-session] Failed to build proof message", error);
    return badRequest("Unable to validate proof payload");
  }

  const valid = nacl.sign.detached.verify(message, signatureBytes, publicKey);
  if (!valid) {
    return unauthorized("Wallet signature does not match proof payload");
  }

  const { data: user, error: userError } = await deps.supabase
    .from("users")
    .upsert({ telegram_id: telegramId }, { onConflict: "telegram_id" })
    .select("id")
    .single<{ id: string }>();

  if (userError || !user) {
    console.error("[ton-connect-session] Failed to upsert user", userError);
    return internal("Unable to persist wallet owner");
  }

  const { data: walletOwner, error: walletLookupError } = await deps.supabase
    .from("wallets")
    .select("id,user_id")
    .eq("address", address)
    .maybeSingle<{ id: string; user_id: string }>();

  if (walletLookupError) {
    console.error("[ton-connect-session] Failed to lookup wallet", walletLookupError);
    return internal("Unable to validate wallet ownership");
  }

  if (walletOwner && walletOwner.user_id !== user.id) {
    return forbidden("This wallet is already linked to another user");
  }

  const { data: existingWallet, error: existingWalletError } = await deps.supabase
    .from("wallets")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();

  if (existingWalletError) {
    console.error("[ton-connect-session] Failed to fetch existing wallet", existingWalletError);
    return internal("Unable to load existing wallet link");
  }

  if (existingWallet?.id) {
    const { error: updateError } = await deps.supabase
      .from("wallets")
      .update({ address, public_key: publicKeyHexLower })
      .eq("id", existingWallet.id);

    if (updateError) {
      console.error("[ton-connect-session] Failed to update wallet", updateError);
      return internal("Unable to update linked wallet");
    }
  } else {
    const { error: insertError } = await deps.supabase
      .from("wallets")
      .insert({ user_id: user.id, address, public_key: publicKeyHexLower });

    if (insertError) {
      console.error("[ton-connect-session] Failed to insert wallet", insertError);
      return internal("Unable to link wallet");
    }
  }

  const proofTimestamp = new Date(proof.timestamp * 1000).toISOString();

  const { error: sessionUpdateError } = await deps.supabase
    .from("ton_connect_sessions")
    .update({
      verified_at: new Date().toISOString(),
      wallet_address: address,
      wallet_public_key: publicKeyHexLower,
      proof_timestamp: proofTimestamp,
      wallet_app_name: body.walletAppName ?? null,
      proof_signature: proof.signature,
    })
    .eq("id", session.id);

  if (sessionUpdateError) {
    console.error("[ton-connect-session] Failed to update session", sessionUpdateError);
  }

  return jsonResponse({
    ok: true,
    telegram_id: telegramId,
    address,
    proof_timestamp: proofTimestamp,
  });
}

export async function handler(
  req: Request,
  deps: Dependencies = defaultDeps,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    console.error("[ton-connect-session] Invalid JSON payload", error);
    return badRequest("Request payload must be valid JSON");
  }

  if (!body || typeof body !== "object") {
    return badRequest("Request body must be an object");
  }

  const action = (body as { action?: unknown }).action;
  if (action === "challenge") {
    return await handleChallenge(body as ChallengeRequestBody, deps);
  }

  if (action === "verify" || action === undefined) {
    return await handleVerify(body as VerifyRequestBody, deps);
  }

  return badRequest("Unsupported action");
}

if (import.meta.main) {
  serve((req) => handler(req));
}

export const __testUtils = {
  parseRawAddress,
  buildVerificationMessage,
  hexToBytes,
  decodeBase64,
};
