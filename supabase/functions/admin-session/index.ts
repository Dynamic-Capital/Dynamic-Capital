import { isAdmin, verifyInitDataAndGetUser } from "../_shared/telegram.ts";
import { bad, mna, ok, unauth } from "../_shared/http.ts";
import { envOrSetting } from "../_shared/config.ts";
import { signHS256 } from "../_shared/jwt.ts";
import { registerHandler } from "../_shared/serve.ts";

export async function handler(req: Request): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname.endsWith("/version")) {
    return ok({ name: "admin-session", ts: new Date().toISOString() });
  }
  if (req.method === "HEAD") return new Response(null, { status: 200 });
  if (req.method !== "POST") return mna();

  let body: { initData: string };
  try {
    body = await req.json();
  } catch {
    return bad("Bad JSON");
  }

  if (!body.initData) {
    return bad("initData required");
  }

  // Verify initData signature and get user
  const user = await verifyInitDataAndGetUser(body.initData);
  if (!user) {
    return unauth("Invalid initData");
  }

  // Check if user is admin
  const adminStatus = await isAdmin(user.id);
  if (!adminStatus) {
    return unauth("Not admin");
  }

  // Generate admin session token
  try {
    const secret = await envOrSetting("ADMIN_API_SECRET");
    if (!secret) throw new Error("Missing ADMIN_API_SECRET");
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (60 * 60); // 1 hour

    const token = await signHS256({
      sub: user.id.toString(),
      exp,
      iat: now,
      admin: true,
    }, secret);

    return new Response(
      JSON.stringify({
        token,
        exp,
        user_id: user.id.toString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Failed to generate admin token:", error);
    return bad("Failed to generate session");
  }
}

registerHandler(handler);

export default handler;
