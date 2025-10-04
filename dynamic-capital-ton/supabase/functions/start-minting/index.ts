import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type StartMintRequest = {
  mintIndex?: number;
  mint_index?: number;
  planName?: string;
  plan_name?: string;
  initiator?: string;
  note?: string;
  contentUri?: string;
  content_uri?: string;
  priority?: number;
  defaultPriority?: number;
  default_priority?: number;
  network?: string;
  net?: string;
};

type ThemeMintRow = {
  id: string;
  mint_index: number;
  network: MintNetwork;
  name: string;
  status: string;
  initiator: string | null;
  note: string | null;
  content_uri: string | null;
  priority: number | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

type SupabaseClient = typeof supabase;

type MintNetwork = "mainnet" | "testnet";

const ALLOWED_NETWORKS: readonly MintNetwork[] = ["mainnet", "testnet"];

const RESPONSE_HEADERS = {
  "Content-Type": "application/json",
} as const;

function normaliseNetwork(value: string | undefined | null): MintNetwork | null {
  if (!value) return null;
  const normalised = value.trim().toLowerCase();
  if (normalised === "mainnet" || normalised === "testnet") {
    return normalised;
  }
  return null;
}

const configuredNetwork = (() => {
  const envNetwork = normaliseNetwork(Deno.env.get("THEME_MINT_NETWORK"));
  if (envNetwork) {
    return envNetwork;
  }
  // Default to testnet to avoid accidentally mutating mainnet without opting in.
  return "testnet" as const;
})();

function parseNetwork(
  payload: StartMintRequest,
  fallback: MintNetwork,
): MintNetwork | { error: string } {
  const candidate = payload.network ?? payload.net;
  if (candidate === undefined) {
    return fallback;
  }
  const normalised = normaliseNetwork(candidate);
  if (!normalised) {
    return { error: `network must be one of ${ALLOWED_NETWORKS.join(", ")}` };
  }
  return normalised;
}

function parseMintIndex(payload: StartMintRequest): number | null {
  const candidate = payload.mintIndex ?? payload.mint_index;
  if (typeof candidate !== "number") {
    return null;
  }
  if (!Number.isInteger(candidate) || candidate < 0) {
    return null;
  }
  return candidate;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parsePriority(payload: StartMintRequest): number | undefined {
  const candidate = payload.priority ??
    payload.defaultPriority ??
    payload.default_priority;
  if (typeof candidate !== "number") {
    return undefined;
  }
  if (!Number.isFinite(candidate)) {
    return undefined;
  }
  return Math.trunc(candidate);
}

async function logMintStart(
  client: SupabaseClient,
  record: ThemeMintRow,
): Promise<void> {
  try {
    await client.from("tx_logs").insert({
      kind: "theme_mint_start",
      ref_id: record.id,
      meta: {
        mint_index: record.mint_index,
        name: record.name,
        network: record.network,
        initiator: record.initiator,
      },
    });
  } catch (error) {
    console.error("[start-minting] Failed to log tx", error);
  }
}

serve(async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed" }),
      { status: 405, headers: RESPONSE_HEADERS },
    );
  }

  let body: StartMintRequest;
  try {
    body = await request.json() as StartMintRequest;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON payload" }),
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  const mintIndex = parseMintIndex(body);
  if (mintIndex === null) {
    return new Response(
      JSON.stringify({ error: "mintIndex must be a non-negative integer" }),
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  const networkResult = parseNetwork(body, configuredNetwork);
  if (typeof networkResult === "object" && "error" in networkResult) {
    return new Response(
      JSON.stringify({ error: networkResult.error }),
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  if (networkResult !== configuredNetwork) {
    return new Response(
      JSON.stringify({
        error: `Forbidden for ${networkResult} network; this function is configured for ${configuredNetwork}`,
      }),
      { status: 403, headers: RESPONSE_HEADERS },
    );
  }

  const network = networkResult;

  const planName = normalizeOptionalString(body.planName ?? body.plan_name) ??
    `Theme Mint #${mintIndex}`;
  const initiator = normalizeOptionalString(body.initiator);
  const note = normalizeOptionalString(body.note);
  const contentUri =
    normalizeOptionalString(body.contentUri ?? body.content_uri);
  const priority = parsePriority(body);
  const nowIso = new Date().toISOString();

  try {
    const { data: existing, error: fetchError } = await supabase
      .from("theme_pass_mints")
      .select("id, mint_index, network, name, status, initiator, note, content_uri, priority, started_at, completed_at, updated_at")
      .eq("mint_index", mintIndex)
      .eq("network", network)
      .maybeSingle<ThemeMintRow>();

    if (fetchError) {
      throw fetchError;
    }

    if (existing && existing.status === "completed") {
      return new Response(
        JSON.stringify({ error: "Mint already completed" }),
        { status: 409, headers: RESPONSE_HEADERS },
      );
    }

    const startedAt = existing?.started_at ?? nowIso;

    const nextInitiator = initiator ?? existing?.initiator ?? null;
    const nextNote = note ?? existing?.note ?? null;
    const nextContentUri = contentUri ?? existing?.content_uri ?? null;
    const nextPriority = priority ?? existing?.priority ?? null;

    const isAlreadyInProgress = existing?.status === "in_progress";
    const hasMeaningfulChange =
      !existing ||
      existing.status !== "in_progress" ||
      existing.initiator !== nextInitiator ||
      existing.note !== nextNote ||
      existing.content_uri !== nextContentUri ||
      existing.priority !== nextPriority;

    if (!hasMeaningfulChange && existing) {
      return new Response(
        JSON.stringify({ ok: true, mint: existing, network }),
        { status: 200, headers: RESPONSE_HEADERS },
      );
    }

    const upsertPayload = {
      mint_index: mintIndex,
      network,
      name: planName,
      status: "in_progress",
      initiator: nextInitiator,
      note: nextNote,
      content_uri: nextContentUri,
      priority: nextPriority,
      started_at: startedAt,
      completed_at: null,
      updated_at: nowIso,
    };

    const { data, error: upsertError } = await supabase
      .from("theme_pass_mints")
      .upsert(upsertPayload, { onConflict: "mint_index,network" })
      .select()
      .single<ThemeMintRow>();

    if (upsertError) {
      throw upsertError;
    }

    if (!isAlreadyInProgress) {
      await logMintStart(supabase, data);
    }

    return new Response(
      JSON.stringify({ ok: true, mint: data, network }),
      { status: 200, headers: RESPONSE_HEADERS },
    );
  } catch (error) {
    console.error("[start-minting] Failed to start mint", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: RESPONSE_HEADERS },
    );
  }
});
