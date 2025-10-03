import {
  buildSupabaseFunctionHeaders,
  missingSupabaseConfigResponse,
  resolveSupabaseFunctionUrl,
} from "../_shared/supabase";

export async function GET() {
  const supabaseFnUrl = resolveSupabaseFunctionUrl();
  if (!supabaseFnUrl) {
    console.error(
      "[miniapp] Missing SUPABASE_FN_URL env variable when loading plans",
    );
    return missingSupabaseConfigResponse();
  }

  const headers = buildSupabaseFunctionHeaders();

  const response = await fetch(`${supabaseFnUrl}/plans`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ??
        "application/json",
    },
  });
}
