import { getServiceClient } from "../_shared/client.ts";
import {
  corsHeaders,
  jsonResponse,
  methodNotAllowed,
} from "../_shared/http.ts";
import { createLogger } from "../_shared/logger.ts";
import { registerHandler } from "../_shared/serve.ts";

const FUNCTION_NAME = "economic-calendar";
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

interface MarketNewsRow {
  id: number | string | null;
  source: string | null;
  headline: string | null;
  event_time: string | null;
  impact: string | null;
  currency: string | null;
  forecast: string | null;
  actual: string | null;
  created_at: string | null;
}

type CalendarEvent = {
  id: string;
  title: string;
  scheduled_at: string;
  impact?: string | null;
  market_focus: string[];
  commentary?: string;
  notes?: string;
  source?: string | null;
  forecast?: string | null;
  actual?: string | null;
};

function getLogger(req: Request) {
  return createLogger({
    function: FUNCTION_NAME,
    requestId: req.headers.get("sb-request-id") ||
      req.headers.get("x-request-id") ||
      crypto.randomUUID(),
  });
}

function parseLimit(value: string | null): number {
  if (!value) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  } catch {
    return null;
  }
}

function toIsoString(value: Date | null): string | null {
  if (!value) return null;
  return value.toISOString();
}

function splitTokens(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[\n,;|]/)
    .flatMap((token) => token.split("/"))
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function formatCommentary(row: MarketNewsRow): string | null {
  const segments: string[] = [];
  if (row.forecast && row.forecast.trim().length > 0) {
    segments.push(`Forecast: ${row.forecast.trim()}`);
  }
  if (row.actual && row.actual.trim().length > 0) {
    segments.push(`Actual: ${row.actual.trim()}`);
  }
  if (segments.length === 0) return null;
  return segments.join(" · ");
}

function mapRowToEvent(row: MarketNewsRow): CalendarEvent | null {
  const eventTime = row.event_time ?? row.created_at;
  if (!eventTime) return null;
  const parsedTime = new Date(eventTime);
  if (Number.isNaN(parsedTime.getTime())) return null;

  const idSource = row.id ?? row.event_time ?? row.headline;
  if (!idSource) return null;

  const title = row.headline?.trim() || row.source?.trim();
  if (!title) return null;

  const commentary = formatCommentary(row);
  const marketFocus = splitTokens(row.currency);

  const base: CalendarEvent = {
    id: String(idSource),
    title,
    scheduled_at: parsedTime.toISOString(),
    impact: row.impact,
    market_focus: marketFocus,
  };

  if (commentary) {
    base.commentary = commentary;
  }
  if (row.source && row.source.trim().length > 0) {
    base.source = row.source;
    base.notes = `Source: ${row.source.trim()}`;
  }
  if (row.forecast && row.forecast.trim().length > 0) {
    base.forecast = row.forecast.trim();
  }
  if (row.actual && row.actual.trim().length > 0) {
    base.actual = row.actual.trim();
  }

  return base;
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders(req, "GET,OPTIONS"),
        "access-control-max-age": "86400",
      },
    });
  }

  if (req.method !== "GET") {
    return methodNotAllowed(req);
  }

  const logger = getLogger(req);

  try {
    const url = new URL(req.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    const fromParam = parseDate(url.searchParams.get("from"));
    const toParam = parseDate(url.searchParams.get("to"));
    const sources = splitTokens(url.searchParams.get("source"));

    const supabase = getServiceClient();
    let query = supabase
      .from("market_news")
      .select(
        "id, source, headline, event_time, impact, currency, forecast, actual, created_at",
      )
      .order("event_time", { ascending: true })
      .limit(limit)
      .not("event_time", "is", null);

    const fromDateIso = toIsoString(fromParam ?? new Date());
    if (fromDateIso) {
      query = query.gte("event_time", fromDateIso);
    }

    if (toParam) {
      query = query.lte("event_time", toParam.toISOString());
    }

    if (sources.length > 0) {
      query = query.in("source", sources);
    }

    logger.info("Fetching market news events", {
      limit,
      from: fromDateIso,
      to: toParam ? toParam.toISOString() : null,
      sources,
    });

    const { data, error } = await query;

    if (error) {
      logger.error("Failed to load market news", error);
      return jsonResponse(
        { message: "Failed to load economic calendar events" },
        { status: 500 },
        req,
      );
    }

    const events = (data ?? [])
      .map((row) => mapRowToEvent(row as MarketNewsRow))
      .filter((event): event is CalendarEvent => event !== null);

    logger.info("Resolved economic calendar events", { count: events.length });

    return jsonResponse({ events }, { status: 200 }, req);
  } catch (err) {
    logger.error("Unexpected error in economic calendar function", err);
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ message }, { status: 500 }, req);
  }
});

export default handler;
