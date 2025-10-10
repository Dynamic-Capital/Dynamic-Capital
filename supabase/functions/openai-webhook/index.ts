import { getEnv } from "../_shared/env.ts";
import { bad, mna, ok, unauth } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function verifySignature(body: string, header: string, secret: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const digest = `sha256=${hex(sig)}`;
  return timingSafeEqual(digest, header);
}

async function handler(req: Request) {
  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname.endsWith("/version")) {
    return ok({ name: "openai-webhook", ts: new Date().toISOString() });
  }
  if (req.method === "HEAD") return new Response(null, { status: 200 });
  if (req.method !== "POST") return mna();

  const signature = req.headers.get("OpenAI-Signature") || "";
  const secret = getEnv("OPENAI_WEBHOOK_SECRET");
  const rawBody = await req.text();

  if (!signature || !(await verifySignature(rawBody, signature, secret))) {
    return unauth("invalid signature");
  }

  let event: { type?: string } = {};
  try {
    event = JSON.parse(rawBody);
  } catch {
    return bad("invalid json");
  }

  console.log("[openai-webhook]", event.type);
  switch (event.type) {
    case "realtime.call.incoming":
      // placeholder for future business logic
      console.log("incoming call", event);
      break;
    default:
      console.log("unhandled event", event.type);
  }

  return ok({ received: true });
}

export default handler;

registerHandler(handler);
