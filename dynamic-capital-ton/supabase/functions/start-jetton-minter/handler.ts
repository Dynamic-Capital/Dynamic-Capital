export type MintNetwork = "mainnet" | "testnet";

export const ALLOWED_NETWORKS: readonly MintNetwork[] = ["mainnet", "testnet"];

export type StartJettonMinterRequest = {
  network?: string;
  net?: string;
  initiator?: string;
  note?: string;
  txHash?: string;
  tx_hash?: string;
  targetSupply?: number;
  target_supply?: number;
};

export type JettonMinterRow = {
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

export type JettonMinterUpsert = {
  network: MintNetwork;
  status: string;
  initiator: string | null;
  note: string | null;
  tx_hash: string | null;
  target_supply: number | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

export interface JettonMinterStore {
  fetchRun(network: MintNetwork): Promise<JettonMinterRow | null>;
  upsertRun(payload: JettonMinterUpsert): Promise<JettonMinterRow>;
  logStart(record: JettonMinterRow): Promise<void>;
}

export interface StartJettonMinterDependencies {
  store: JettonMinterStore;
  configuredNetwork: MintNetwork;
  now?: () => Date;
  logger?: Pick<Console, "error">;
}

const RESPONSE_HEADERS = {
  "Content-Type": "application/json",
} as const;

export function determineConfiguredNetwork(value: string | undefined | null): MintNetwork {
  const envNetwork = normaliseNetwork(value);
  if (envNetwork) {
    return envNetwork;
  }
  return "testnet";
}

export function createStartJettonMinterHandler({
  store,
  configuredNetwork,
  now = () => new Date(),
  logger = console,
}: StartJettonMinterDependencies): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
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
    const nowIso = now().toISOString();

    try {
      const existing = await store.fetchRun(network);

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

      const upsertPayload: JettonMinterUpsert = {
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

      const data = await store.upsertRun(upsertPayload);

      if (!isAlreadyInProgress) {
        await store.logStart(data);
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
      logger.error("[start-jetton-minter] Failed to start jetton minter", error);
      const message = error instanceof Error ? error.message : "Unexpected error";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers: RESPONSE_HEADERS },
      );
    }
  };
}

export function parseNetwork(
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

export function normaliseNetwork(value: string | undefined | null): MintNetwork | null {
  if (!value) return null;
  const candidate = value.trim().toLowerCase();
  if (candidate === "mainnet" || candidate === "testnet") {
    return candidate;
  }
  return null;
}

export function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseTargetSupply(payload: StartJettonMinterRequest): number | undefined {
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

export function numericFromRow(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createMemoryJettonMinterStore(initial?: JettonMinterRow[]): JettonMinterStore {
  const records = new Map<MintNetwork, JettonMinterRow>();
  for (const row of initial ?? []) {
    records.set(row.network, { ...row });
  }

  return {
    async fetchRun(network) {
      const value = records.get(network);
      return value ? { ...value } : null;
    },
    async upsertRun(payload) {
      const existing = records.get(payload.network);
      const id = existing?.id ?? crypto.randomUUID();
      const row: JettonMinterRow = {
        id,
        network: payload.network,
        status: payload.status,
        initiator: payload.initiator,
        note: payload.note,
        tx_hash: payload.tx_hash,
        target_supply: payload.target_supply,
        started_at: payload.started_at,
        completed_at: payload.completed_at,
        updated_at: payload.updated_at,
      };
      records.set(payload.network, { ...row });
      return { ...row };
    },
    async logStart() {
      // no-op for memory store
    },
  } satisfies JettonMinterStore;
}

