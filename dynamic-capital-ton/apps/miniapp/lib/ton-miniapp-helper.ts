import { Cell } from "@ton/core";
import { Buffer } from "buffer";

export const PLAN_IDS = [
  "vip_bronze",
  "vip_silver",
  "vip_gold",
  "mentorship",
] as const;

export type Plan = (typeof PLAN_IDS)[number];

export function isSupportedPlan(value: unknown): value is Plan {
  return typeof value === "string" && PLAN_IDS.includes(value as Plan);
}

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type TonWalletAccount = {
  address?: string | null;
  publicKey?: string | null;
  walletStateInit?: string | null;
};

export type TonProofDomain = {
  lengthBytes: number;
  value: string;
};

export type TonProofPayload = {
  timestamp: number;
  domain: TonProofDomain;
  payload: string;
  signature: string;
};

export type TonProofChallenge = {
  payload: string;
  expires_at: string;
};

type ApiResult = { ok: true } | { ok: false; error: string; status?: number };

type LinkWalletParams = {
  telegramId: string;
  wallet: TonWalletAccount;
  proof: TonProofPayload | null;
  walletAppName?: string | null;
  fetcher?: FetchLike;
};

type ProcessSubscriptionParams = {
  telegramId: string;
  plan: Plan;
  txHash: string;
  fetcher?: FetchLike;
};

const FALLBACK_ERROR_LINK =
  "Unable to link your wallet right now. Please retry in a few moments.";
const FALLBACK_ERROR_SUBSCRIPTION =
  "We couldn't start the subscription. Give it another try after checking your connection.";

const defaultFetch: FetchLike = (input, init) => fetch(input, init);

function sanitiseTelegramId(raw: string): string {
  return String(raw ?? "").trim();
}

function sanitiseHash(raw: string): string {
  return String(raw ?? "").trim();
}

function sanitiseAddress(raw: string | null | undefined): string | null {
  const trimmed = typeof raw === "string" ? raw.trim() : null;
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function toBase64Url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");
}

function normaliseBocEncoding(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  const base64 = trimmed.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4;
  if (padding === 0) {
    return base64;
  }

  return `${base64}${"=".repeat(4 - padding)}`;
}

export function deriveTonTransactionHash(boc: string): string | null {
  try {
    const normalised = typeof boc === "string" ? normaliseBocEncoding(boc) : "";
    if (!normalised) {
      return null;
    }

    const cells = Cell.fromBoc(Buffer.from(normalised, "base64"));
    const cell = cells[0];
    if (!cell) {
      return null;
    }

    const hash = cell.hash();
    const hashBuffer = Buffer.isBuffer(hash) ? hash : Buffer.from(hash);
    return toBase64Url(hashBuffer);
  } catch (error) {
    console.error(
      "[ton-miniapp-helper] Failed to derive transaction hash from BOC",
      error,
    );
    return null;
  }
}

async function extractErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const jsonClone = response.clone();
      const payload = (await jsonClone.json().catch(() => null)) as
        | Record<string, unknown>
        | null;
      const candidate = payload?.error ?? payload?.message ?? payload?.detail ??
        payload?.details;
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }

    const text = await response.text();
    if (text.trim().length > 0) {
      return text.trim();
    }
  } catch (error) {
    console.debug("[ton-miniapp-helper] Failed to parse error response", error);
  }

  return fallback;
}

export async function linkTonMiniAppWallet({
  telegramId,
  wallet,
  proof,
  walletAppName,
  fetcher = defaultFetch,
}: LinkWalletParams): Promise<ApiResult> {
  const trimmedTelegramId = sanitiseTelegramId(telegramId);
  if (!trimmedTelegramId) {
    return {
      ok: false,
      error: "Missing Telegram identifier. Reload the Mini App and try again.",
    };
  }

  const address = sanitiseAddress(wallet.address);
  if (!address) {
    return { ok: false, error: "Connect a TON wallet to continue." };
  }

  if (!proof) {
    return {
      ok: false,
      error: "Wallet verification expired. Reconnect your TON wallet and try again.",
    };
  }

  const payload = {
    action: "verify",
    telegram_id: trimmedTelegramId,
    address,
    publicKey: wallet.publicKey ?? null,
    walletStateInit: wallet.walletStateInit ?? null,
    walletAppName: walletAppName ?? null,
    proof,
  };

  try {
    const response = await fetcher("/api/link-wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await extractErrorMessage(response, FALLBACK_ERROR_LINK);
      return { ok: false, error, status: response.status };
    }

    return { ok: true };
  } catch (error) {
    console.error("[ton-miniapp-helper] Wallet link request failed", error);
    return { ok: false, error: FALLBACK_ERROR_LINK };
  }
}

export async function requestTonProofChallenge({
  telegramId,
  fetcher = defaultFetch,
}: {
  telegramId: string;
  fetcher?: FetchLike;
}): Promise<{
  ok: true;
  challenge: TonProofChallenge;
} | {
  ok: false;
  error: string;
}> {
  const trimmedTelegramId = sanitiseTelegramId(telegramId);
  if (!trimmedTelegramId) {
    return {
      ok: false,
      error: "Missing Telegram identifier. Reload the Mini App and try again.",
    };
  }

  try {
    const response = await fetcher("/api/link-wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "challenge", telegram_id: trimmedTelegramId }),
    });

    if (!response.ok) {
      const error = await extractErrorMessage(
        response,
        "Unable to prepare TON wallet verification. Retry shortly.",
      );
      return { ok: false, error };
    }

    const challenge = await response.json() as TonProofChallenge;
    if (!challenge || typeof challenge.payload !== "string") {
      return {
        ok: false,
        error: "Unexpected challenge response from the server.",
      };
    }

    return { ok: true, challenge };
  } catch (error) {
    console.error("[ton-miniapp-helper] Challenge request failed", error);
    return {
      ok: false,
      error: "Unable to prepare TON wallet verification. Retry shortly.",
    };
  }
}

export async function processTonMiniAppSubscription({
  telegramId,
  plan,
  txHash,
  fetcher = defaultFetch,
}: ProcessSubscriptionParams): Promise<ApiResult> {
  if (!isSupportedPlan(plan)) {
    return { ok: false, error: "Unsupported plan selection." };
  }

  const trimmedTelegramId = sanitiseTelegramId(telegramId);
  if (!trimmedTelegramId) {
    return {
      ok: false,
      error: "Missing Telegram identifier. Reload the Mini App and try again.",
    };
  }

  const trimmedHash = sanitiseHash(txHash);
  if (!trimmedHash) {
    return { ok: false, error: "Enter a TON transaction hash to continue." };
  }

  const payload = {
    telegram_id: trimmedTelegramId,
    plan,
    tx_hash: trimmedHash,
  };

  try {
    const response = await fetcher("/api/process-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await extractErrorMessage(
        response,
        FALLBACK_ERROR_SUBSCRIPTION,
      );
      return { ok: false, error, status: response.status };
    }

    return { ok: true };
  } catch (error) {
    console.error(
      "[ton-miniapp-helper] Subscription processing request failed",
      error,
    );
    return { ok: false, error: FALLBACK_ERROR_SUBSCRIPTION };
  }
}
