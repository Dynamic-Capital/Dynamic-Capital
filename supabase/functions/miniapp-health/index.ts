import { createClient } from "../_shared/client.ts";
import { bad, jsonResponse, mna, oops } from "../_shared/http.ts";
import {
  buildHealthReport,
  guardHealthRequest,
  measureHealthCheck,
} from "../_shared/health.ts";
import { registerHandler } from "../_shared/serve.ts";
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
    console.warn("Failed to check env admin:", error);
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

  const guard = guardHealthRequest(req, ["POST"]);
  if (guard) return guard;
  if (req.method !== "POST") return mna();

  let body: { telegram_id?: string; initData?: string };
  try {
    body = await req.json();
  } catch {
    return bad("Bad JSON");
  }

  let tg = String(body.telegram_id || "").trim();
  if (!tg && body.initData) {
    try {
      const params = new URLSearchParams(body.initData);
      const userStr = params.get("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        tg = user.id?.toString() || "";
      }
    } catch (error) {
      console.warn("Failed to parse initData:", error);
    }
  }

  if (!tg) return bad("Missing telegram_id or initData");

  const supa = createClient();

  let isVip: boolean | null = null;
  let isAdmin = false;

  try {
    const checks = await Promise.all([
      measureHealthCheck("vip_lookup", async () => {
        const vip = await getVipForTelegram(supa, tg);
        isVip = vip;
        if (vip === null) {
          return {
            status: "warning",
            message: "No VIP membership found",
            metadata: { is_vip: vip },
          };
        }
        if (vip === false) {
          return {
            status: "warning",
            message: "User is not VIP",
            metadata: { is_vip: vip },
          };
        }
        return {
          message: "VIP membership active",
          metadata: { is_vip: vip },
        };
      }),
      measureHealthCheck("admin_lookup", async () => {
        const { data, error } = await supa
          .from("bot_users")
          .select("is_admin")
          .eq("telegram_id", tg)
          .limit(1);
        if (error) {
          return {
            status: "error",
            message: `Admin lookup failed: ${error.message}`,
          };
        }
        const dbAdmin = Boolean(data?.[0]?.is_admin);
        const envAdmin = await checkEnvAdmin(tg);
        isAdmin = dbAdmin || envAdmin;
        return {
          status: isAdmin ? "healthy" : "warning",
          message: isAdmin
            ? "Admin privileges confirmed"
            : "Admin privileges not granted",
          metadata: { db_admin: dbAdmin, env_admin: envAdmin },
        };
      }),
    ]);

    const health = buildHealthReport(checks, {
      systemInfo: { surface: "miniapp-health" },
    });

    const status = health.overall_status === "error" ? 503 : 200;

    return jsonResponse(
      {
        ok: status === 200,
        health,
        vip: { is_vip: isVip },
        admin: { is_admin: isAdmin },
        telegram_user_id: tg,
      },
      { status },
      req,
    );
  } catch (error) {
    return oops((error as Error).message, undefined, req);
  }
}

registerHandler(handler);
export default handler;
