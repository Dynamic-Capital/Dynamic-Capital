import { registerHandler } from "../_shared/serve.ts";
import {
  createSupabaseClient,
  type SupabaseClient,
} from "../_shared/client.ts";
import type { PostgrestError } from "https://esm.sh/@supabase/supabase-js@2?dts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

type InteractionData = {
  plan_id?: string;
  promo_code?: string;
  value?: number;
  [key: string]: unknown;
};

interface AnalyticsEvent {
  event_type: string;
  telegram_user_id?: string;
  session_id?: string;
  page_context?: string;
  interaction_data?: InteractionData;
  user_agent?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export const handler = registerHandler(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (req.method === "POST") {
      return await trackEvent(supabase, req);
    } else if (req.method === "GET") {
      return await getAnalytics(supabase, req);
    } else {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    console.error("Error in web-app-analytics:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

async function trackEvent(
  supabase: SupabaseClient,
  req: Request,
): Promise<Response> {
  try {
    const eventData: AnalyticsEvent = await req.json();

    // Validate required fields
    if (!eventData.event_type) {
      return new Response(
        JSON.stringify({ error: "event_type is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Tracking analytics event:", eventData.event_type);

    // Track user interaction
    if (eventData.telegram_user_id) {
      const { error: interactionError } = await supabase
        .from("user_interactions")
        .insert({
          telegram_user_id: eventData.telegram_user_id,
          interaction_type: eventData.event_type,
          interaction_data: {
            ...eventData.interaction_data,
            user_agent: eventData.user_agent,
            referrer: eventData.referrer,
            utm_source: eventData.utm_source,
            utm_medium: eventData.utm_medium,
            utm_campaign: eventData.utm_campaign,
          },
          session_id: eventData.session_id,
          page_context: eventData.page_context,
        });

      if (interactionError) {
        console.error("Error tracking user interaction:", interactionError);
      }
    }

    // Track conversion events
    if (
      ["plan_view", "checkout_start", "payment_submit", "subscription_complete"]
        .includes(eventData.event_type)
    ) {
      const { error: conversionError } = await supabase
        .from("conversion_tracking")
        .insert({
          telegram_user_id: eventData.telegram_user_id || "anonymous",
          conversion_type: eventData.event_type,
          conversion_data: eventData.interaction_data,
          plan_id: eventData.interaction_data?.plan_id,
          promo_code: eventData.interaction_data?.promo_code,
          conversion_value: eventData.interaction_data?.value,
        });

      if (conversionError) {
        console.error("Error tracking conversion:", conversionError);
      }
    }

    // Update daily analytics
    const today = new Date().toISOString().split("T")[0];
    const dailyError = await incrementDailyAnalytics(
      supabase,
      today,
      eventData.event_type,
    );

    if (dailyError) {
      console.error("Error updating daily analytics:", dailyError);
    }

    return new Response(
      JSON.stringify({ success: true, event_tracked: eventData.event_type }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error tracking event:", error);
    return new Response(
      JSON.stringify({ error: "Failed to track event" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

interface DailyAnalyticsRow {
  button_clicks: Record<string, unknown> | null;
}

type ButtonClickMap = Record<string, number>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coerceCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
}

function normalizeButtonClicks(value: unknown): ButtonClickMap {
  if (!isRecord(value)) {
    return {};
  }

  const normalized: ButtonClickMap = {};
  for (const [key, raw] of Object.entries(value)) {
    const count = coerceCount(raw);
    if (count !== null) {
      normalized[key] = count;
    }
  }
  return normalized;
}

export async function incrementDailyAnalytics(
  supabase: SupabaseClient,
  date: string,
  eventType: string,
): Promise<PostgrestError | null> {
  const { data, error } = await supabase
    .from<DailyAnalyticsRow>("daily_analytics")
    .select("button_clicks")
    .eq("date", date)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    return error;
  }

  const current = normalizeButtonClicks(data?.button_clicks ?? {});
  const nextCount = (current[eventType] ?? 0) + 1;
  const updated: ButtonClickMap = {
    ...current,
    [eventType]: nextCount,
  };

  const { error: upsertError } = await supabase
    .from("daily_analytics")
    .upsert({
      date,
      button_clicks: updated,
    }, {
      onConflict: "date",
      ignoreDuplicates: false,
    });

  return upsertError ?? null;
}

async function getAnalytics(
  supabase: SupabaseClient,
  req: Request,
): Promise<Response> {
  try {
    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "7d";
    const type = url.searchParams.get("type") || "overview";

    let startDate: Date;
    const endDate = new Date();

    switch (period) {
      case "1d":
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    const startDateString = startDate.toISOString().split("T")[0];
    const endDateString = endDate.toISOString().split("T")[0];

    if (type === "overview") {
      // Get overview analytics
      const { data: dailyStats, error: dailyError } = await supabase
        .from("daily_analytics")
        .select("*")
        .gte("date", startDateString)
        .lte("date", endDateString)
        .order("date", { ascending: true });

      if (dailyError) {
        throw dailyError;
      }

      // Get user interactions summary
      const { data: interactions, error: interactionsError } = await supabase
        .from("user_interactions")
        .select("interaction_type, created_at")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (interactionsError) {
        throw interactionsError;
      }

      // Get conversion tracking
      const { data: conversions, error: conversionsError } = await supabase
        .from("conversion_tracking")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (conversionsError) {
        throw conversionsError;
      }

      const analytics = {
        period,
        daily_stats: dailyStats || [],
        total_interactions: interactions?.length || 0,
        total_conversions: conversions?.length || 0,
        interaction_breakdown: interactions?.reduce<Record<string, number>>(
          (acc, curr: { interaction_type: string }) => {
            acc[curr.interaction_type] = (acc[curr.interaction_type] || 0) + 1;
            return acc;
          },
          {},
        ) || {},
        conversion_breakdown: conversions?.reduce<Record<string, number>>(
          (acc, curr: { conversion_type: string }) => {
            acc[curr.conversion_type] = (acc[curr.conversion_type] || 0) + 1;
            return acc;
          },
          {},
        ) || {},
      };

      return new Response(
        JSON.stringify(analytics),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else if (type === "funnel") {
      // Get funnel analytics
      const { data: funnelData, error: funnelError } = await supabase
        .from("conversion_tracking")
        .select("conversion_type, created_at, plan_id, promo_code")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: true });

      if (funnelError) {
        throw funnelError;
      }

      return new Response(
        JSON.stringify({ funnel_data: funnelData || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid analytics type" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error getting analytics:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get analytics" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

export default handler;
