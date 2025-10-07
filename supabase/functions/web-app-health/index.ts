import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/client.ts";
import {
  buildHealthReport,
  guardHealthRequest,
  healthResponse,
  measureHealthCheck,
} from "../_shared/health.ts";
import { version } from "../_shared/version.ts";

export async function handler(req: Request): Promise<Response> {
  const v = version(req, "web-app-health");
  if (v) return v;

  const guard = guardHealthRequest(req, ["GET"]);
  if (guard) return guard;

  try {
    const supa = createClient("anon");

    const checks = await Promise.all([
      measureHealthCheck("subscription_plans", async () => {
        const { count, error } = await supa
          .from("subscription_plans")
          .select("id", { count: "exact", head: true });
        if (error) {
          return {
            status: "error",
            message: `Plans query failed: ${error.message}`,
          };
        }
        return {
          message: "Subscription plans reachable",
          metadata: { plans: count ?? 0 },
        };
      }),
      measureHealthCheck("bot_content", async () => {
        const { count, error } = await supa
          .from("bot_content")
          .select("content_key", { count: "exact", head: true })
          .eq("is_active", true);
        if (error) {
          return {
            status: "error",
            message: `Bot content lookup failed: ${error.message}`,
          };
        }
        return {
          message: "Active bot content accessible",
          metadata: { active_entries: count ?? 0 },
        };
      }),
      measureHealthCheck("promotions", async () => {
        const { count, error } = await supa
          .from("promotions")
          .select("code", { count: "exact", head: true })
          .eq("is_active", true);
        if (error) {
          return {
            status: "error",
            message: `Promotions lookup failed: ${error.message}`,
          };
        }
        return {
          message: "Promotions table accessible",
          metadata: { active_promotions: count ?? 0 },
        };
      }),
      measureHealthCheck("validate_promo_code", async () => {
        try {
          const { error } = await supa.rpc("validate_promo_code", {
            p_code: "HEALTH_CHECK",
            p_telegram_user_id: "health_check_user",
          });
          if (error) {
            return {
              status: "error",
              message: `RPC error: ${error.message}`,
            };
          }
          return {
            message: "Promo validation RPC responded",
          };
        } catch (rpcError) {
          return {
            status: "error",
            message: rpcError instanceof Error
              ? rpcError.message
              : String(rpcError),
          };
        }
      }),
    ]);

    const health = buildHealthReport(checks, {
      systemInfo: {
        surface: "web-app",
        environment: Deno.env.get("NODE_ENV") ?? "development",
      },
    });

    return healthResponse(health, req, ["GET"]);
  } catch (error) {
    const reference = crypto.randomUUID();
    const safeError = error instanceof Error
      ? { name: error.name, message: error.message }
      : { message: String(error) };
    console.error(`web-app-health failure [${reference}]`, safeError);
    const fallback = buildHealthReport([
      {
        component: "web_app_health",
        status: "error",
        message: `Health checks unavailable (reference: ${reference})`,
        response_time: 0,
        last_checked: new Date().toISOString(),
      },
    ]);
    return healthResponse(fallback, req, ["GET"]);
  }
}

if (import.meta.main) serve(handler);
export default handler;
