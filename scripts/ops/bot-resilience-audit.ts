#!/usr/bin/env -S deno run -A
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    console.error(`Environment variable ${name} is required`);
    Deno.exit(1);
  }
  return value;
}

const projectRef = requiredEnv("SUPABASE_PROJECT_REF");
const serviceRole = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL") ??
  `https://${projectRef}.supabase.co`;
const adminSecret = Deno.env.get("ADMIN_API_SECRET");
const threshold = Number(Deno.env.get("QUEUE_PENDING_THRESHOLD") ?? "25");

const supabase = createClient(supabaseUrl, serviceRole, {
  global: {
    headers: { "X-Client-Info": "bot-resilience-audit" },
  },
});

const functionsBase = `https://${projectRef}.functions.supabase.co`;
const keeperUrl = `${functionsBase}/telegram-webhook-keeper/run`;

console.log(`[audit] Pinging telegram-webhook-keeper at ${keeperUrl}`);

const keeperHeaders: Record<string, string> = {
  "content-type": "application/json",
};
if (adminSecret) {
  keeperHeaders["x-admin-secret"] = adminSecret;
}

const keeperResponse = await fetch(keeperUrl, {
  method: "POST",
  headers: keeperHeaders,
});

let keeperPayload: unknown = null;
try {
  keeperPayload = await keeperResponse.json();
} catch {
  keeperPayload = { error: "Failed to parse response" };
}

const keeperHealthy = keeperResponse.ok &&
  (keeperPayload as { ok?: boolean })?.ok !== false;

console.log(
  `[audit] Keeper status: ${
    keeperHealthy ? "healthy" : "error"
  } (HTTP ${keeperResponse.status})`,
);

console.log("[audit] Fetching pending queue depth from jobs table");
const { count: pendingCount, error: pendingError } = await supabase
  .from("jobs")
  .select("id", { count: "exact", head: true })
  .eq("status", "pending");

const pendingJobs = pendingError ? null : pendingCount ?? 0;
if (pendingError) {
  console.error(`[audit] Queue query failed: ${pendingError.message}`);
}

const queueHealthy = pendingJobs !== null && pendingJobs <= threshold;
console.log(
  `[audit] Pending jobs: ${
    pendingJobs ?? "unknown"
  } (threshold ${threshold}) → ${queueHealthy ? "healthy" : "warning"}`,
);

const summary = {
  keeper: {
    status: keeperHealthy ? "healthy" : "error",
    http_status: keeperResponse.status,
    payload: keeperPayload,
  },
  queue: {
    status: queueHealthy ? "healthy" : pendingError ? "error" : "warning",
    pending: pendingJobs,
    threshold,
    error: pendingError?.message ?? null,
  },
  generated_at: new Date().toISOString(),
};

const actionDescription = `Bot resilience audit — keeper=${
  keeperHealthy ? "ok" : "issue"
}, pending=${pendingJobs ?? "unknown"}`;

const { error: logError } = await supabase.from("admin_logs").insert({
  admin_telegram_id: "ops-script",
  action_type: "bot_resilience_audit",
  action_description: actionDescription,
  affected_table: "jobs",
  new_values: summary,
});

if (logError) {
  console.error(`[audit] Failed to record admin log: ${logError.message}`);
}

const auditHealthy = keeperHealthy && queueHealthy && !pendingError;

if (!auditHealthy) {
  console.error("[audit] Bot resilience audit detected issues");
  console.error(JSON.stringify(summary, null, 2));
  Deno.exit(1);
}

console.log("[audit] Bot resilience audit completed successfully");
console.log(JSON.stringify(summary, null, 2));
