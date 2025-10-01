export async function POST(req: Request) {
  const supabaseFnUrl = process.env.SUPABASE_FN_URL;

  if (!supabaseFnUrl) {
    console.error(
      "[miniapp] Missing SUPABASE_FN_URL env variable when processing subscription",
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

  const body = await req.json();
  const response = await fetch(`${supabaseFnUrl}/process-subscription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
