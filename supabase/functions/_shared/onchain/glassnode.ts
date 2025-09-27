import { maybe, need } from "../env.ts";
import type { OnchainMetric } from "./types.ts";

const DEFAULT_BASE = "https://api.glassnode.com/v1/";

function getBaseUrl(): string {
  const base = maybe("GLASSNODE_API_BASE_URL") ?? DEFAULT_BASE;
  return base.endsWith("/") ? base : `${base}/`;
}

async function glassnodeRequest<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(path.replace(/^\//, ""), getBaseUrl());
  url.searchParams.set("api_key", need("GLASSNODE_API_KEY"));
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Glassnode request failed (${res.status}): ${text}`);
  }
  return await res.json() as T;
}

export interface GlassnodeMetricOptions {
  asset?: string;
  since?: number;
  until?: number;
  interval?: string;
  currency?: string;
}

export async function fetchGlassnodeMetric(
  metricPath: string,
  opts: GlassnodeMetricOptions = {},
): Promise<OnchainMetric[]> {
  const resp = await glassnodeRequest<Array<Record<string, unknown>>>(
    `metrics/${metricPath}`,
    {
      a: opts.asset,
      s: opts.since,
      u: opts.until,
      i: opts.interval,
      c: opts.currency,
    },
  );
  const now = new Date();
  return resp.map((row) => {
    const value = typeof row.v === "number" ? row.v : Number(row.value ?? 0);
    const ts = row.t ?? row.timestamp ?? now.getTime() / 1000;
    const observedAt = typeof ts === "number"
      ? new Date(ts * 1000).toISOString()
      : new Date(String(ts)).toISOString();
    const tags: Record<string, string> = {};
    if (row.a) tags.asset = String(row.a);
    if (row.i) tags.interval = String(row.i);
    if (opts.currency) tags.currency = opts.currency;
    return {
      provider: "glassnode",
      metric: metricPath,
      value,
      unit: typeof row.u === "string" ? row.u : undefined,
      observedAt,
      tags: Object.keys(tags).length ? tags : undefined,
      raw: row,
    };
  });
}
