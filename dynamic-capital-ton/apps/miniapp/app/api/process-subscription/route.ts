export async function POST(req: Request) {
  const body = await req.json();
  const response = await fetch(`${process.env.SUPABASE_FN_URL}/process-subscription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
  });
}
