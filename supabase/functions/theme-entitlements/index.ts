import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  bad,
  corsHeaders,
  json,
  methodNotAllowed,
  oops,
} from "../_shared/http.ts";
import { maybe } from "../_shared/env.ts";
import {
  DEFAULT_THEME_PASS_ID,
  getThemePassById,
  THEME_PASS_DEFINITIONS,
  type ThemePassDefinition,
  type ThemePassRequirement,
} from "../../../shared/theme/passes.ts";
import type {
  ThemeEntitlementsPayload,
  ThemeEntitlementSummary,
} from "../../../shared/theme/entitlements.ts";

const TONAPI_BASE_URL =
  (maybe("THEME_INDEXER_URL") ?? maybe("TONAPI_BASE_URL") ??
    "https://tonapi.io/v2").replace(/\/$/, "");
const TONAPI_KEY = maybe("TONAPI_API_KEY");
const DCT_MASTER = maybe("DCT_JETTON_MASTER") ??
  "EQAHMNCDJmEK8yEt1IbaJP1xl2-wd21f1Gpt_57Z1uCPPzE6";

const INDEXER_BASE_URL = maybe("THEME_INDEXER_URL")?.replace(/\/$/, "") ??
  maybe("TON_INDEXER_URL")?.replace(/\/$/, "") ?? null;

interface ThemeContext {
  wallet: string;
  nftCollections: Set<string>;
  dctBalance: number;
}

function normalizeTonAddress(value: string): string {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function isTonAddress(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const candidate = normalizeTonAddress(value);
  return /^[EU]Q[\w-]{46}$/.test(candidate);
}

function tonHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    accept: "application/json",
  };
  if (TONAPI_KEY) {
    headers["Authorization"] = `Bearer ${TONAPI_KEY}`;
  }
  return headers;
}

async function fetchJson(url: string, headers: HeadersInit): Promise<unknown> {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Request failed with ${res.status}`);
  }
  return await res.json();
}

function extractCollections(payload: unknown): Set<string> {
  const set = new Set<string>();
  if (!payload || typeof payload !== "object") return set;
  const items = Array.isArray((payload as { nft_items?: unknown }).nft_items)
    ? (payload as { nft_items: unknown[] }).nft_items
    : Array.isArray((payload as { items?: unknown[] }).items)
    ? (payload as { items: unknown[] }).items
    : Array.isArray((payload as { nfts?: unknown[] }).nfts)
    ? (payload as { nfts: unknown[] }).nfts
    : [];

  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const candidate = (raw as { collection?: unknown }).collection;
    if (candidate && typeof candidate === "object") {
      const address = (candidate as { address?: unknown }).address;
      if (typeof address === "string") {
        set.add(normalizeTonAddress(address));
        continue;
      }
    }
    const fallback = (raw as { collection?: unknown }).collection;
    if (typeof fallback === "string") {
      set.add(normalizeTonAddress(fallback));
      continue;
    }
    const alt = (raw as { collection_address?: unknown }).collection_address ??
      (raw as { collectionAddress?: unknown }).collectionAddress;
    if (typeof alt === "string") {
      set.add(normalizeTonAddress(alt));
    }
  }

  return set;
}

async function fetchNftCollections(wallet: string): Promise<Set<string>> {
  const headers = tonHeaders();
  const normalizedWallet = normalizeTonAddress(wallet);
  if (INDEXER_BASE_URL) {
    try {
      const payload = await fetchJson(
        `${INDEXER_BASE_URL}/accounts/${normalizedWallet}/nfts`,
        headers,
      );
      const collections = extractCollections(payload);
      if (collections.size > 0) {
        return collections;
      }
    } catch (error) {
      console.warn(
        `[theme-entitlements] indexer request failed:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  try {
    const payload = await fetchJson(
      `${TONAPI_BASE_URL}/accounts/${normalizedWallet}/nfts?limit=256`,
      headers,
    );
    return extractCollections(payload);
  } catch (error) {
    console.error(
      `[theme-entitlements] tonapi nft lookup failed:`,
      error instanceof Error ? error.message : error,
    );
    return new Set<string>();
  }
}

interface JettonBalanceRow {
  balance?: unknown;
  jetton?: { address?: unknown; decimals?: unknown };
  quantity?: unknown;
}

function extractNumeric(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

async function fetchDctBalance(wallet: string): Promise<number> {
  const headers = tonHeaders();
  const normalizedWallet = normalizeTonAddress(wallet);
  const url = `${TONAPI_BASE_URL}/accounts/${normalizedWallet}/jettons`;
  try {
    const payload = await fetchJson(url, headers);
    if (!payload || typeof payload !== "object") {
      return 0;
    }
    const rows = Array.isArray((payload as { balances?: unknown[] }).balances)
      ? (payload as { balances: unknown[] }).balances
      : Array.isArray((payload as { jettons?: unknown[] }).jettons)
      ? (payload as { jettons: unknown[] }).jettons
      : [];

    for (const row of rows as JettonBalanceRow[]) {
      const jettonAddress = row?.jetton?.address;
      if (typeof jettonAddress !== "string") continue;
      if (
        normalizeTonAddress(jettonAddress) !== normalizeTonAddress(DCT_MASTER)
      ) {
        continue;
      }
      const decimals = extractNumeric(row?.jetton?.decimals ?? 9);
      const rawBalance = extractNumeric(row?.balance ?? row?.quantity);
      if (!Number.isFinite(rawBalance) || rawBalance <= 0) {
        return 0;
      }
      const divisor = Math.pow(10, decimals || 9);
      return rawBalance / divisor;
    }
  } catch (error) {
    console.error(
      `[theme-entitlements] tonapi jetton lookup failed:`,
      error instanceof Error ? error.message : error,
    );
  }
  return 0;
}

function evaluateRequirement(
  requirement: ThemePassRequirement,
  context: ThemeContext,
): { ok: boolean; reason?: string } {
  switch (requirement.type) {
    case "default":
      return { ok: true, reason: requirement.note ?? "Default access" };
    case "nft": {
      const owned = requirement.collections.some((collection) =>
        context.nftCollections.has(normalizeTonAddress(collection))
      );
      return {
        ok: owned,
        reason: owned
          ? requirement.note ?? "Required Theme NFT detected"
          : undefined,
      };
    }
    case "dct": {
      const satisfied = context.dctBalance >= requirement.minBalance;
      return {
        ok: satisfied,
        reason: satisfied
          ? requirement.note ??
            `Holds ${requirement.minBalance} DCT or more`
          : undefined,
      };
    }
    default:
      return { ok: false };
  }
}

function evaluatePass(
  pass: ThemePassDefinition,
  context: ThemeContext,
): ThemeEntitlementSummary | null {
  const reasons: string[] = [];
  for (const requirement of pass.requirements) {
    const { ok, reason } = evaluateRequirement(requirement, context);
    if (!ok) return null;
    if (reason) {
      reasons.push(reason);
    }
  }
  if (reasons.length === 0) {
    reasons.push("Eligible by configuration");
  }
  return {
    id: pass.id,
    label: pass.label,
    description: pass.description,
    priority: pass.priority,
    reasons,
    metadata: pass.metadata,
  };
}

async function resolveEntitlements(
  wallet: string,
): Promise<ThemeEntitlementsPayload> {
  const normalized = normalizeTonAddress(wallet);
  const [nftCollections, dctBalance] = await Promise.all([
    fetchNftCollections(normalized),
    fetchDctBalance(normalized),
  ]);

  const context: ThemeContext = {
    wallet: normalized,
    nftCollections,
    dctBalance,
  };

  const eligible = THEME_PASS_DEFINITIONS
    .map((pass) => evaluatePass(pass, context))
    .filter((value): value is ThemeEntitlementSummary => Boolean(value))
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

  if (!eligible.some((entry) => entry.id === DEFAULT_THEME_PASS_ID)) {
    const fallback = getThemePassById(DEFAULT_THEME_PASS_ID);
    if (fallback) {
      eligible.push({
        id: fallback.id,
        label: fallback.label,
        description: fallback.description,
        priority: fallback.priority,
        reasons: ["Default theme"],
        metadata: fallback.metadata,
      });
    }
  }

  const payload: ThemeEntitlementsPayload = {
    ok: true,
    wallet: normalized,
    evaluatedAt: new Date().toISOString(),
    dctBalance,
    nftCollections: Array.from(nftCollections.values()),
    themes: eligible,
  };

  return payload;
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { ...corsHeaders(req), "content-length": "0" },
      status: 204,
    });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return methodNotAllowed(req);
  }

  try {
    let wallet: unknown;
    if (req.method === "GET") {
      const url = new URL(req.url);
      wallet = url.searchParams.get("wallet");
    } else {
      const body = await req.json().catch(() => ({}));
      wallet = (body as { wallet?: unknown }).wallet;
    }

    if (!isTonAddress(wallet)) {
      return bad(
        "wallet is required and must be a valid TON address",
        undefined,
        req,
      );
    }

    const payload = await resolveEntitlements(wallet);

    return json(payload, 200, {}, req);
  } catch (error) {
    console.error("[theme-entitlements]", error);
    return oops(
      "Unexpected error",
      error instanceof Error ? error.message : error,
      req,
    );
  }
}

if (import.meta.main) {
  serve((req) => handler(req));
}

export default handler;
