import { functionUrl } from "../_shared/edge.ts";
import { optionalEnv } from "../_shared/env.ts";
import type { HealthStatus } from "../_shared/health.ts";

const PROTOCOL_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;

type MiniAppUrlSource = "env" | "auto" | null;

type FetchLike = typeof fetch;

export interface MiniAppUrlResolution {
  url: string | null;
  source: MiniAppUrlSource;
  raw: string | null;
  reason?: string;
}

export interface MiniAppEndpointSnapshot {
  ok?: boolean;
  status?: number;
  error?: string;
}

export interface MiniAppLiveMetadata {
  url: string | null;
  source: MiniAppUrlSource;
  raw: string | null;
  reason?: string;
  head?: MiniAppEndpointSnapshot;
  version?: MiniAppEndpointSnapshot;
}

export interface CheckMiniAppLiveOptions {
  fetchImpl?: FetchLike;
  versionPath?: string;
}

export interface MiniAppLiveResult {
  status: HealthStatus;
  message: string;
  metadata: MiniAppLiveMetadata;
}

function ensureProtocol(value: string): string {
  return PROTOCOL_PATTERN.test(value) ? value : `https://${value}`;
}

export function normalizeMiniAppUrl(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const candidate = ensureProtocol(trimmed);

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:") return null;
    if (!parsed.pathname || parsed.pathname === "/") {
      parsed.pathname = "/";
    } else if (
      !parsed.pathname.endsWith("/") &&
      !parsed.search &&
      !parsed.hash
    ) {
      parsed.pathname = `${parsed.pathname}/`;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function resolveMiniAppUrl(): MiniAppUrlResolution {
  const envValue = optionalEnv("MINI_APP_URL");
  if (envValue) {
    const normalized = normalizeMiniAppUrl(envValue);
    if (normalized) {
      return { url: normalized, source: "env", raw: envValue };
    }
    return {
      url: null,
      source: "env",
      raw: envValue,
      reason: "Invalid MINI_APP_URL value",
    };
  }

  const auto = functionUrl("miniapp");
  if (auto) {
    const normalized = normalizeMiniAppUrl(auto);
    if (normalized) {
      return { url: normalized, source: "auto", raw: auto };
    }
    return {
      url: null,
      source: "auto",
      raw: auto,
      reason: "Auto-derived mini app URL was invalid",
    };
  }

  return {
    url: null,
    source: null,
    raw: null,
    reason: "Mini app URL not configured",
  };
}

function pickStatus(res: Response): MiniAppEndpointSnapshot {
  return {
    ok: res.ok || (res.status >= 200 && res.status < 400),
    status: res.status,
  };
}

function snapshotError(error: unknown): MiniAppEndpointSnapshot {
  return {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  };
}

export async function checkMiniAppLive(
  options: CheckMiniAppLiveOptions = {},
): Promise<MiniAppLiveResult> {
  const resolution = resolveMiniAppUrl();
  const metadata: MiniAppLiveMetadata = {
    url: resolution.url,
    source: resolution.source,
    raw: resolution.raw,
    ...(resolution.reason ? { reason: resolution.reason } : {}),
  };

  if (!resolution.url) {
    const status: HealthStatus = resolution.source ? "error" : "warning";
    return {
      status,
      message: resolution.reason ?? "Mini app URL not configured",
      metadata,
    };
  }

  const fetchImpl: FetchLike = options.fetchImpl ?? fetch;
  const versionPath = options.versionPath ?? "version";
  const versionUrl = new URL(versionPath, resolution.url).toString();

  try {
    const headResponse = await fetchImpl(resolution.url, { method: "HEAD" });
    metadata.head = pickStatus(headResponse);
    if (!metadata.head.ok) {
      return {
        status: "warning",
        message: `Mini app responded with status ${headResponse.status}`,
        metadata,
      };
    }
  } catch (error) {
    metadata.head = snapshotError(error);
    return {
      status: "error",
      message: `Mini app HEAD request failed: ${metadata.head.error}`,
      metadata,
    };
  }

  try {
    const versionResponse = await fetchImpl(versionUrl, { method: "GET" });
    metadata.version = pickStatus(versionResponse);
    if (!metadata.version.ok) {
      return {
        status: "warning",
        message:
          `Mini app version endpoint returned status ${versionResponse.status}`,
        metadata,
      };
    }
  } catch (error) {
    metadata.version = snapshotError(error);
    return {
      status: "warning",
      message: `Mini app version request failed: ${metadata.version.error}`,
      metadata,
    };
  }

  return {
    status: "healthy",
    message: "Mini app reachable",
    metadata,
  };
}
