import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/client.ts";
import { bad, mna, oops, ok } from "../_shared/http.ts";
import { version } from "../_shared/version.ts";

interface SupabaseLike {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (col: string, value: string) => {
        limit: (
          n: number,
        ) => Promise<
          { data?: Array<Record<string, unknown>>; error?: { message: string } }
        >;
      };
    };
  };
}

async function checkEnvAdmin(telegramId: string): Promise<boolean> {
  try {
    const { isAdmin } = await import("../_shared/telegram.ts");
    return await isAdmin(telegramId);
  } catch (error) {
    console.warn('Failed to check env admin:', error);
    return false;
  }
}

export async function getVipForTelegram(
  supa: SupabaseLike,
  tg: string,
): Promise<boolean | null> {
  const { data: users, error } = await supa
    .from("bot_users")
    .select("is_vip, subscription_expires_at")
    .eq("telegram_id", tg)
    .limit(1);
  if (error) {
    throw new Error(error.message);
  }
  let isVip: boolean | null = null;
  if (users && users.length > 0) {
    const u = users[0] as {
      is_vip?: boolean;
      subscription_expires_at?: string;
    };
    if (typeof u.is_vip === "boolean") isVip = u.is_vip;
    if (isVip === null && u.subscription_expires_at) {
      isVip = new Date(u.subscription_expires_at).getTime() >= Date.now();
    }
  }
  return isVip;
}

export async function handler(req: Request): Promise<Response> {
  const v = version(req, "miniapp-health");
  if (v) return v;
  if (req.method !== "POST") return mna();
  let body: { telegram_id?: string; initData?: string };
  try {
    body = await req.json();
  } catch {
    return bad("Bad JSON");
  }

  // Extract telegram_id from initData if provided
  let tg = String(body.telegram_id || "").trim();
  if (!tg && body.initData) {
    try {
      const params = new URLSearchParams(body.initData);
      const userStr = params.get('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        tg = user.id?.toString() || '';
      }
    } catch (error) {
      console.warn('Failed to parse initData:', error);
    }
  }

  if (!tg) return bad("Missing telegram_id or initData");

  const supa = createClient();

  let isVip: boolean | null = null;
  let isAdmin: boolean = false;
  try {
    isVip = await getVipForTelegram(supa, tg);
    
    // Check admin status from both DB and environment allowlist
    const { data: adminData } = await supa
      .from("bot_users")
      .select("is_admin")
      .eq("telegram_id", tg)
      .single();
    
    const dbAdmin = adminData?.is_admin || false;
    
    // Also check environment allowlist
    const envAdmin = await checkEnvAdmin(tg);
    
    isAdmin = dbAdmin || envAdmin;
  } catch (error) {
    return oops((error as Error).message);
  }

  return ok({ 
    vip: { is_vip: isVip }, 
    admin: { is_admin: isAdmin },
    telegram_user_id: tg
  });
}

if (import.meta.main) {
  serve(handler);
}

export default handler;
