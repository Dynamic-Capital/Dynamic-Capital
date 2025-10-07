export type RiskTier = "conservative" | "standard" | "aggressive";
export type ActionPriority = "low" | "normal" | "high";

const ALLOWED_RISK_TIERS = new Set<RiskTier>([
  "conservative",
  "standard",
  "aggressive",
]);

const ALLOWED_PRIORITIES = new Set<ActionPriority>([
  "low",
  "normal",
  "high",
]);

const RISK_BUFFER_TARGETS: Record<RiskTier, number> = {
  conservative: 0.35,
  standard: 0.2,
  aggressive: 0.1,
};

function normaliseText(value: string): string {
  if (typeof value !== "string") throw new TypeError("value must be a string");
  const text = value.trim();
  if (!text) throw new Error("value must not be empty");
  return text;
}

function normaliseUpper(value: string): string {
  return normaliseText(value).toUpperCase();
}

function normaliseLower(value: string): string {
  return normaliseText(value).toLowerCase();
}

function clamp(value: number, lower = 0, upper = 1): number {
  return Math.max(lower, Math.min(upper, value));
}

function ensureNonNegative(value: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error("value must be non-negative");
  }
  return numeric;
}

function normaliseTags(tags: string[] | undefined | null): string[] {
  if (!tags) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const text = typeof tag === "string" ? tag.trim().toLowerCase() : "";
    if (text && !seen.has(text)) {
      seen.add(text);
      result.push(text);
    }
  }
  return result;
}

export class WalletAccount {
  readonly address: string;
  readonly owner: string;
  readonly riskTier: RiskTier;
  readonly tags: string[];
  readonly metadata?: Record<string, unknown>;

  constructor(options: {
    address: string;
    owner: string;
    riskTier?: RiskTier;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }) {
    this.address = normaliseUpper(options.address);
    this.owner = normaliseText(options.owner);
    const risk = normaliseLower(options.riskTier ?? "standard");
    if (!ALLOWED_RISK_TIERS.has(risk as RiskTier)) {
      throw new Error("riskTier must be conservative, standard, or aggressive");
    }
    this.riskTier = risk as RiskTier;
    this.tags = normaliseTags(options.tags);
    if (options.metadata && typeof options.metadata !== "object") {
      throw new Error("metadata must be a mapping");
    }
    this.metadata = options.metadata;
  }
}

export class WalletBalance {
  readonly asset: string;
  readonly total: number;
  readonly available: number;
  readonly locked: number;
  readonly metadata?: Record<string, unknown>;

  constructor(options: {
    asset: string;
    total: number;
    available?: number | null;
    locked?: number;
    metadata?: Record<string, unknown>;
  }) {
    this.asset = normaliseUpper(options.asset);
    this.total = ensureNonNegative(options.total);
    this.locked = ensureNonNegative(options.locked ?? 0);
    if (options.available == null) {
      this.available = Math.max(this.total - this.locked, 0);
    } else {
      const available = ensureNonNegative(options.available);
      if (available > this.total) {
        throw new Error("available cannot exceed total");
      }
      this.available = available;
    }
    if (this.available + this.locked - this.total > 1e-9) {
      throw new Error("available plus locked exceeds total balance");
    }
    if (options.metadata && typeof options.metadata !== "object") {
      throw new Error("metadata must be a mapping");
    }
    this.metadata = options.metadata;
  }

  get utilisation(): number {
    if (this.total === 0) return 0;
    return clamp(1 - this.available / this.total);
  }
}

export interface WalletExposure {
  asset: string;
  balanceTotal: number;
  balanceAvailable: number;
  balanceLocked: number;
  usdValue: number;
  share: number;
  utilisation: number;
}

export interface WalletAction {
  category: string;
  description: string;
  priority: ActionPriority;
  metadata?: Record<string, unknown>;
}

export interface WalletSummary {
  account: WalletAccount;
  totalValueUsd: number;
  availableValueUsd: number;
  bufferRatio: number;
  diversificationScore: number;
  exposures: WalletExposure[];
  actions: WalletAction[];
  alerts: string[];
}

export interface DynamicWalletEngineOptions {
  exposureLimits?: Record<string, number>;
  baseBufferTarget?: number;
}

export class DynamicWalletEngine {
  readonly #accounts = new Map<string, WalletAccount>();
  readonly #balances = new Map<string, Map<string, WalletBalance>>();
  readonly #exposureLimits: Map<string, number>;
  readonly #baseBufferTarget: number;

  constructor(options: DynamicWalletEngineOptions = {}) {
    this.#exposureLimits = new Map();
    if (options.exposureLimits) {
      for (const [asset, limit] of Object.entries(options.exposureLimits)) {
        this.#exposureLimits.set(normaliseUpper(asset), clamp(Number(limit)));
      }
    }
    this.#baseBufferTarget = clamp(options.baseBufferTarget ?? 0.18);
  }

  registerAccount(account: WalletAccount): void {
    if (this.#accounts.has(account.address)) {
      throw new Error(`wallet ${account.address} already registered`);
    }
    this.#accounts.set(account.address, account);
    this.#balances.set(account.address, new Map());
  }

  ingestBalances(address: string, balances: WalletBalance[]): void {
    const account = this.#requireAccount(address);
    const snapshot = new Map<string, WalletBalance>();
    for (const balance of balances) {
      snapshot.set(balance.asset, balance);
    }
    this.#balances.set(account.address, snapshot);
  }

  evaluateWallet(
    address: string,
    priceMap: Record<string, number>,
  ): WalletSummary {
    const account = this.#requireAccount(address);
    const balances = this.#balances.get(account.address);
    if (!balances || balances.size === 0) {
      throw new Error(`no balances recorded for wallet ${account.address}`);
    }

    const prices: Record<string, number> = {};
    for (const [asset, price] of Object.entries(priceMap)) {
      prices[normaliseUpper(asset)] = Math.max(0, Number(price));
    }

    const exposures: WalletExposure[] = [];
    const alerts: string[] = [];
    let totalValue = 0;
    let availableValue = 0;

    for (const balance of balances.values()) {
      const price = prices[balance.asset];
      const usdValue = price ? balance.total * price : 0;
      if (price === undefined) {
        alerts.push(
          `Missing price for ${balance.asset}; assuming zero valuation`,
        );
      }
      totalValue += usdValue;
      availableValue += (price ?? 0) * balance.available;
      exposures.push({
        asset: balance.asset,
        balanceTotal: balance.total,
        balanceAvailable: balance.available,
        balanceLocked: balance.locked,
        usdValue,
        share: 0,
        utilisation: balance.utilisation,
      });
    }

    let diversification = 1;
    if (totalValue > 0) {
      diversification = 1 - exposures.reduce((acc, exposure) => {
        const share = exposure.usdValue / totalValue;
        return acc + share * share;
      }, 0);
    }

    const actions: WalletAction[] = [];
    exposures.forEach((exposure, index) => {
      const share = totalValue > 0 ? exposure.usdValue / totalValue : 0;
      exposures[index] = { ...exposure, share };
      const limit = this.#exposureLimits.get(exposure.asset);
      if (limit !== undefined && share > limit) {
        actions.push({
          category: "rebalance",
          description: `Reduce ${exposure.asset} exposure to <= ${
            (limit * 100).toFixed(0)
          }% of portfolio (currently ${(share * 100).toFixed(0)}%).`,
          priority: "high",
          metadata: {
            asset: exposure.asset,
            share,
            limit,
          },
        });
      }
    });

    const targetBuffer = Math.max(
      this.#baseBufferTarget,
      RISK_BUFFER_TARGETS[account.riskTier],
    );
    const bufferRatio = totalValue === 0
      ? 1
      : clamp(availableValue / totalValue);
    if (bufferRatio < targetBuffer) {
      actions.push({
        category: "liquidity",
        description: `Increase liquid reserves; buffer below target (${
          (bufferRatio * 100).toFixed(0)
        }% vs ${(targetBuffer * 100).toFixed(0)}%).`,
        priority: account.riskTier === "aggressive" ? "normal" : "high",
        metadata: {
          bufferRatio,
          targetBuffer,
        },
      });
    }

    if (diversification < 0.35 && totalValue > 0) {
      actions.push({
        category: "diversify",
        description:
          "Diversification score is weak; evaluate adding non-correlated assets.",
        priority: "normal",
        metadata: { diversificationScore: diversification },
      });
    }

    return {
      account,
      totalValueUsd: totalValue,
      availableValueUsd: availableValue,
      bufferRatio,
      diversificationScore: clamp(diversification),
      exposures,
      actions,
      alerts,
    };
  }

  #requireAccount(address: string): WalletAccount {
    const key = normaliseUpper(address);
    const account = this.#accounts.get(key);
    if (!account) {
      throw new Error(`wallet ${key} is not registered`);
    }
    return account;
  }
}
