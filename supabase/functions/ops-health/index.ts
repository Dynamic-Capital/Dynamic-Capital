import { createClient } from "../_shared/client.ts";
import { registerHandler } from "../_shared/serve.ts";

type HealthReport = {
  ok: boolean;
  checks: Record<string, unknown>;
};

const json = (payload: HealthReport, status: number) =>
  new Response(JSON.stringify(payload, null, 2), {
    headers: { "content-type": "application/json" },
    status,
  });

export const handler = registerHandler(async (_req) => {
  const report: HealthReport = { ok: true, checks: {} };

  function checkEnv(name: string, required = true) {
    const ok = !!Deno.env.get(name);
    report.checks[name] = ok;
    if (required && !ok) report.ok = false;
  }

  [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "TELEGRAM_BOT_TOKEN",
  ].forEach((k) => checkEnv(k, true));
  ["TELEGRAM_WEBHOOK_SECRET", "MINI_APP_URL"].forEach((k) =>
    checkEnv(k, false)
  );

  // DB ping
  try {
    const supabase = createClient("service");
    const { error } = await supabase
      .from("bot_users")
      .select("id")
      .limit(1);

    report.checks["db"] = error
      ? { ok: false, message: error.message }
      : { ok: true };
    if (error) report.ok = false;
  } catch (error) {
    report.ok = false;
    report.checks["db"] = {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  // Function reachability (self)
  report.checks["self"] = true;

  return json(report, report.ok ? 200 : 500);
});

export default handler;
