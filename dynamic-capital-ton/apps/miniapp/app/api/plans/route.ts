import process from "node:process";

export async function GET() {
  const supabaseFnUrl = process.env.SUPABASE_FN_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseFnUrl) {
    console.error(
      "[miniapp] Missing SUPABASE_FN_URL env variable when loading plans",
    );
    return new Response(
      JSON.stringify({
        error: "SUPABASE_FN_URL environment variable is not configured",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (supabaseAnonKey) {
    headers.apikey = supabaseAnonKey;
  }

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
