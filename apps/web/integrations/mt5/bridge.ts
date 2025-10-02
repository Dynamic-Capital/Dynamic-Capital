import { getEnvVar, optionalEnvVar } from "@/utils/env.ts";
import type { NormalizedTradingSignal } from "@/integrations/tradingview/alert.ts";

export interface Mt5BridgeClientOptions {
  baseUrl?: string;
  authToken?: string;
}

export interface BridgeHealthResponse {
  status: "ok" | "error";
  commit?: string;
}

export interface BridgeDispatchResponse {
  dispatchId: string;
  status: string;
}

function resolveBaseUrl(explicit?: string): string {
  if (explicit) return explicit.replace(/\/$/, "");
  const host = optionalEnvVar("BRIDGE_HOST");
  if (!host) return "https://bridge.dynamiccapital.ton";
  if (host.startsWith("http://") || host.startsWith("https://")) {
    return host.replace(/\/$/, "");
  }
  return `https://${host}`.replace(/\/$/, "");
}

export class Mt5BridgeClient {
  readonly baseUrl: string;
  readonly authToken?: string;

  constructor(options: Mt5BridgeClientOptions = {}) {
    this.baseUrl = resolveBaseUrl(options.baseUrl);
    this.authToken = options.authToken ??
      optionalEnvVar("MT5_BRIDGE_WORKER_ID") ?? undefined;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (this.authToken) {
      headers.authorization = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  async health(): Promise<BridgeHealthResponse> {
    const res = await fetch(`${this.baseUrl}/healthz`, {
      headers: this.buildHeaders(),
      method: "GET",
    });
    if (!res.ok) {
      throw new Error(`Bridge healthcheck failed: ${res.status}`);
    }
    return (await res.json()) as BridgeHealthResponse;
  }

  async dispatchSignal(
    signal: NormalizedTradingSignal,
  ): Promise<BridgeDispatchResponse> {
    const payload = {
      signal,
      source: "supabase-edge",
      requestedAt: new Date().toISOString(),
      projectRef: optionalEnvVar("SUPABASE_PROJECT_REF"),
    };
    const res = await fetch(`${this.baseUrl}/api/signals`, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Bridge dispatch failed: ${res.status} ${text}`);
    }
    return (await res.json()) as BridgeDispatchResponse;
  }
}

export function getRequiredBridgeCredentials() {
  return {
    host: resolveBaseUrl(),
    workerId: getEnvVar("MT5_BRIDGE_WORKER_ID"),
    sshKey: getEnvVar("BRIDGE_SSH_KEY"),
    sshUser: getEnvVar("BRIDGE_USER"),
  } as const;
}
