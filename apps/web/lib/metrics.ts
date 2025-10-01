const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface MetricPayload {
  event: string;
  props: Record<string, unknown>;
  at: string;
}

async function sendToSupabase(payload: MetricPayload) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || typeof fetch === "undefined") {
    return;
  }
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/miniapp_metrics`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok && process.env.NODE_ENV !== "production") {
      console.debug(
        "[metric] supabase noop",
        response.status,
        response.statusText,
      );
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[metric] supabase error", error);
    }
  }
}

export async function track(
  event: string,
  props: Record<string, unknown> = {},
) {
  const payload: MetricPayload = {
    event,
    props,
    at: new Date().toISOString(),
  };

  if (process.env.NODE_ENV !== "production") {
    console.debug("[metric]", payload);
  }

  await sendToSupabase(payload);
}
