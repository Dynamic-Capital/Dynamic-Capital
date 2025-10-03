import { readFile } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_CONFIG_URL = new URL("./config.json", import.meta.url);

type LogLevel = "debug" | "info" | "warn" | "error";

export type OutcomeLogger = (
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
) => void;

export interface BuybackBotConfig {
  venueAllowlist: string[];
  venueCaps: Record<string, number>;
  rateLimitPerMinute: number;
}

export interface BuybackBotInitOptions {
  configPath?: string | URL;
  logger?: OutcomeLogger;
}

interface BuybackConfigSource {
  configPath?: string | URL;
}

interface OrderSubmission {
  venue: string;
  asset: string;
  amount: number;
}

interface OrderExecution {
  status: "filled" | "rejected";
  executedAmount: number;
  reason?: string;
}

export interface OrderRequest {
  venue: string;
  asset: string;
  amount: number;
}

export interface OrderResult {
  status: "filled" | "rejected" | "rate_limited";
  venue: string;
  requestedAmount: number;
  executedAmount: number;
  reason?: string;
}

interface RateLimitWindowState {
  startedAt: number;
  usedSlots: number;
}

export class BuybackBot {
  private readonly allowlistedVenues: Set<string>;
  private readonly rateLimitWindows = new Map<string, RateLimitWindowState>();

  constructor(
    private readonly config: BuybackBotConfig,
    private readonly logger?: OutcomeLogger,
  ) {
    this.allowlistedVenues = new Set(config.venueAllowlist);
  }

  async fetchBurnTarget(): Promise<number | null> {
    this.logOutcome("debug", "Fetching burn target from treasury inputs");
    return null;
  }

  async placeOrder(request: OrderRequest): Promise<OrderResult> {
    if (!this.isVenueAllowed(request.venue)) {
      this.logOutcome("warn", "Rejected order: venue not allowlisted", {
        venue: request.venue,
      });
      return {
        status: "rejected",
        venue: request.venue,
        requestedAmount: request.amount,
        executedAmount: 0,
        reason: "VENUE_NOT_ALLOWLISTED",
      };
    }

    if (!this.isAmountValid(request.amount)) {
      this.logOutcome("warn", "Rejected order: invalid order amount", {
        venue: request.venue,
        amount: request.amount,
      });
      return {
        status: "rejected",
        venue: request.venue,
        requestedAmount: request.amount,
        executedAmount: 0,
        reason: "INVALID_AMOUNT",
      };
    }

    if (!this.consumeRateLimitSlot(request.venue)) {
      this.logOutcome("warn", "Rejected order: rate limit exceeded", {
        venue: request.venue,
      });
      return {
        status: "rate_limited",
        venue: request.venue,
        requestedAmount: request.amount,
        executedAmount: 0,
        reason: "RATE_LIMIT_EXCEEDED",
      };
    }

    const cappedAmount = this.getCappedAmount(request.venue, request.amount);
    const execution = await this.executeOrder({
      venue: request.venue,
      asset: request.asset,
      amount: cappedAmount,
    });

    const result: OrderResult = {
      status: execution.status === "rejected" ? "rejected" : "filled",
      venue: request.venue,
      requestedAmount: request.amount,
      executedAmount: execution.executedAmount,
      reason: execution.reason,
    };

    this.logOutcome("info", "Processed buyback order", {
      venue: result.venue,
      requestedAmount: result.requestedAmount,
      executedAmount: result.executedAmount,
      status: result.status,
      reason: result.reason,
    });

    return result;
  }

  private isVenueAllowed(venue: string): boolean {
    return this.allowlistedVenues.has(venue);
  }

  private isAmountValid(amount: number): boolean {
    return Number.isFinite(amount) && amount > 0;
  }

  private getCappedAmount(venue: string, amount: number): number {
    const cap = this.config.venueCaps[venue];
    if (typeof cap !== "number") {
      return amount;
    }

    return Math.min(cap, amount);
  }

  private consumeRateLimitSlot(venue: string): boolean {
    if (this.config.rateLimitPerMinute <= 0) {
      return true;
    }

    const now = Date.now();
    const window = this.rateLimitWindows.get(venue);

    if (!window || now - window.startedAt >= 60_000) {
      this.rateLimitWindows.set(venue, {
        startedAt: now,
        usedSlots: 1,
      });
      return true;
    }

    if (window.usedSlots >= this.config.rateLimitPerMinute) {
      return false;
    }

    window.usedSlots += 1;
    return true;
  }

  protected async executeOrder(
    order: OrderSubmission,
  ): Promise<OrderExecution> {
    this.logOutcome("debug", "Executing order with trading venue", order);
    return {
      status: "filled",
      executedAmount: order.amount,
      reason: order.amount ? undefined : "NO_AMOUNT_PROVIDED",
    };
  }

  private logOutcome(
    level: LogLevel,
    message: string,
    context: Record<string, unknown> = {},
  ): void {
    if (this.logger) {
      this.logger(level, message, context);
      return;
    }

    const method: keyof Console = level === "debug"
      ? "debug"
      : level === "info"
      ? "info"
      : level === "warn"
      ? "warn"
      : "error";

    const consoleMethod = console[method] ?? console.log;
    consoleMethod.call(console, `[buyback] ${message}`, context);
  }
}

export async function createBuybackBot(
  options: BuybackBotInitOptions = {},
): Promise<BuybackBot> {
  const config = await loadBuybackConfig({ configPath: options.configPath });
  return new BuybackBot(config, options.logger);
}

export async function loadBuybackConfig(
  options: BuybackConfigSource = {},
): Promise<BuybackBotConfig> {
  const configUrl = resolveConfigUrl(options.configPath);
  const fileConfig = await readConfigFromFile(configUrl);

  const allowlist = parseAllowlist(
    process.env.BUYBACK_VENUE_ALLOWLIST ?? fileConfig.venueAllowlist,
  ) ?? [];

  const caps = parseVenueCaps(
    process.env.BUYBACK_VENUE_CAPS ?? fileConfig.venueCaps,
  );

  const rateLimit = parseRateLimit(
    process.env.BUYBACK_RATE_LIMIT_PER_MINUTE ?? fileConfig.rateLimitPerMinute,
  );

  return {
    venueAllowlist: allowlist,
    venueCaps: caps,
    rateLimitPerMinute: rateLimit,
  };
}

async function readConfigFromFile(
  url: URL,
): Promise<Partial<BuybackBotConfig>> {
  try {
    const contents = await readFile(url, "utf-8");
    return JSON.parse(contents) as Partial<BuybackBotConfig>;
  } catch (error) {
    if (isMissingFileError(error)) {
      return {};
    }

    throw error;
  }
}

function resolveConfigUrl(path?: string | URL): URL {
  if (!path) {
    return DEFAULT_CONFIG_URL;
  }

  if (path instanceof URL) {
    return path;
  }

  if (path.startsWith("file://")) {
    return new URL(path);
  }

  return pathToFileURL(resolvePath(path));
}

function parseAllowlist(value: unknown): string[] | undefined {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return undefined;
}

function parseVenueCaps(value: unknown): Record<string, number> {
  if (!value) {
    return {};
  }

  let source: Record<string, unknown>;

  if (typeof value === "string") {
    if (!value.trim()) {
      return {};
    }

    try {
      source = JSON.parse(value) as Record<string, unknown>;
    } catch (error) {
      throw new Error("BUYBACK_VENUE_CAPS must be valid JSON");
    }
  } else {
    source = value as Record<string, unknown>;
  }

  const caps: Record<string, number> = {};
  for (const [venue, cap] of Object.entries(source)) {
    const numericCap = typeof cap === "number" ? cap : Number(cap);
    if (!Number.isFinite(numericCap) || numericCap < 0) {
      throw new Error(`Invalid order cap for venue "${venue}"`);
    }

    caps[venue] = numericCap;
  }

  return caps;
}

function parseRateLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error("BUYBACK_RATE_LIMIT_PER_MINUTE must be a positive number");
  }

  return numeric;
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return Boolean(
    error && typeof error === "object" && "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT",
  );
}
