import { verifyMessage } from "https://esm.sh/@tonconnect/sdk@2"; // or use ton-crypto Ed25519 verify
import { registerHandler } from "../_shared/serve.ts";

export const handler = registerHandler(async (req) => {
  try {
    const dnsUrl = "https://dynamiccapital.ton/dns-records.txt";
    const dnsTxt = await fetch(dnsUrl).then((r) => r.text());
    const lines = Object.fromEntries(
      dnsTxt.split("\n").filter(Boolean).map((l) => l.split("=")),
    );
    const sig = lines.signature;
    delete lines.signature;
    const msg = new TextEncoder().encode(JSON.stringify(lines));

    // Replace with your Treasury pubkey
    const pubkeyHex = Deno.env.get("TREASURY_PUBKEY_HEX")!;
    const verified = await verifyMessage(pubkeyHex, msg, sig);

    const validJetton = lines.jetton_master?.startsWith("UQD1zAJP");
    const validDomain = dnsUrl.includes("dynamiccapital.ton");

    return new Response(
      JSON.stringify({
        domain: "dynamiccapital.ton",
        verified: verified && validJetton && validDomain,
        records: lines,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

export default handler;
