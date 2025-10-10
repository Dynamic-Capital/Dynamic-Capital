import { serve } from "https://deno.land/std/http/server.ts";
import { verifyMessage } from "https://esm.sh/@tonconnect/sdk@2"; // or use ton-crypto Ed25519 verify

import {
  createHttpClientWithEnvCa,
  type HttpClientContext,
} from "../_shared/tls.ts";

serve(async (_req) => {
  let tlsContext: HttpClientContext | null = null;

  try {
    tlsContext = await createHttpClientWithEnvCa();
    const dnsUrl = "https://dynamiccapital.ton/dns-records.txt";
    const response = await fetch(dnsUrl, {
      client: tlsContext?.client,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch DNS records (status ${response.status})`,
      );
    }

    const dnsTxt = await response.text();
    const lines = Object.fromEntries(
      dnsTxt.split("\n").filter(Boolean).map((line) => line.split("=")),
    );

    const sig = lines.signature;
    if (!sig) {
      throw new Error("Missing DNS signature record");
    }
    delete lines.signature;

    const msg = new TextEncoder().encode(JSON.stringify(lines));

    // Replace with your Treasury pubkey
    const pubkeyHex = Deno.env.get("TREASURY_PUBKEY_HEX")!;
    const verified = await verifyMessage(pubkeyHex, msg, sig);

    const validJetton = lines.jetton_master?.startsWith("EQDSmz4R");
    const validDomain = dnsUrl.includes("dynamiccapital.ton");

    return new Response(
      JSON.stringify({
        domain: "dynamiccapital.ton",
        verified: Boolean(verified && validJetton && validDomain),
        records: lines,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("verify-domain-signature", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    tlsContext?.client.close();
  }
});
