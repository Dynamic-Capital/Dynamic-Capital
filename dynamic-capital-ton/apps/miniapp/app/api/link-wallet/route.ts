import {
  buildSupabaseFunctionHeaders,
  missingSupabaseConfigResponse,
  resolveSupabaseFunctionUrl,
} from "../_shared/supabase";

export async function POST(req: Request) {
  const supabaseFnUrl = resolveSupabaseFunctionUrl();
  if (!supabaseFnUrl) {
    console.error(
      "[miniapp] Missing SUPABASE_FN_URL env variable when linking wallet",
    );
    return missingSupabaseConfigResponse();
  }

  const body = await req.json();
  const headers = buildSupabaseFunctionHeaders();

  const response = await fetch(`${supabaseFnUrl}/link-wallet`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ??
        "application/json",
    },
  });
}
