import { bad, corsHeaders, mna, ok, unauth } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";
import { createClient } from "../_shared/client.ts";
import { need } from "../_shared/env.ts";

interface OracleBody {
  price: number;
  signature: string;
  symbol?: string;
  quoteCurrency?: string;
  signedAt?: string;
}

function parseBody(raw: unknown): OracleBody {
  if (typeof raw !== "object" || raw === null) {
    return { price: NaN, signature: "" };
  }
  return raw as OracleBody;
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") return mna();

  const secret = need("TON_ORACLE_SECRET");
  const headerSecret = req.headers.get("x-oracle-secret");
  if (!headerSecret || headerSecret !== secret) {
    return unauth("Unauthorized", req);
  }

  let body: OracleBody;
  try {
    body = parseBody(await req.json());
  } catch {
    return bad("Invalid JSON", undefined, req);
  }

  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    return bad("Invalid price", undefined, req);
  }
  if (!body.signature) {
    return bad("Missing signature", undefined, req);
  }

  const supabase = createClient("service");
  const symbol = body.symbol ?? "DCTUSDT";
  const quoteCurrency = body.quoteCurrency ?? "USDT";
  const signedAt = body.signedAt ?? new Date().toISOString();

  const { error } = await supabase.from("price_snapshots").insert({
    symbol,
    price_usd: price,
    quote_currency: quoteCurrency,
    signature: body.signature,
    signed_at: signedAt,
  });

  if (error) {
    return bad(`Failed to store snapshot: ${error.message}`, undefined, req);
  }

  return ok({ ok: true }, req);
});

export default handler;
