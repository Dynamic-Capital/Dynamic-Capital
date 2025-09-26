import { getEnv } from "./env.ts";

function toHex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function importKey(token: string) {
  const e = new TextEncoder();
  const s = await crypto.subtle.digest("SHA-256", e.encode(token));
  return crypto.subtle.importKey(
    "raw",
    s,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

export async function verifyInitData(
  initData: string,
  windowSec = 900,
  token = getEnv("TELEGRAM_BOT_TOKEN"),
): Promise<boolean> {
  if (!initData) return false;
  const key = await importKey(token);
  const params = new URLSearchParams(initData);
  const hash = params.get("hash") || "";
  params.delete("hash");
  const dcs = Array.from(params.entries()).map(([k, v]) => `${k}=${v}`).sort()
    .join("\n");
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(dcs),
  );
  if (toHex(sig) !== hash) return false;
  const auth = Number(params.get("auth_date") || "0");
  const age = Math.floor(Date.now() / 1000) - auth;
  return !(windowSec > 0 && (isNaN(auth) || age > windowSec));
}

// Backwards compatibility export
export { verifyInitData as verifyTelegramInitData };
