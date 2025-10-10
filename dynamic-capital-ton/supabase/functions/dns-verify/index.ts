import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

export const DNS_RECORD_SOURCES = [
  "https://dynamiccapital.ton/dns-records.txt",
  "https://ton.site/dynamiccapital.ton/dns-records.txt",
  "https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton/dns-records.txt",
  "https://ton-gateway.dynamic-capital.lovable.app/dynamiccapital.ton/dns-records.txt",
] as const;
const TREASURY_PUBKEY = Deno.env.get("TREASURY_PUBKEY") ??
  "<treasury_pubkey_here>";

const textEncoder = new TextEncoder();
let cachedKeyHex: string | null = null;
let cachedCryptoKey: CryptoKey | null = null;

if (TREASURY_PUBKEY.startsWith("<")) {
  console.warn(
    "Set the TREASURY_PUBKEY environment variable to enable verification.",
  );
}

type FetchLike = typeof fetch;

interface FetchDnsResult {
  url: string;
  text: string;
}

export async function fetchDnsRecords(
  fetchImpl: FetchLike = fetch,
): Promise<FetchDnsResult> {
  const failures: string[] = [];

  for (const url of DNS_RECORD_SOURCES) {
    try {
      const response = await fetchImpl(url, { cache: "no-cache" });
      if (!response.ok) {
        failures.push(`${url} → HTTP ${response.status}`);
        continue;
      }

      const text = await response.text();
      return { url, text };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${url} → ${message}`);
    }
  }

  const failureSummary = failures.length ? ` (${failures.join("; ")})` : "";
  throw new Error(
    `Unable to fetch DNS records from configured gateways${failureSummary}`,
  );
}

function parseDnsRecords(text: string): Record<string, string> {
  const entries: [string, string][] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const [key, ...valueParts] = line.split("=");
    if (!key || valueParts.length === 0) {
      continue;
    }

    entries.push([key, valueParts.join("=")]);
  }

  const record: Record<string, string> = {};
  for (const [key, value] of entries) {
    record[key] = value;
  }

  return record;
}

function hexToUint8Array(hex: string): Uint8Array<ArrayBuffer> {
  const normalized = hex.trim().toLowerCase();
  if (!/^[0-9a-f]*$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error("Invalid hex input");
  }

  const result = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < result.length; i += 1) {
    result[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return result as Uint8Array<ArrayBuffer>;
}

function base64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.trim());
  const result = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    result[i] = binary.charCodeAt(i);
  }
  return result as Uint8Array<ArrayBuffer>;
}

async function verifySignature(
  record: Record<string, string>,
  signatureBase64: string,
  publicKeyHex: string,
): Promise<boolean> {
  if (!publicKeyHex || publicKeyHex.startsWith("<")) return false;

  try {
    const messageBytes = textEncoder.encode(JSON.stringify(record));
    const signatureBytes = base64ToUint8Array(signatureBase64);
    const publicKeyBytes = hexToUint8Array(publicKeyHex);

    if (publicKeyBytes.length !== 32) return false;

    let key = cachedCryptoKey;
    const normalizedHex = publicKeyHex.trim().toLowerCase();
    if (!key || cachedKeyHex !== normalizedHex) {
      key = await crypto.subtle.importKey(
        "raw",
        publicKeyBytes,
        { name: "Ed25519" },
        false,
        ["verify"],
      );
      cachedCryptoKey = key;
      cachedKeyHex = normalizedHex;
    }

    if (!key) return false;

    return await crypto.subtle.verify(
      "Ed25519",
      key,
      signatureBytes,
      messageBytes,
    );
  } catch (error) {
    console.error("Failed to verify signature", error);
    return false;
  }
}

export async function handler(_req?: Request): Promise<Response> {
  try {
    const { text: dnsText, url } = await fetchDnsRecords();
    const record = parseDnsRecords(dnsText);

    const signatureBase64 = record.signature;
    if (!signatureBase64) {
      throw new Error("DNS record is missing a signature field");
    }

    delete record.signature;

    const verified = await verifySignature(
      record,
      signatureBase64,
      TREASURY_PUBKEY,
    );

    return new Response(
      JSON.stringify({
        domain: "dynamiccapital.ton",
        verified,
        updated: record.updated,
        source: url,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({
        domain: "dynamiccapital.ton",
        verified: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
}

if (import.meta.main) {
  serve((req) => handler(req));
}
