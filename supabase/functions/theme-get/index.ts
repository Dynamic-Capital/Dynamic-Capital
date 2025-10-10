import { registerHandler } from "../_shared/serve.ts";
// >>> DC BLOCK: theme-get-core (start)
import { getSetting } from "../_shared/config.ts";

function parseToken(bearer: string | undefined) {
  if (!bearer?.startsWith("Bearer ")) return 0;
  const raw = atob(bearer.slice(7).split(".")[0] || "");
  try {
    return JSON.parse(raw).sub || 0;
  } catch {
    return 0;
  }
}

export async function handler(req: Request): Promise<Response> {
  const uid = parseToken(req.headers.get("authorization") || "");
  if (!uid) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
    });
  }
  const mode = await getSetting<"auto" | "light" | "dark">(`theme:${uid}`) ||
    "auto";
  return new Response(JSON.stringify({ mode }), {
    headers: { "content-type": "application/json" },
  });
}

registerHandler(handler);

export default handler;
// <<< DC BLOCK: theme-get-core (end)
