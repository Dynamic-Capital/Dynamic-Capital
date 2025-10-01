import { getEnvVar } from "@/utils/env.ts";

export const BINANCE_PAY_API_URL = "https://bpay.binanceapi.com";

export interface BinancePayCredentials {
  apiKey: string;
  secretKey: string;
}

export interface BinancePayHeaders {
  "x-binancepay-timestamp": string;
  "x-binancepay-nonce": string;
  "x-binancepay-signature": string;
  "x-binancepay-serial"?: string;
}

export interface BinancePayCallbackContext {
  body: string;
  headers: BinancePayHeaders;
  secretKey: string;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

async function hmacSha512(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  return toHex(signature);
}

export async function createSignature(
  timestamp: string,
  nonce: string,
  body: string,
  secretKey: string,
): Promise<string> {
  const payload = `${timestamp}\n${nonce}\n${body}\n`;
  return await hmacSha512(secretKey, payload);
}

export async function verifyCallbackSignature(
  context: BinancePayCallbackContext,
): Promise<boolean> {
  const expected = await createSignature(
    context.headers["x-binancepay-timestamp"],
    context.headers["x-binancepay-nonce"],
    context.body,
    context.secretKey,
  );
  return expected === context.headers["x-binancepay-signature"];
}

export function readCallbackHeaders(req: Request): BinancePayHeaders {
  const headers = req.headers;
  return {
    "x-binancepay-timestamp": headers.get("x-binancepay-timestamp") ?? "",
    "x-binancepay-nonce": headers.get("x-binancepay-nonce") ?? "",
    "x-binancepay-signature": headers.get("x-binancepay-signature") ?? "",
    "x-binancepay-serial": headers.get("x-binancepay-serial") ?? undefined,
  };
}

export function getBinancePayCredentials(): BinancePayCredentials {
  const apiKey = getEnvVar("BINANCE_PAY_API_KEY");
  const secretKey = getEnvVar("BINANCE_PAY_SECRET");
  if (!apiKey || !secretKey) {
    throw new Error("Missing Binance Pay credentials");
  }
  return { apiKey, secretKey };
}

export interface BinancePayRequestOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export class BinancePayClient {
  readonly credentials: BinancePayCredentials;
  readonly baseUrl: string;

  constructor(
    credentials: BinancePayCredentials = getBinancePayCredentials(),
    baseUrl = BINANCE_PAY_API_URL,
  ) {
    this.credentials = credentials;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async buildRequestHeaders(
    body: string,
    options: BinancePayRequestOptions = {},
  ): Promise<Record<string, string>> {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomUUID().replace(/-/g, "");
    const signature = await createSignature(
      timestamp,
      nonce,
      body,
      this.credentials.secretKey,
    );
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-binancepay-timestamp": timestamp,
      "x-binancepay-nonce": nonce,
      "x-binancepay-signature": signature,
      "x-binancepay-key": this.credentials.apiKey,
    };
    if (options.idempotencyKey) {
      headers["x-idempotency-key"] = options.idempotencyKey;
    }
    return headers;
  }

  async post<TResponse = unknown>(
    path: string,
    payload: unknown,
    options: BinancePayRequestOptions = {},
  ): Promise<TResponse> {
    const body = JSON.stringify(payload ?? {});
    const headers = await this.buildRequestHeaders(body, options);
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body,
      signal: options.signal,
    });
    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Binance Pay request failed: ${res.status} ${errorBody}`);
    }
    return (await res.json()) as TResponse;
  }
}

export function buildCallbackAck(message = "success") {
  return {
    result: {
      code: "SUCCESS",
      message,
    },
  } as const;
}
