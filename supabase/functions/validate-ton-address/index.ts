import { registerHandler } from "../_shared/serve.ts";
import { bad, corsHeaders, mna, nf, ok, oops } from "../_shared/http.ts";
import { optionalEnv } from "../_shared/env.ts";
import { TonIndexClient } from "../_shared/ton-index.ts";
import { normaliseTonAddress } from "../_shared/ton-address.ts";

interface ValidationRequestBody {
  address?: string;
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") return mna();

  let body: ValidationRequestBody;
  try {
    body = await req.json();
  } catch {
    return bad("Request body must be valid JSON", undefined, req);
  }

  if (!body.address || typeof body.address !== "string") {
    return bad("address is required", undefined, req);
  }

  let normalised;
  try {
    normalised = normaliseTonAddress(body.address);
  } catch (error) {
    return bad(
      error instanceof Error ? error.message : "Invalid TON address",
      undefined,
      req,
    );
  }

  const client = new TonIndexClient({
    baseUrl: optionalEnv("TON_INDEX_BASE_URL") ?? undefined,
    apiKey: optionalEnv("TON_INDEX_API_KEY") ?? undefined,
  });

  let accountStates;
  try {
    accountStates = await client.getAccountStates([normalised.raw]);
  } catch (error) {
    console.error("validate-ton-address indexer error", error);
    return oops(
      "Failed to verify address",
      error instanceof Error ? error.message : undefined,
      req,
    );
  }

  const state = accountStates.find((entry) =>
    entry.address.toUpperCase() === normalised.raw.toUpperCase()
  );
  if (!state) {
    return nf("TON address not found", req);
  }

  const balanceTon = state.balance / 1_000_000_000;
  return ok({
    normalizedAddress: normalised.raw,
    bounceable: normalised.bounceable,
    testOnly: normalised.testOnly,
    status: state.status ?? null,
    balanceTon,
  }, req);
});

export default handler;
