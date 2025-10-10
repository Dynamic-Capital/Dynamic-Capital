import { createClient } from "../_shared/client.ts";
import { bad, methodNotAllowed, ok, oops } from "../_shared/http.ts";
import { version } from "../_shared/version.ts";
import { registerHandler } from "../_shared/serve.ts";

interface TrafficEvent {
  path: string;
  user_id?: string;
  session_id?: string;
  referrer?: string;
  user_agent?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

async function logToPosthog(evt: TrafficEvent) {
  const key = (globalThis as any).Deno?.env.get("POSTHOG_API_KEY") ||
    (globalThis as any).process?.env?.POSTHOG_API_KEY;
  if (!key) return;
  try {
    await fetch("https://app.posthog.com/capture/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event: "pageview",
        properties: {
          distinct_id: evt.session_id || evt.user_id || crypto.randomUUID(),
          path: evt.path,
          referrer: evt.referrer,
          utm_source: evt.utm_source,
          utm_medium: evt.utm_medium,
          utm_campaign: evt.utm_campaign,
        },
      }),
    });
  } catch (err) {
    console.error("posthog error", err);
  }
}

export async function handler(req: Request): Promise<Response> {
  const v = version(req, "traffic-monitor");
  if (v) return v;
  if (req.method === "OPTIONS") return ok({}, req);

  const supa = createClient();

  try {
    if (req.method === "POST") {
      const evt: TrafficEvent = await req.json();
      if (!evt.path) return bad("path is required", undefined, req);

      const { error } = await supa.from("traffic_logs").insert({
        path: evt.path,
        user_id: evt.user_id,
        session_id: evt.session_id,
        referrer: evt.referrer,
        user_agent: evt.user_agent,
        utm_source: evt.utm_source,
        utm_medium: evt.utm_medium,
        utm_campaign: evt.utm_campaign,
      });
      if (error) throw error;

      logToPosthog(evt);
      return ok({ logged: true }, req);
    }

    if (req.method === "GET") {
      const { data, error } = await supa.from("traffic_logs")
        .select("path, utm_campaign")
        .limit(1000);
      if (error) throw error;
      const summary: Record<string, number> = {};
      for (const row of data ?? []) {
        const key = row.path || "unknown";
        summary[key] = (summary[key] ?? 0) + 1;
      }
      return ok({ total: data?.length ?? 0, byPath: summary }, req);
    }

    return methodNotAllowed(req);
  } catch (err) {
    console.error("traffic-monitor", err);
    return oops("Failed to process request", err, req);
  }
}

registerHandler(handler);
export default handler;
