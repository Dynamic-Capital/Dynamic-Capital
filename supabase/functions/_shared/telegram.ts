export type TgUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

export type RawInitEntry = {
  rawKey: string;
  rawValue: string;
  key: string;
};

function toHex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
async function hmacSHA256(key: CryptoKey, data: string) {
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return toHex(sig);
}
async function importHmacKeyFromToken(token: string) {
  const enc = new TextEncoder();
  const secretKey = await crypto.subtle.digest("SHA-256", enc.encode(token));
  return crypto.subtle.importKey(
    "raw",
    secretKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

export function parseInitDataEntries(initData: string): RawInitEntry[] | null {
  const entries = [] as RawInitEntry[];
  for (const chunk of initData.split("&")) {
    if (!chunk) continue;
    const eqIndex = chunk.indexOf("=");
    const rawKey = eqIndex === -1 ? chunk : chunk.slice(0, eqIndex);
    const rawValue = eqIndex === -1 ? "" : chunk.slice(eqIndex + 1);
    try {
      const key = decodeURIComponent(rawKey);
      entries.push({ rawKey, rawValue, key });
    } catch (error) {
      console.warn("[telegram] failed to decode initData key", error);
      return null;
    }
  }
  return entries;
}

export function extractHashFromEntries(entries: RawInitEntry[]): string {
  const rawHash = entries.find((entry) => entry.key === "hash");
  if (!rawHash) return "";
  try {
    return decodeURIComponent(rawHash.rawValue);
  } catch {
    return rawHash.rawValue;
  }
}

export function buildDataCheckString(entries: RawInitEntry[]): string {
  return entries
    .filter((entry) => entry.key !== "hash")
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((entry) => `${entry.rawKey}=${entry.rawValue}`)
    .join("\n");
}

/** Verifies initData and returns safe user if valid + not stale. */
export async function verifyInitDataAndGetUser(
  initData: string,
  windowSec = 900,
): Promise<TgUser | null> {
  if (!initData) return null;
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");
  const key = await importHmacKeyFromToken(token);

  const rawEntries = parseInitDataEntries(initData);
  if (!rawEntries) return null;

  const hash = extractHashFromEntries(rawEntries);
  const dataCheckString = buildDataCheckString(rawEntries);

  const sig = await hmacSHA256(key, dataCheckString);
  if (!hash || sig !== hash) return null;

  const params = new URLSearchParams(initData);

  // Optional freshness check
  const auth = Number(params.get("auth_date") || "0");
  const age = Math.floor(Date.now() / 1000) - auth;
  if (windowSec > 0 && (isNaN(auth) || age > windowSec)) return null;

  const userJson = params.get("user");
  if (!userJson) return null;

  const parseUser = (raw: string): TgUser | null => {
    try {
      return JSON.parse(raw) as TgUser;
    } catch (error) {
      try {
        return JSON.parse(decodeURIComponent(raw)) as TgUser;
      } catch {
        console.warn("[telegram] failed to parse user from initData", error);
        return null;
      }
    }
  };

  return parseUser(userJson);
}

/** Checks if a Telegram user id is in TELEGRAM_ADMIN_IDS allowlist. */
export function isAdmin(tgId: number | string): boolean {
  const raw = (Deno.env.get("TELEGRAM_ADMIN_IDS") || "").split(",").map((s) =>
    s.trim()
  ).filter(Boolean);
  const set = new Set(raw);
  return set.has(String(tgId));
}
