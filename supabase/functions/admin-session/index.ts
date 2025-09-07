import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { verifyInitDataAndGetUser, isAdmin } from "../_shared/telegram.ts";
import { ok, bad, unauth, mna } from "../_shared/http.ts";
import { getEnv } from "../_shared/env.ts";

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
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
    const secret = getEnv("ADMIN_API_SECRET");
    const exp = Math.floor(Date.now() / 1000) + (60 * 60); // 1 hour
    
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ 
      sub: user.id.toString(), 
      exp, 
      iat: Math.floor(Date.now() / 1000),
      admin: true
    }));
    
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${header}.${payload}`)
    );
    
    const token = `${header}.${payload}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;
    
    return new Response(JSON.stringify({ 
      token,
      exp,
      user_id: user.id.toString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to generate admin token:', error);
    return bad("Failed to generate session");
  }
});