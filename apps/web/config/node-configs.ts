/**
 * Load dynamic node configurations from environment variables.
 *
 * The configuration mirrors the `node_configs` Supabase table so workers and
 * local scripts can bootstrap orchestration without querying the database.
 * Each environment variable with the `NODE_CONFIG__` prefix is treated as a
 * JSON payload describing a node. The suffix becomes the fallback `node_id`
 * when the payload omits it.
 */

declare const process:
  | { env?: Record<string, string | undefined> }
  | undefined;
declare const Deno:
  | {
    env?: {
      toObject?(): Record<string, string>;
      get?(name: string): string | undefined;
    };
  }
  | undefined;

const NODE_CONFIG_ENV_PREFIX = "NODE_CONFIG__" as const;
const VALID_NODE_TYPES = [
  "ingestion",
  "processing",
  "policy",
  "community",
] as const;

export type NodeType = (typeof VALID_NODE_TYPES)[number];

export interface NodeConfig {
  nodeId: string;
  type: NodeType;
  enabled: boolean;
  intervalSec: number;
  dependencies: string[];
  outputs: string[];
  metadata: Record<string, unknown>;
  weight: number | null;
}

export interface NodeConfigParseError {
  key: string;
  message: string;
}

export interface LoadNodeConfigsResult {
  configs: NodeConfig[];
  errors: NodeConfigParseError[];
}

export interface LoadNodeConfigsOptions {
  prefix?: string;
  snapshot?: Record<string, string | undefined>;
}

function sanitizeString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    const text = String(value).trim();
    return text.length > 0 ? text : undefined;
  }
  return undefined;
}

function normalizeCollection(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const normalised: string[] = [];
  for (const entry of value) {
    const text = sanitizeString(entry);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    normalised.push(text);
  }
  return normalised;
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return { ...(value as Record<string, unknown>) };
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (!lowered) return fallback;
    if (["false", "0", "no", "off", "disabled"].includes(lowered)) {
      return false;
    }
    if (["true", "1", "yes", "on", "enabled"].includes(lowered)) {
      return true;
    }
  }
  return fallback;
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function ensureInterval(value: unknown, nodeId: string): number {
  const parsed = parseNumber(value);
  if (parsed === undefined) {
    throw new Error(
      `Node config ${nodeId} is missing required field 'interval_sec'`,
    );
  }
  const integer = Math.trunc(parsed);
  if (integer <= 0) {
    throw new Error(
      `Node config ${nodeId} must specify a positive interval_sec value`,
    );
  }
  return integer;
}

function deriveNodeIdFromKey(key: string, prefix: string): string {
  if (!key.startsWith(prefix)) {
    throw new Error(
      `Node config key '${key}' does not start with expected prefix '${prefix}'`,
    );
  }
  const suffix = key.slice(prefix.length);
  const slug = suffix
    .replace(/^[^A-Za-z0-9]+/, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/-$/, "")
    .toLowerCase();
  if (!slug) {
    throw new Error(`Could not derive node_id from environment key '${key}'`);
  }
  return slug;
}

function resolveEnvSnapshot(): Record<string, string> {
  const snapshot: Record<string, string> = {};
  if (typeof process !== "undefined" && process?.env) {
    for (const [key, value] of Object.entries(process.env)) {
      if (typeof value === "string") {
        snapshot[key] = value;
      }
    }
  }
  if (typeof Deno !== "undefined") {
    const envApi = Deno.env;
    if (envApi && typeof envApi.toObject === "function") {
      try {
        const entries = envApi.toObject();
        for (const [key, value] of Object.entries(entries)) {
          if (typeof value === "string" && !(key in snapshot)) {
            snapshot[key] = value;
          }
        }
      } catch {
        // Access to Deno.env.toObject may be restricted; ignore.
      }
    }
  }
  return snapshot;
}

export function parseNodeConfigValue(
  key: string,
  rawValue: string,
  options: { prefix?: string } = {},
): NodeConfig {
  const prefix = options.prefix ?? NODE_CONFIG_ENV_PREFIX;
  let payload: unknown;
  try {
    payload = JSON.parse(rawValue);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON for ${key}: ${message}`);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`Node config ${key} must be a JSON object`);
  }

  const data = payload as Record<string, unknown>;

  const explicitId = sanitizeString(data.node_id ?? data.nodeId);
  const nodeId = explicitId ?? deriveNodeIdFromKey(key, prefix);

  const typeRaw = sanitizeString(data.type);
  if (!typeRaw) {
    throw new Error(`Node config ${nodeId} is missing required field 'type'`);
  }
  const normalisedType = typeRaw.toLowerCase();
  if (!VALID_NODE_TYPES.includes(normalisedType as NodeType)) {
    throw new Error(
      `Node config ${nodeId} has unsupported type '${typeRaw}'. Expected one of ${
        VALID_NODE_TYPES.join(", ")
      }`,
    );
  }

  const interval = ensureInterval(
    data.interval_sec ?? data.intervalSec,
    nodeId,
  );
  const enabled = parseBoolean(data.enabled, true);
  const dependencies = normalizeCollection(data.dependencies ?? data.deps);
  const outputs = normalizeCollection(
    data.outputs ?? data.result ?? data.output,
  );
  const metadata = normalizeMetadata(data.metadata);

  const weightNumber = data.weight === undefined
    ? undefined
    : parseNumber(data.weight);
  const weight = weightNumber === undefined ? null : weightNumber;

  return {
    nodeId,
    type: normalisedType as NodeType,
    enabled,
    intervalSec: interval,
    dependencies,
    outputs,
    metadata,
    weight,
  };
}

export function loadNodeConfigsFromEnv(
  options: LoadNodeConfigsOptions = {},
): LoadNodeConfigsResult {
  const prefix = options.prefix ?? NODE_CONFIG_ENV_PREFIX;
  const snapshot = options.snapshot ?? resolveEnvSnapshot();
  const configs: NodeConfig[] = [];
  const errors: NodeConfigParseError[] = [];

  for (const [key, value] of Object.entries(snapshot)) {
    if (!key.startsWith(prefix)) continue;
    if (typeof value !== "string") continue;
    try {
      const config = parseNodeConfigValue(key, value, { prefix });
      configs.push(config);
    } catch (error) {
      errors.push({
        key,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  configs.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  return { configs, errors };
}

export { NODE_CONFIG_ENV_PREFIX };
