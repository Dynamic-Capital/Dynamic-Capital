import { getEnv } from "./env.ts";
import {
  buildDataCheckString,
  createTelegramHmacKey,
  extractHashFromEntries,
  parseInitDataEntries,
  signTelegramDataCheck,
  timingSafeEqual,
} from "./telegram.ts";

export async function verifyInitData(
  initData: string,
  windowSec = 900,
  token = getEnv("TELEGRAM_BOT_TOKEN"),
): Promise<boolean> {
  if (!initData) return false;
  const key = await createTelegramHmacKey(token);
  const entries = parseInitDataEntries(initData);
  if (!entries) return false;
  const hash = extractHashFromEntries(entries);
  if (!hash) return false;
  const dcs = buildDataCheckString(entries);
  const sig = await signTelegramDataCheck(key, dcs);
  const normalizedHash = hash.toLowerCase();
  if (!timingSafeEqual(sig, normalizedHash)) return false;
  const params = new URLSearchParams(initData);
  const auth = Number(params.get("auth_date") || "0");
  const age = Math.floor(Date.now() / 1000) - auth;
  return !(windowSec > 0 && (isNaN(auth) || age > windowSec));
}

// Backwards compatibility export
export { verifyInitData as verifyTelegramInitData };
