export type TonActionPriority = "low" | "normal" | "high";

function clamp(value: number, lower = 0, upper = 1): number {
  return Math.max(lower, Math.min(upper, value));
}

function ensureNonNegative(value: number): number {
  return Math.max(0, Number(value));
}

function normaliseText(value: string): string {
  if (typeof value !== "string") throw new TypeError("value must be a string");
  const text = value.trim();
  if (!text) throw new Error("value must not be empty");
  return text;
}

function normaliseLower(value: string): string {
  return normaliseText(value).toLowerCase();
}

function normaliseUpper(value: string): string {
  return normaliseText(value).toUpperCase();
}

function coerceMetadata(metadata: Record<string, unknown> | undefined | null) {
  if (metadata === undefined || metadata === null) return undefined;
  if (typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new TypeError("metadata must be a mapping");
  }
  return { ...metadata };
}

function normaliseAlerts(alerts: string[]): string[] {
  const result: string[] = [];
  for (const alert of alerts) {
    const text = typeof alert === "string" ? alert.trim() : "";
    if (text) result.push(text);
  }
  return result;
}

const ALLOWED_PRIORITIES = new Set<TonActionPriority>([
  "low",
  "normal",
  "high",
]);

export class TonLiquidityPool {
  readonly venue: string;
  readonly pair: string;
  readonly tonDepth: number;
  readonly quoteDepth: number;
  readonly utilisation: number;

  constructor(options: {
    venue: string;
    pair: string;
    tonDepth: number;
    quoteDepth: number;
    utilisation?: number;
  }) {
    this.venue = normaliseText(options.venue);
    this.pair = normaliseUpper(options.pair);
    this.tonDepth = ensureNonNegative(options.tonDepth);
    this.quoteDepth = ensureNonNegative(options.quoteDepth);
    this.utilisation = clamp(Number(options.utilisation ?? 0));
  }

  get depthRatio(): number {
    if (this.quoteDepth === 0) return 0;
    return this.tonDepth / this.quoteDepth;
  }
}

export class TonNetworkTelemetry {
  readonly tonPriceUsd: number;
  readonly bridgeLatencyMs: number;
  readonly settlementBacklog: number;
  readonly tonInflow24h: number;
  readonly tonOutflow24h: number;

  constructor(options: {
    tonPriceUsd: number;
    bridgeLatencyMs: number;
    settlementBacklog?: number;
    tonInflow24h?: number;
    tonOutflow24h?: number;
  }) {
    this.tonPriceUsd = Math.max(0.01, Number(options.tonPriceUsd));
    this.bridgeLatencyMs = ensureNonNegative(options.bridgeLatencyMs);
    this.settlementBacklog = Math.max(
      0,
      Math.floor(options.settlementBacklog ?? 0),
    );
    this.tonInflow24h = ensureNonNegative(options.tonInflow24h ?? 0);
    this.tonOutflow24h = ensureNonNegative(options.tonOutflow24h ?? 0);
  }

  get netFlow(): number {
    return this.tonInflow24h - this.tonOutflow24h;
  }
}

export class TonTreasuryPosture {
  readonly tonReserve: number;
  readonly stableReserve: number;
  readonly targetTonRatio: number;
  readonly hedgedRatio: number;

  constructor(options: {
    tonReserve: number;
    stableReserve: number;
    targetTonRatio: number;
    hedgedRatio?: number;
  }) {
    this.tonReserve = ensureNonNegative(options.tonReserve);
    this.stableReserve = ensureNonNegative(options.stableReserve);
    this.targetTonRatio = clamp(Number(options.targetTonRatio));
    this.hedgedRatio = clamp(Number(options.hedgedRatio ?? 0));
  }

  get totalReserve(): number {
    return this.tonReserve + this.stableReserve;
  }

  get currentTonRatio(): number {
    const total = this.totalReserve;
    if (total === 0) return 0;
    return this.tonReserve / total;
  }
}

export class TonAction {
  readonly category: string;
  readonly description: string;
  readonly priority: TonActionPriority;
  readonly metadata?: Record<string, unknown>;

  constructor(options: {
    category: string;
    description: string;
    priority?: TonActionPriority;
    metadata?: Record<string, unknown> | null;
  }) {
    this.category = normaliseLower(options.category);
    this.description = normaliseText(options.description);
    const priority = normaliseLower(options.priority ?? "normal");
    if (!ALLOWED_PRIORITIES.has(priority as TonActionPriority)) {
      throw new Error("priority must be one of low, normal, or high");
    }
    this.priority = priority as TonActionPriority;
    this.metadata = coerceMetadata(options.metadata ?? undefined);
  }
}

export class TonExecutionPlan {
  readonly actions: TonAction[];
  readonly alerts: string[];
  readonly tonAllocation: Record<string, number>;
  readonly expectedTonRatio: number;
  readonly commentary: string;

  constructor(options: {
    actions: TonAction[];
    alerts?: string[];
    tonAllocation?: Record<string, number>;
    expectedTonRatio?: number;
    commentary?: string;
  }) {
    this.actions = options.actions.slice();
    this.alerts = normaliseAlerts(options.alerts ?? []);
    const allocation: Record<string, number> = {};
    if (options.tonAllocation) {
      for (const [key, value] of Object.entries(options.tonAllocation)) {
        const amount = ensureNonNegative(value);
        if (amount > 0) allocation[normaliseLower(key)] = amount;
      }
    }
    this.tonAllocation = allocation;
    this.expectedTonRatio = clamp(Number(options.expectedTonRatio ?? 0));
    this.commentary = options.commentary?.trim() ?? "";
  }

  get hasHighPriorityActions(): boolean {
    return this.actions.some((action) => action.priority === "high");
  }
}

export interface DynamicTonEngineOptions {
  minTotalDepthTon?: number;
  maxBridgeLatencyMs?: number;
  utilisationCeiling?: number;
  ratioTolerance?: number;
}

export class DynamicTonEngine {
  readonly #minTotalDepthTon: number;
  readonly #maxBridgeLatencyMs: number;
  readonly #utilisationCeiling: number;
  readonly #ratioTolerance: number;

  constructor(options: DynamicTonEngineOptions = {}) {
    const minTotalDepthTon = Number(options.minTotalDepthTon ?? 750_000);
    const maxBridgeLatencyMs = Number(options.maxBridgeLatencyMs ?? 900);
    const utilisationCeiling = Number(options.utilisationCeiling ?? 0.72);
    const ratioTolerance = Number(options.ratioTolerance ?? 0.05);

    if (!(minTotalDepthTon > 0)) {
      throw new Error("minTotalDepthTon must be positive");
    }
    if (!(maxBridgeLatencyMs > 0)) {
      throw new Error("maxBridgeLatencyMs must be positive");
    }
    if (!(utilisationCeiling > 0 && utilisationCeiling <= 1)) {
      throw new Error("utilisationCeiling must be between 0 and 1");
    }
    if (!(ratioTolerance >= 0 && ratioTolerance < 1)) {
      throw new Error("ratioTolerance must be between 0 and 1");
    }

    this.#minTotalDepthTon = minTotalDepthTon;
    this.#maxBridgeLatencyMs = maxBridgeLatencyMs;
    this.#utilisationCeiling = utilisationCeiling;
    this.#ratioTolerance = ratioTolerance;
  }

  buildPlan(options: {
    liquidity: TonLiquidityPool[];
    telemetry: TonNetworkTelemetry;
    treasury: TonTreasuryPosture;
  }): TonExecutionPlan {
    const pools = options.liquidity.slice();
    const actions: TonAction[] = [];
    const alerts: string[] = [];
    const tonAllocation: Record<string, number> = {};

    const totalDepth = pools.reduce((sum, pool) => sum + pool.tonDepth, 0);
    if (totalDepth < this.#minTotalDepthTon) {
      const deficit = this.#minTotalDepthTon - totalDepth;
      actions.push(
        new TonAction({
          category: "liquidity",
          description: `Seed ${
            deficit.toLocaleString(undefined, { maximumFractionDigits: 0 })
          } TON across pools to restore depth above ${
            this.#minTotalDepthTon.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })
          }.`,
          priority: deficit > this.#minTotalDepthTon * 0.2 ? "high" : "normal",
          metadata: { tonRequired: Math.round(deficit * 100) / 100 },
        }),
      );
      tonAllocation["liquidity"] = (tonAllocation["liquidity"] ?? 0) + deficit;
    }

    for (const pool of pools) {
      if (pool.utilisation > this.#utilisationCeiling) {
        actions.push(
          new TonAction({
            category: "liquidity",
            description:
              `Deploy liquidity relief on ${pool.venue} ${pool.pair} (utilisation ${
                (pool.utilisation * 100).toFixed(0)
              }%).`,
            priority: "high",
            metadata: {
              venue: pool.venue,
              pair: pool.pair,
              utilisation: Number(pool.utilisation.toFixed(4)),
            },
          }),
        );
      }
    }

    const treasury = options.treasury;
    const telemetry = options.telemetry;

    let expectedRatio = treasury.currentTonRatio;
    const totalReserve = treasury.totalReserve;
    if (totalReserve > 0) {
      const desiredTon = totalReserve * treasury.targetTonRatio;
      const gap = desiredTon - treasury.tonReserve;
      const toleranceAmount = totalReserve * this.#ratioTolerance;
      if (Math.abs(gap) > toleranceAmount) {
        if (gap > 0) {
          actions.push(
            new TonAction({
              category: "treasury",
              description:
                `Accumulate additional TON to close the reserve gap and reach the ${
                  (treasury.targetTonRatio * 100).toFixed(0)
                }% target ratio.`,
              priority: "normal",
              metadata: { tonShortfall: Math.round(gap * 100) / 100 },
            }),
          );
          tonAllocation["accumulate_ton"] =
            (tonAllocation["accumulate_ton"] ?? 0) + gap;
        } else {
          const adjustment = Math.abs(gap);
          actions.push(
            new TonAction({
              category: "treasury",
              description:
                `Rotate TON back into stables to respect the treasury exposure target of ${
                  (treasury.targetTonRatio * 100).toFixed(0)
                }%.`,
              priority: "normal",
              metadata: { tonToRelease: Math.round(adjustment * 100) / 100 },
            }),
          );
          tonAllocation["rebalance_to_stables"] =
            (tonAllocation["rebalance_to_stables"] ?? 0) + adjustment;
        }
        expectedRatio = treasury.targetTonRatio;
      }
    }

    if (telemetry.bridgeLatencyMs > this.#maxBridgeLatencyMs) {
      alerts.push(
        "Bridge latency exceeding threshold; queue settlements via alternative rails.",
      );
      actions.push(
        new TonAction({
          category: "infrastructure",
          description: "Escalate TON bridge latency incident with providers.",
          priority: "high",
          metadata: {
            latencyMs: Number(telemetry.bridgeLatencyMs.toFixed(2)),
            thresholdMs: Number(this.#maxBridgeLatencyMs.toFixed(2)),
          },
        }),
      );
    }

    if (telemetry.settlementBacklog > 0) {
      alerts.push(
        `${telemetry.settlementBacklog} TON settlements pending; prioritise clearing.`,
      );
    }

    if (telemetry.netFlow < 0) {
      const deficit = Math.abs(telemetry.netFlow);
      actions.push(
        new TonAction({
          category: "treasury",
          description:
            "Net TON outflows detected over the last 24h; top up buffers to prevent liquidity stress.",
          priority: deficit > totalReserve * 0.1 ? "high" : "normal",
          metadata: { netOutflow: Math.round(deficit * 100) / 100 },
        }),
      );
      tonAllocation["buffer_top_up"] = (tonAllocation["buffer_top_up"] ?? 0) +
        deficit;
    }

    const commentary =
      "Plan emphasises maintaining resilient TON liquidity, addressing treasury balance targets, and mitigating infrastructure friction.";

    return new TonExecutionPlan({
      actions,
      alerts,
      tonAllocation,
      expectedTonRatio: expectedRatio,
      commentary,
    });
  }
}

export interface ExecutionPlanPayload {
  liquidity: Array<Record<string, unknown>>;
  telemetry: Record<string, unknown>;
  treasury: Record<string, unknown>;
  engine?: Record<string, unknown>;
}

function asNumber(value: unknown, label: string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`${label} must be a number`);
  }
  return numeric;
}

function extract<T>(
  mapping: Record<string, unknown>,
  keys: string[],
  label: string,
  required = true,
): T {
  for (const key of keys) {
    if (key in mapping) return mapping[key] as T;
  }
  if (required) throw new Error(`Missing required field: ${label}`);
  return undefined as unknown as T;
}

function toLiquidityPools(
  entries: Array<Record<string, unknown>>,
): TonLiquidityPool[] {
  return entries.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`liquidity[${index}] must be a mapping`);
    }
    return new TonLiquidityPool({
      venue: String(extract(entry, ["venue"], `liquidity[${index}].venue`)),
      pair: String(extract(entry, ["pair"], `liquidity[${index}].pair`)),
      tonDepth: asNumber(
        extract(
          entry,
          ["tonDepth", "ton_depth"],
          `liquidity[${index}].tonDepth`,
        ),
        `liquidity[${index}].tonDepth`,
      ),
      quoteDepth: asNumber(
        extract(
          entry,
          ["quoteDepth", "quote_depth"],
          `liquidity[${index}].quoteDepth`,
        ),
        `liquidity[${index}].quoteDepth`,
      ),
      utilisation: Number(
        extract(
          entry,
          ["utilisation", "utilization"],
          `liquidity[${index}].utilisation`,
          false,
        ) ?? 0,
      ),
    });
  });
}

function toTelemetry(entry: Record<string, unknown>): TonNetworkTelemetry {
  return new TonNetworkTelemetry({
    tonPriceUsd: asNumber(
      extract(entry, ["tonPriceUsd", "ton_price_usd"], "telemetry.tonPriceUsd"),
      "telemetry.tonPriceUsd",
    ),
    bridgeLatencyMs: asNumber(
      extract(
        entry,
        ["bridgeLatencyMs", "bridge_latency_ms"],
        "telemetry.bridgeLatencyMs",
      ),
      "telemetry.bridgeLatencyMs",
    ),
    settlementBacklog: Number(
      extract(
        entry,
        ["settlementBacklog", "settlement_backlog"],
        "telemetry.settlementBacklog",
        false,
      ) ?? 0,
    ),
    tonInflow24h: Number(
      extract(
        entry,
        ["tonInflow24h", "ton_inflow_24h"],
        "telemetry.tonInflow24h",
        false,
      ) ?? 0,
    ),
    tonOutflow24h: Number(
      extract(
        entry,
        ["tonOutflow24h", "ton_outflow_24h"],
        "telemetry.tonOutflow24h",
        false,
      ) ?? 0,
    ),
  });
}

function toTreasury(entry: Record<string, unknown>): TonTreasuryPosture {
  return new TonTreasuryPosture({
    tonReserve: asNumber(
      extract(entry, ["tonReserve", "ton_reserve"], "treasury.tonReserve"),
      "treasury.tonReserve",
    ),
    stableReserve: asNumber(
      extract(
        entry,
        ["stableReserve", "stable_reserve"],
        "treasury.stableReserve",
      ),
      "treasury.stableReserve",
    ),
    targetTonRatio: asNumber(
      extract(
        entry,
        ["targetTonRatio", "target_ton_ratio"],
        "treasury.targetTonRatio",
      ),
      "treasury.targetTonRatio",
    ),
    hedgedRatio: Number(
      extract(
        entry,
        ["hedgedRatio", "hedged_ratio"],
        "treasury.hedgedRatio",
        false,
      ) ?? 0,
    ),
  });
}

function buildEngine(config?: Record<string, unknown>): DynamicTonEngine {
  if (!config) return new DynamicTonEngine();
  const options: DynamicTonEngineOptions = {};
  if (config.minTotalDepthTon !== undefined) {
    options.minTotalDepthTon = asNumber(
      config.minTotalDepthTon,
      "engine.minTotalDepthTon",
    );
  }
  if (config.maxBridgeLatencyMs !== undefined) {
    options.maxBridgeLatencyMs = asNumber(
      config.maxBridgeLatencyMs,
      "engine.maxBridgeLatencyMs",
    );
  }
  if (config.utilisationCeiling !== undefined) {
    options.utilisationCeiling = asNumber(
      config.utilisationCeiling,
      "engine.utilisationCeiling",
    );
  }
  if (config.ratioTolerance !== undefined) {
    options.ratioTolerance = asNumber(
      config.ratioTolerance,
      "engine.ratioTolerance",
    );
  }
  return new DynamicTonEngine(options);
}

export function buildExecutionPlan(
  payload: ExecutionPlanPayload,
  engine?: DynamicTonEngine,
): TonExecutionPlan {
  if (!payload || typeof payload !== "object") {
    throw new Error("payload must be a mapping");
  }
  const liquidityEntries = Array.isArray(payload.liquidity)
    ? payload.liquidity
    : [];
  const liquidity = toLiquidityPools(liquidityEntries);
  const telemetry = toTelemetry(
    payload.telemetry ?? {} as Record<string, unknown>,
  );
  const treasury = toTreasury(
    payload.treasury ?? {} as Record<string, unknown>,
  );
  const engineInstance = engine ??
    buildEngine(payload.engine ?? {} as Record<string, unknown>);
  return engineInstance.buildPlan({ liquidity, telemetry, treasury });
}

export function serialiseExecutionPlan(plan: TonExecutionPlan) {
  return {
    actions: plan.actions.map((action) => ({
      category: action.category,
      description: action.description,
      priority: action.priority,
      metadata: action.metadata ?? {},
    })),
    alerts: plan.alerts.slice(),
    tonAllocation: { ...plan.tonAllocation },
    expectedTonRatio: plan.expectedTonRatio,
    commentary: plan.commentary,
    hasHighPriorityActions: plan.hasHighPriorityActions,
  };
}
