import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type MintNetwork = "mainnet" | "testnet";

const ALLOWED_NETWORKS: readonly MintNetwork[] = ["mainnet", "testnet"];

const RESPONSE_HEADERS = {
  "Content-Type": "application/json",
} as const;

type StartJettonMinterRequest = {
  network?: string;
  net?: string;
  initiator?: string;
  note?: string;
  txHash?: string;
  tx_hash?: string;
  targetSupply?: number;
  target_supply?: number;
};

type JettonMinterRow = {
  id: string;
  network: MintNetwork;
  status: string;
  initiator: string | null;
  note: string | null;
  tx_hash: string | null;
  target_supply: string | number | null;
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

function normaliseNetwork(value: string | undefined | null): MintNetwork | null {
  if (!value) return null;
  const candidate = value.trim().toLowerCase();
  if (candidate === "mainnet" || candidate === "testnet") {
    return candidate;
  }
  return null;
}

const configuredNetwork = (() => {
  const envNetwork = normaliseNetwork(Deno.env.get("JETTON_MINTER_NETWORK"));
  if (envNetwork) {
    return envNetwork;
  }
  // Default to testnet for safety.
  return "testnet" as const;
})();

function parseNetwork(
  payload: StartJettonMinterRequest,
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

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseTargetSupply(payload: StartJettonMinterRequest): number | undefined {
  const candidate = payload.targetSupply ?? payload.target_supply;
  if (candidate === undefined || candidate === null) {
    return undefined;
  }
  const numeric = typeof candidate === "number"
    ? candidate
    : typeof candidate === "string" && candidate.trim() !== ""
    ? Number(candidate)
    : NaN;
  if (!Number.isFinite(numeric) || numeric < 0) {
    return undefined;
  }
  return numeric;
}

function numericFromRow(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function logJettonMinterStart(
  client: SupabaseClient,
  record: JettonMinterRow,
): Promise<void> {
  try {
    await client.from("tx_logs").insert({
      kind: "jetton_minter_start",
      ref_id: record.id,
      meta: {
        network: record.network,
        initiator: record.initiator,
        tx_hash: record.tx_hash,
        target_supply: numericFromRow(record.target_supply),
      },
    });
  } catch (error) {
    console.error("[start-jetton-minter] Failed to log tx", error);
  }
}

serve(async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed" }),
      { status: 405, headers: RESPONSE_HEADERS },
    );
  }

  let body: StartJettonMinterRequest;
  try {
    body = await request.json() as StartJettonMinterRequest;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON payload" }),
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
  const initiator = normalizeOptionalString(body.initiator);
  const note = normalizeOptionalString(body.note);
  const txHash = normalizeOptionalString(body.txHash ?? body.tx_hash);
  const targetSupply = parseTargetSupply(body);
  const nowIso = new Date().toISOString();

  try {
    const { data: existing, error: fetchError } = await supabase
      .from("jetton_minter_runs")
      .select(
        "id, network, status, initiator, note, tx_hash, target_supply, started_at, completed_at, updated_at",
      )
      .eq("network", network)
      .maybeSingle<JettonMinterRow>();

    if (fetchError) {
      throw fetchError;
    }

    if (existing && existing.status === "completed") {
      return new Response(
        JSON.stringify({ error: "Jetton minter already completed" }),
        { status: 409, headers: RESPONSE_HEADERS },
      );
    }

    const startedAt = existing?.started_at ?? nowIso;
    const nextInitiator = initiator ?? existing?.initiator ?? null;
    const nextNote = note ?? existing?.note ?? null;
    const nextTxHash = txHash ?? existing?.tx_hash ?? null;
    const nextTargetSupply = targetSupply ?? numericFromRow(existing?.target_supply ?? null) ?? null;

    const isAlreadyInProgress = existing?.status === "in_progress";
    const existingTargetSupply = numericFromRow(existing?.target_supply ?? null);

    const hasMeaningfulChange =
      !existing ||
      existing.status !== "in_progress" ||
      existing.initiator !== nextInitiator ||
      existing.note !== nextNote ||
      existing.tx_hash !== nextTxHash ||
      existingTargetSupply !== nextTargetSupply;

    if (!hasMeaningfulChange && existing) {
      return new Response(
        JSON.stringify({
          ok: true,
          minter: {
            ...existing,
            target_supply: existingTargetSupply,
          },
          network,
        }),
        { status: 200, headers: RESPONSE_HEADERS },
      );
    }

    const upsertPayload = {
      network,
      status: "in_progress",
      initiator: nextInitiator,
      note: nextNote,
      tx_hash: nextTxHash,
      target_supply: nextTargetSupply,
      started_at: startedAt,
      completed_at: null,
      updated_at: nowIso,
    };

    const { data, error: upsertError } = await supabase
      .from("jetton_minter_runs")
      .upsert(upsertPayload, { onConflict: "network" })
      .select()
      .single<JettonMinterRow>();

    if (upsertError) {
      throw upsertError;
    }

    if (!isAlreadyInProgress) {
      await logJettonMinterStart(supabase, data);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        minter: {
          ...data,
          target_supply: numericFromRow(data.target_supply),
        },
        network,
      }),
      { status: 200, headers: RESPONSE_HEADERS },
    );
  } catch (error) {
    console.error("[start-jetton-minter] Failed to start jetton minter", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: RESPONSE_HEADERS },
    );
  }
});
