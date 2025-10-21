#!/usr/bin/env -S deno run --allow-env --allow-net
import { parse } from "https://deno.land/std@0.224.0/flags/mod.ts";

const projectRef = Deno.env.get("SUPABASE_PROJECT_REF");
if (!projectRef) {
  console.error("SUPABASE_PROJECT_REF is required");
  Deno.exit(1);
}

const accessToken = Deno.env.get("SUPABASE_ACCESS_TOKEN");
if (!accessToken) {
  console.error("SUPABASE_ACCESS_TOKEN is required");
  Deno.exit(1);
}

const flags = parse(Deno.args, {
  string: ["since", "limit"],
  boolean: ["json"],
  alias: {
    s: "since",
    l: "limit",
  },
  default: {
    since: "60",
    limit: "100",
  },
});

const sinceMinutes = Number(flags.since);
if (!Number.isFinite(sinceMinutes) || sinceMinutes <= 0) {
  console.error("--since must be a positive number of minutes");
  Deno.exit(1);
}

const limit = Number(flags.limit);
if (!Number.isFinite(limit) || limit <= 0) {
  console.error("--limit must be a positive integer");
  Deno.exit(1);
}

const functions = flags._.length > 0
  ? flags._.map((value) => String(value))
  : ["verify-initdata", "verify-telegram"];

const sinceIso = new Date(Date.now() - sinceMinutes * 60_000).toISOString();

const LOG_SELECT_COLUMNS = [
  "timestamp",
  "event_message",
  "metadata",
  "context",
  "request_id",
  "level",
];

interface FunctionDescriptor {
  id: string | null;
  name: string;
  slug: string | null;
}

function normalizeFunctionDescriptor(
  entry: Record<string, unknown>,
): FunctionDescriptor | null {
  const id = typeof entry.id === "string" ? entry.id : null;
  const name = typeof entry.name === "string"
    ? entry.name
    : typeof entry.slug === "string"
    ? entry.slug
    : null;
  if (!name) {
    return null;
  }
  const slug = typeof entry.slug === "string" ? entry.slug : null;
  return { id, name, slug };
}

async function fetchFunctionDescriptors(): Promise<
  Map<string, FunctionDescriptor>
> {
  const url = new URL(
    `https://api.supabase.com/v1/projects/${projectRef}/functions`,
  );
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.warn(
      `Warning: failed to enumerate functions (${response.status} ${response.statusText}). Logs will be fetched without metadata.\n${text}`
        .trim(),
    );
    return new Map();
  }

  const payload = await response.json();
  const rawEntries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.functions)
    ? payload.functions
    : [];

  const descriptors = new Map<string, FunctionDescriptor>();
  for (const rawEntry of rawEntries) {
    if (!rawEntry || typeof rawEntry !== "object") continue;
    const descriptor = normalizeFunctionDescriptor(
      rawEntry as Record<string, unknown>,
    );
    if (!descriptor) continue;
    descriptors.set(descriptor.name, descriptor);
    if (descriptor.slug && descriptor.slug !== descriptor.name) {
      descriptors.set(descriptor.slug, descriptor);
    }
  }

  return descriptors;
}

const functionDescriptors = await fetchFunctionDescriptors();

interface NormalizedLog {
  timestamp: string | null;
  status: number | null;
  method: string | null;
  path: string | null;
  functionName: string;
  message: string | null;
}

function summarizeStatusCounts(
  logs: NormalizedLog[],
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const log of logs) {
    if (typeof log.status === "number" && Number.isFinite(log.status)) {
      counts.set(log.status, (counts.get(log.status) ?? 0) + 1);
    }
  }
  return counts;
}

function formatStatusCounts(counts: Map<number, number>): string {
  const entries = [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([status, count]) => `${status}:${count}`);
  return entries.join(", ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeRecords(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): void {
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key];
    if (isRecord(value)) {
      if (isRecord(existing)) {
        mergeRecords(existing, value);
      } else if (existing === undefined) {
        const clone: Record<string, unknown> = {};
        mergeRecords(clone, value);
        target[key] = clone;
      }
      continue;
    }
    if (existing === undefined) {
      target[key] = value;
    }
  }
}

function coerceContext(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!value) return undefined;
  const segments = Array.isArray(value) ? value : [value];
  const merged: Record<string, unknown> = {};
  for (const segment of segments) {
    if (!isRecord(segment)) continue;
    mergeRecords(merged, segment);
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function readValue(
  source: Record<string, unknown>,
  key: string,
): unknown {
  if (key.includes(".")) {
    const parts = key.split(".");
    let current: unknown = source;
    for (const part of parts) {
      if (Array.isArray(current)) {
        const index = Number(part);
        if (!Number.isInteger(index) || index < 0 || index >= current.length) {
          return undefined;
        }
        current = current[index];
        continue;
      }
      if (!isRecord(current)) return undefined;
      current = current[part];
      if (current === undefined) return undefined;
    }
    return current;
  }
  return source[key];
}

function pickString(
  keys: string[],
  sources: Array<Record<string, unknown> | undefined>,
): string | null {
  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      const value = readValue(source, key);
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
    }
  }
  return null;
}

function pickNumber(
  keys: string[],
  sources: Array<Record<string, unknown> | undefined>,
): number | null {
  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      const value = readValue(source, key);
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
  }
  return null;
}

function normalizeLog(
  entry: Record<string, unknown>,
  fallbackFunction: string,
): NormalizedLog {
  const metadata = isRecord(entry.metadata) ? { ...entry.metadata } : undefined;
  const context = coerceContext(entry.context);
  const sources: Array<Record<string, unknown> | undefined> = [
    entry,
    metadata,
    context,
  ];

  const timestamp = pickString([
    "timestamp",
    "time",
    "inserted_at",
    "event_timestamp",
    "datetime",
  ], sources);
  const status = pickNumber([
    "status",
    "status_code",
    "statusCode",
    "http_status",
    "httpRequest.status",
    "http.response.status_code",
  ], sources);
  const method = pickString([
    "method",
    "http_method",
    "http.method",
    "httpRequest.requestMethod",
    "request.method",
  ], sources);
  const path = pickString([
    "path",
    "request_path",
    "httpRequest.requestUrl",
    "http.request.url",
    "request.path",
    "request.url",
  ], sources);
  const message = pickString([
    "event_message",
    "message",
    "text",
    "body",
    "error",
    "error_message",
  ], sources);
  const functionName = pickString([
    "function_name",
    "function",
    "labels.function_name",
    "httpRequest.server",
  ], sources) ?? fallbackFunction;

  return {
    timestamp,
    status,
    method,
    path,
    functionName,
    message,
  };
}

function buildResponseHint(status: number): string | null {
  if (status === 401 || status === 403) {
    return "Supabase rejected the request. Confirm SUPABASE_ACCESS_TOKEN has edge function log access and SUPABASE_PROJECT_REF is correct.";
  }
  if (status === 404) {
    return "Supabase could not find the requested edge function. Double-check the function name and deployment status.";
  }
  return null;
}

interface FetchLogsResult {
  logs: NormalizedLog[];
  warning?: string;
}

async function fetchLogs(functionName: string): Promise<FetchLogsResult> {
  const descriptor = functionDescriptors.get(functionName);
  const url = new URL(
    `https://api.supabase.com/v1/projects/${projectRef}/logs`,
  );
  url.searchParams.set("resource", "edge_function");
  url.searchParams.set("function_name", functionName);
  if (descriptor?.id) {
    url.searchParams.set("function_id", descriptor.id);
  }
  if (descriptor?.slug && descriptor.slug !== functionName) {
    url.searchParams.set("identifier", descriptor.slug);
  }
  url.searchParams.set("since", sinceIso);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("order", "desc");
  url.searchParams.set("select", LOG_SELECT_COLUMNS.join(","));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    const hint = buildResponseHint(response.status);
    const suffix = text.trim().length > 0 ? `\n${text}` : "";
    const hintSuffix = hint ? `\nHint: ${hint}` : "";
    const message =
      `Failed to fetch logs for ${functionName}: ${response.status} ${response.statusText}${hintSuffix}${suffix}`;
    if (response.status === 404) {
      return { logs: [], warning: message };
    }
    throw new Error(message);
  }

  const payload = await response.json();
  const rawEntries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.result)
    ? payload.result
    : [];

  const logs = rawEntries
    .filter((entry): entry is Record<string, unknown> =>
      entry && typeof entry === "object"
    )
    .map((entry) => normalizeLog(entry, functionName));

  return { logs };
}

function formatLog(log: NormalizedLog): string {
  const timestamp = log.timestamp ?? "unknown-time";
  const status = log.status !== null ? String(log.status) : "?";
  const method = log.method ?? "?";
  const path = log.path ?? "?";
  const message = log.message ?? "(no message)";
  return `${timestamp} [${status}] ${method} ${path} → ${message}`;
}

async function main() {
  for (const fn of functions) {
    const { logs, warning } = await fetchLogs(fn);
    if (warning) {
      console.warn(warning);
    }
    const total = logs.length;
    const unauthorized = logs.filter((log) =>
      log.status === 401 ||
      (log.message?.includes("401") ?? false)
    ).length;
    const statusCounts = summarizeStatusCounts(logs);

    console.log(
      `\n=== ${fn} (${total} entries, ${unauthorized} status 401) ===`,
    );
    if (flags.json) {
      console.log(JSON.stringify({ function: fn, entries: logs }, null, 2));
      continue;
    }

    if (statusCounts.size > 0) {
      console.log(`Status counts: ${formatStatusCounts(statusCounts)}`);
    }

    if (total === 0) {
      console.log("No logs in the selected window.");
      continue;
    }

    const preview = logs.slice(0, Math.min(10, logs.length));
    for (const entry of preview) {
      console.log(formatLog(entry));
    }
  }
}

try {
  await main();
} catch (error) {
  if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
  } else {
    console.error("Unexpected error while fetching logs", error);
  }
  Deno.exit(1);
}
