import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Buffer } from "https://deno.land/std@0.224.0/node/buffer.ts";
import { signVerify } from "https://esm.sh/ton-crypto@3.2.0";

const DNS_RECORD_URL = "https://dynamiccapital.ton/dns-records.txt";
const TREASURY_PUBKEY = Deno.env.get("TREASURY_PUBKEY") ??
  "<treasury_pubkey_here>";

if (TREASURY_PUBKEY.startsWith("<")) {
  console.warn(
    "Set the TREASURY_PUBKEY environment variable to enable verification.",
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

serve(async () => {
  try {
    const response = await fetch(DNS_RECORD_URL, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Failed to fetch DNS records: ${response.status}`);
    }

    const dnsText = await response.text();
    const record = parseDnsRecords(dnsText);

    const signatureBase64 = record.signature;
    if (!signatureBase64) {
      throw new Error("DNS record is missing a signature field");
    }

    delete record.signature;

    const message = Buffer.from(JSON.stringify(record));
    const signature = Buffer.from(signatureBase64, "base64");
    const publicKey = Buffer.from(TREASURY_PUBKEY, "hex");

    const verified = publicKey.length === 32
      ? signVerify(message, signature, publicKey)
      : false;

    return new Response(
      JSON.stringify({
        domain: "dynamiccapital.ton",
        verified,
        updated: record.updated,
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
});
