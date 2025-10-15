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

function normalizeLog(
  entry: Record<string, unknown>,
  fallbackFunction: string,
): NormalizedLog {
  const metadata = typeof entry.metadata === "object" && entry.metadata !== null
    ? entry.metadata as Record<string, unknown>
    : undefined;
  const timestamp = typeof entry.timestamp === "string"
    ? entry.timestamp
    : typeof entry.time === "string"
    ? entry.time
    : typeof entry.inserted_at === "string"
    ? entry.inserted_at
    : typeof metadata?.timestamp === "string"
    ? metadata.timestamp
    : null;
  const status = typeof entry.status === "number"
    ? entry.status
    : typeof metadata?.status_code === "number"
    ? metadata.status_code
    : typeof metadata?.status === "number"
    ? metadata.status
    : null;
  const method = typeof entry.method === "string"
    ? entry.method
    : typeof metadata?.method === "string"
    ? metadata.method
    : typeof metadata?.http_method === "string"
    ? metadata.http_method
    : null;
  const path = typeof entry.path === "string"
    ? entry.path
    : typeof metadata?.path === "string"
    ? metadata.path
    : typeof metadata?.request_path === "string"
    ? metadata.request_path
    : null;
  const message = typeof entry.event_message === "string"
    ? entry.event_message
    : typeof entry.message === "string"
    ? entry.message
    : typeof metadata?.event_message === "string"
    ? metadata.event_message
    : typeof metadata?.error === "string"
    ? metadata.error
    : null;
  const functionName = typeof entry.function_name === "string"
    ? entry.function_name
    : typeof metadata?.function_name === "string"
    ? metadata.function_name
    : fallbackFunction;

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
