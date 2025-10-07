import { getServiceClient } from "../_shared/client.ts";
import {
  buildHealthReport,
  guardHealthRequest,
  healthResponse,
  measureHealthCheck,
} from "../_shared/health.ts";
import { registerHandler } from "../_shared/serve.ts";

type SupabaseServiceClient = ReturnType<typeof getServiceClient>;

function resolveServiceClient(): SupabaseServiceClient {
  const globalAny = globalThis as {
    __SUPABASE_SERVICE_CLIENT__?: SupabaseServiceClient;
  };
  return globalAny.__SUPABASE_SERVICE_CLIENT__ ?? getServiceClient();
}

export const handler = registerHandler(async (req) => {
  const guard = guardHealthRequest(req, ["GET"]);
  if (guard) return guard;

  try {
    const supabase = resolveServiceClient();

    const checks = await Promise.all([
      measureHealthCheck("database", async () => {
        const { error } = await supabase
          .from("bot_users")
          .select("id")
          .limit(1);
        if (error) {
          return {
            status: "error",
            message: `Database error: ${error.message}`,
          };
        }
        return {
          message: "Database connection successful",
        };
      }),
      measureHealthCheck("bot_users_table", async () => {
        const { count, error } = await supabase
          .from("bot_users")
          .select("id", { count: "exact", head: true });
        if (error) {
          return {
            status: "error",
            message: `User table error: ${error.message}`,
          };
        }
        return {
          message: "Bot users table accessible",
          metadata: { total_users: count ?? 0 },
        };
      }),
      measureHealthCheck("subscriptions", async () => {
        const { count, error } = await supabase
          .from("user_subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true);
        if (error) {
          return {
            status: "error",
            message: `Subscription error: ${error.message}`,
          };
        }
        return {
          message: "Subscriptions table accessible",
          metadata: { active_subscriptions: count ?? 0 },
        };
      }),
      measureHealthCheck("payments", async () => {
        const { count, error } = await supabase
          .from("payments")
          .select("id", { count: "exact", head: true });
        if (error) {
          return {
            status: "error",
            message: `Payments error: ${error.message}`,
          };
        }
        return {
          message: "Payments table accessible",
          metadata: { total_payments: count ?? 0 },
        };
      }),
      measureHealthCheck("user_analytics", async () => {
        const { count, error } = await supabase
          .from("user_analytics")
          .select("id", { count: "exact", head: true });
        if (error) {
          return {
            status: "error",
            message: `Analytics error: ${error.message}`,
          };
        }
        return {
          message: "Analytics table accessible",
          metadata: { records: count ?? 0 },
        };
      }),
      measureHealthCheck("storage", async () => {
        const { data, error } = await supabase.storage.listBuckets();
        if (error) {
          return {
            status: "error",
            message: `Storage error: ${error.message}`,
          };
        }
        return {
          message: "Storage buckets reachable",
          metadata: { bucket_count: data?.length ?? 0 },
        };
      }),
      measureHealthCheck("telegram_bot", async () => {
        const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (!telegramToken) {
          return {
            status: "warning",
            message: "TELEGRAM_BOT_TOKEN not configured",
          };
        }
        const response = await fetch(
          `https://api.telegram.org/bot${telegramToken}/getMe`,
        );
        if (!response.ok) {
          return {
            status: "error",
            message: `Telegram API returned ${response.status}`,
          };
        }
        const payload = await response.json();
        return {
          status: payload.ok ? "healthy" : "error",
          message: payload.ok
            ? `Bot connected: @${payload.result?.username ?? "unknown"}`
            : "Telegram bot connection failed",
          metadata: { raw: payload },
        };
      }),
    ]);

    const health = buildHealthReport(checks, {
      systemInfo: {
        environment: Deno.env.get("DENO_DEPLOYMENT_ID")
          ? "production"
          : "development",
        deno_version: Deno.version.deno,
        region: Deno.env.get("DENO_REGION") ?? "unknown",
      },
    });

    return healthResponse(health, req, ["GET"]);
  } catch (error) {
    console.error("Error in system-health:", error);
    const fallback = buildHealthReport([
      {
        component: "system",
        status: "error",
        message: error instanceof Error ? error.message : String(error),
        response_time: 0,
        last_checked: new Date().toISOString(),
      },
    ]);
    return healthResponse(fallback, req, ["GET"]);
  }
});

export default handler;
