import { getEnvVar } from "@/utils/env.ts";
import { type RateLimitDecisionSummary } from "@/core/telemetry/ai-chat";

export type RateLimitScope = "user" | "session";

interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

interface LimiterResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

interface RateLimiter {
  consume(key: string): Promise<LimiterResult>;
}

class MemoryRateLimiter implements RateLimiter {
  #limit: number;
  #windowMs: number;
  #buckets = new Map<string, { remaining: number; resetAt: number }>();

  constructor(config: RateLimitConfig) {
    this.#limit = config.limit;
    this.#windowMs = config.windowSeconds * 1000;
  }

  async consume(key: string): Promise<LimiterResult> {
    const now = Date.now();
    const bucket = this.#buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      const resetAt = now + this.#windowMs;
      const remaining = Math.max(this.#limit - 1, 0);
      this.#buckets.set(key, { remaining, resetAt });
      return {
        allowed: true,
        limit: this.#limit,
        remaining,
        resetSeconds: Math.ceil(this.#windowMs / 1000),
      };
    }

    if (bucket.remaining <= 0) {
      return {
        allowed: false,
        limit: this.#limit,
        remaining: 0,
        resetSeconds: Math.max(
          1,
          Math.ceil((bucket.resetAt - now) / 1000),
        ),
      };
    }

    bucket.remaining -= 1;
    return {
      allowed: true,
      limit: this.#limit,
      remaining: bucket.remaining,
      resetSeconds: Math.max(
        1,
        Math.ceil((bucket.resetAt - now) / 1000),
      ),
    };
  }

  reset() {
    this.#buckets.clear();
  }
}

let memoryLimiters: Partial<Record<RateLimitScope, MemoryRateLimiter>> = {};

let configCache: Partial<Record<RateLimitScope, RateLimitConfig | null>> = {};

type UpstashRedis = import("@upstash/redis").Redis;

let redisPromise: Promise<UpstashRedis | null> | null = null;
type RatelimitModule = typeof import("@upstash/ratelimit");

let ratelimitModulePromise: Promise<RatelimitModule> | null = null;

const RATE_LIMIT_OVERRIDE_SYMBOL = Symbol.for(
  "dynamic-capital.dynamic-ai.rate-limit",
);

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function loadConfig(scope: RateLimitScope): RateLimitConfig | null {
  if (scope in configCache) {
    return configCache[scope] ?? null;
  }

  if (scope === "user") {
    const limit = parsePositiveInt(
      getEnvVar("DYNAMIC_AI_CHAT_USER_LIMIT"),
      20,
    );
    const windowSeconds = parsePositiveInt(
      getEnvVar("DYNAMIC_AI_CHAT_USER_WINDOW_SECONDS"),
      60,
    );
    const config: RateLimitConfig = { limit, windowSeconds };
    configCache[scope] = config;
    return config;
  }

  const limit = parsePositiveInt(
    getEnvVar("DYNAMIC_AI_CHAT_SESSION_LIMIT"),
    60,
  );
  const windowSeconds = parsePositiveInt(
    getEnvVar("DYNAMIC_AI_CHAT_SESSION_WINDOW_SECONDS"),
    300,
  );
  const config: RateLimitConfig = { limit, windowSeconds };
  configCache[scope] = config;
  return config;
}

async function loadRedisClient(): Promise<UpstashRedis | null> {
  if (redisPromise) return redisPromise;
  const url = getEnvVar("UPSTASH_REDIS_REST_URL");
  const token = getEnvVar("UPSTASH_REDIS_REST_TOKEN");
  if (!url || !token) {
    redisPromise = Promise.resolve(null);
    return redisPromise;
  }
  redisPromise = (async () => {
    const mod = await import("@upstash/redis");
    return new mod.Redis({ url, token });
  })();
  return redisPromise;
}

async function loadRatelimitModule(): Promise<RatelimitModule> {
  if (!ratelimitModulePromise) {
    ratelimitModulePromise = import("@upstash/ratelimit");
  }
  return ratelimitModulePromise;
}

const upstashLimiterCache: Partial<
  Record<RateLimitScope, Promise<RateLimiter | null>>
> = {};

async function createUpstashLimiter(
  scope: RateLimitScope,
  config: RateLimitConfig,
): Promise<RateLimiter | null> {
  try {
    const redis = await loadRedisClient();
    if (!redis) {
      return null;
    }
    const { Ratelimit } = await loadRatelimitModule();
    if (!Ratelimit) {
      return null;
    }
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        config.limit,
        `${config.windowSeconds} s`,
      ),
      prefix: `dynamic-ai:${scope}`,
      analytics: false,
    });

    return {
      async consume(key: string): Promise<LimiterResult> {
        const result = await limiter.limit(key) as {
          success?: boolean;
          allowed?: boolean;
          limit?: number;
          remaining?: number;
          reset?: number;
        };
        return {
          allowed: result.allowed ?? result.success ?? false,
          limit: result.limit ?? config.limit,
          remaining: result.remaining ?? 0,
          resetSeconds: result.reset ?? config.windowSeconds,
        };
      },
    } satisfies RateLimiter;
  } catch (error) {
    console.warn(
      `Failed to initialise Upstash rate limiter for ${scope}`,
      error,
    );
    return null;
  }
}

async function getLimiter(scope: RateLimitScope): Promise<RateLimiter | null> {
  const config = loadConfig(scope);
  if (!config || config.limit <= 0) {
    return null;
  }

  const override = (globalThis as Record<PropertyKey, unknown>)[
    RATE_LIMIT_OVERRIDE_SYMBOL
  ];
  if (typeof override === "function") {
    const handler = override as (
      scope: RateLimitScope,
    ) => RateLimiter | null | Promise<RateLimiter | null>;
    return await handler(scope);
  }

  if (!upstashLimiterCache[scope]) {
    upstashLimiterCache[scope] = (async () => {
      const upstashLimiter = await createUpstashLimiter(scope, config);
      if (upstashLimiter) {
        return upstashLimiter;
      }
      if (!memoryLimiters[scope]) {
        memoryLimiters[scope] = new MemoryRateLimiter(config);
      }
      return memoryLimiters[scope] ?? null;
    })();
  }

  const limiter = await upstashLimiterCache[scope]!;
  return limiter;
}

export interface RateLimitContext {
  userId?: string;
  sessionId: string;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  decisions: RateLimitDecisionSummary[];
}

function buildDecision(
  scope: RateLimitScope,
  result: LimiterResult,
): RateLimitDecisionSummary {
  return {
    scope,
    limit: result.limit,
    remaining: Math.max(result.remaining, 0),
    resetSeconds: Math.max(result.resetSeconds, 0),
    blocked: !result.allowed,
  };
}

export async function enforceDynamicAiRateLimit(
  context: RateLimitContext,
): Promise<RateLimitCheckResult> {
  const decisions: RateLimitDecisionSummary[] = [];

  const tasks: Array<Promise<void>> = [];

  const userLimiterPromise = getLimiter("user");
  const sessionLimiterPromise = getLimiter("session");

  const userKey = context.userId
    ? `user:${context.userId}`
    : `session:${context.sessionId}`;
  const sessionKey = `session:${context.sessionId}`;

  const userLimiter = await userLimiterPromise;
  if (userLimiter) {
    tasks.push(
      userLimiter.consume(userKey).then((result) => {
        decisions.push(buildDecision("user", result));
      }),
    );
  }

  const sessionLimiter = await sessionLimiterPromise;
  if (sessionLimiter) {
    tasks.push(
      sessionLimiter.consume(sessionKey).then((result) => {
        decisions.push(buildDecision("session", result));
      }),
    );
  }

  await Promise.all(tasks);

  const allowed = decisions.every((decision) => !decision.blocked);

  return { allowed, decisions };
}

export function resetDynamicAiRateLimiters() {
  for (const limiter of Object.values(memoryLimiters)) {
    limiter?.reset();
  }
  memoryLimiters = {};
  configCache = {};
  upstashLimiterCache.user = undefined;
  upstashLimiterCache.session = undefined;
  redisPromise = null;
  ratelimitModulePromise = null;
}
