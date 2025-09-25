import tradingDeskPlan from "@/data/trading-desk-plan.json" with { type: "json" };
import { callEdgeFunction } from "@/config/supabase";
import type { EconomicEvent, ImpactLevel } from "@/types/economic-event";
import { optionalEnvVar } from "@/utils/env";

const ECONOMIC_CALENDAR_URL = optionalEnvVar(
  "NEXT_PUBLIC_ECONOMIC_CALENDAR_URL",
  ["ECONOMIC_CALENDAR_URL"],
);
const ECONOMIC_CALENDAR_API_KEY = optionalEnvVar(
  "NEXT_PUBLIC_ECONOMIC_CALENDAR_API_KEY",
  ["ECONOMIC_CALENDAR_API_KEY"],
);

type TradingDeskPlanSnapshot = {
  plan?: unknown;
};

const TRADING_DESK_PLAN = tradingDeskPlan as Record<
  string,
  TradingDeskPlanSnapshot | undefined
>;

type RawEconomicEvent = {
  id?: string | number | null;
  slug?: string | number | null;
  code?: string | number | null;
  event_id?: string | number | null;
  external_id?: string | number | null;
  day?: string | null;
  date?: string | null;
  time?: string | null;
  timezone?: string | null;
  timezone_label?: string | null;
  timezoneLabel?: string | null;
  start_at?: string | null;
  startAt?: string | null;
  scheduled_at?: string | null;
  scheduledAt?: string | null;
  timestamp?: string | null;
  datetime?: string | null;
  date_time?: string | null;
  title?: string | null;
  name?: string | null;
  headline?: string | null;
  label?: string | null;
  description?: string | null;
  summary?: string | null;
  commentary?: string | null;
  notes?: string | null;
  impact?: string | null;
  impact_level?: string | null;
  impactLevel?: string | null;
  importance?: string | null;
  market_focus?: unknown;
  marketFocus?: unknown;
  focus?: unknown;
  focus_markets?: unknown;
  focusMarkets?: unknown;
  desk_plan?: unknown;
  deskPlan?: unknown;
  desk_plan_id?: string | null;
  deskPlanId?: string | null;
};

type EconomicCalendarResponse =
  | RawEconomicEvent[]
  | {
    events?: RawEconomicEvent[] | null;
    data?: RawEconomicEvent[] | null;
    result?: RawEconomicEvent[] | null;
  }
  | null
  | undefined;

type CalendarSource = "rest" | "edge";

export interface FetchEconomicEventsOptions {
  force?: boolean;
  /**
   * Select a specific source or allow the service to determine the best
   * available provider. When `auto` is used the REST endpoint (if configured)
   * is attempted first before falling back to the Supabase edge function.
   */
  source?: "auto" | CalendarSource;
}

let cachedEvents: EconomicEvent[] | null = null;
let cachedError: string | null = null;
let pendingRequest: Promise<EconomicEvent[]> | null = null;

function firstString(
  ...values: (string | number | null | undefined)[]
): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    } else if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

function sanitizeStrings(values: unknown[]): string[] {
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function parseDelimited(value: string): string[] {
  return value
    .split(/[\n;,|]/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function ensureStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return sanitizeStrings(value);
  }
  if (typeof value === "string") {
    return parseDelimited(value);
  }
  return [];
}

function getDeskPlanFromSnapshot(eventId: string): string[] {
  const snapshot = TRADING_DESK_PLAN[eventId];
  if (!snapshot) {
    return [];
  }
  const { plan } = snapshot;
  if (Array.isArray(plan)) {
    return sanitizeStrings(plan);
  }
  if (typeof plan === "string") {
    return parseDelimited(plan);
  }
  return [];
}

function parseDeskPlan(raw: RawEconomicEvent, eventId: string): string[] {
  const fromPayload = ensureStringArray(raw.desk_plan ?? raw.deskPlan);
  if (fromPayload.length > 0) {
    return fromPayload;
  }
  const byId = firstString(raw.desk_plan_id ?? raw.deskPlanId);
  if (byId) {
    const plan = getDeskPlanFromSnapshot(byId);
    if (plan.length > 0) {
      return plan;
    }
  }
  return getDeskPlanFromSnapshot(eventId);
}

function coerceImpact(value: unknown): ImpactLevel {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "high") return "High";
    if (normalized === "medium") return "Medium";
    if (normalized === "low") return "Low";
  }
  return "Medium";
}

function parseMarketFocus(raw: RawEconomicEvent): string[] {
  const focusCandidates = [
    raw.market_focus,
    raw.marketFocus,
    raw.focus,
    raw.focus_markets,
    raw.focusMarkets,
  ];

  for (const candidate of focusCandidates) {
    const parsed = ensureStringArray(candidate);
    if (parsed.length > 0) {
      return parsed;
    }
  }

  return [];
}

function parseDate(raw: RawEconomicEvent): Date | null {
  const candidates = [
    raw.scheduled_at,
    raw.scheduledAt,
    raw.start_at,
    raw.startAt,
    raw.timestamp,
    raw.datetime,
    raw.date_time,
    raw.date,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string" || candidate.trim().length === 0) {
      continue;
    }
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (typeof raw.date === "string" && typeof raw.time === "string") {
    const combined = `${raw.date}T${raw.time}`;
    const parsed = new Date(combined);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function formatDay(date: Date | null, fallback: string | null): string {
  if (date) {
    const weekday = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "UTC",
    }).format(date);
    const monthDay = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    }).format(date);
    return `${weekday} · ${monthDay}`;
  }

  if (typeof fallback === "string" && fallback.trim().length > 0) {
    return fallback.trim();
  }

  return "—";
}

function formatTime(date: Date | null, fallback: string | null): string {
  if (date) {
    const time = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(date);
    return `${time} GMT`;
  }

  if (typeof fallback === "string" && fallback.trim().length > 0) {
    return fallback.trim();
  }

  return "--:-- GMT";
}

function normalizeEconomicEvent(
  raw: RawEconomicEvent,
): { event: EconomicEvent; sortKey: number } | null {
  const eventId = firstString(
    raw.id,
    raw.slug,
    raw.code,
    raw.event_id,
    raw.external_id,
  );
  if (!eventId) {
    return null;
  }

  const title = firstString(raw.title, raw.name, raw.headline, raw.label);
  if (!title) {
    return null;
  }

  const commentary = firstString(
    raw.commentary,
    raw.summary,
    raw.description,
    raw.notes,
  ) ?? "";

  const date = parseDate(raw);
  const sortKey = date ? date.getTime() : Number.POSITIVE_INFINITY;

  const event: EconomicEvent = {
    id: eventId,
    title,
    day: formatDay(date, raw.day),
    time: formatTime(date, raw.time),
    impact: coerceImpact(
      raw.impact ?? raw.impact_level ?? raw.impactLevel ?? raw.importance,
    ),
    marketFocus: parseMarketFocus(raw),
    commentary,
    deskPlan: parseDeskPlan(raw, eventId),
  };

  return { event, sortKey };
}

function normalizeEconomicEvents(
  payload: EconomicCalendarResponse,
): EconomicEvent[] {
  const collection: RawEconomicEvent[] | null | undefined =
    Array.isArray(payload)
      ? payload
      : payload?.events ?? payload?.data ?? payload?.result ?? null;

  if (!Array.isArray(collection)) {
    return [];
  }

  return collection
    .map((raw) => normalizeEconomicEvent(raw))
    .filter((entry): entry is { event: EconomicEvent; sortKey: number } =>
      entry !== null
    )
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((entry) => entry.event);
}

async function fetchFromEdge(): Promise<EconomicEvent[]> {
  const { data, error } = await callEdgeFunction<EconomicCalendarResponse>(
    "ECONOMIC_CALENDAR",
  );

  if (error) {
    throw new Error(error.message || "Unable to load economic calendar events");
  }

  return normalizeEconomicEvents(data);
}

async function fetchFromRest(): Promise<EconomicEvent[]> {
  if (!ECONOMIC_CALENDAR_URL) {
    throw new Error("Economic calendar endpoint is not configured");
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (ECONOMIC_CALENDAR_API_KEY) {
    headers["x-api-key"] = ECONOMIC_CALENDAR_API_KEY;
  }

  const response = await fetch(ECONOMIC_CALENDAR_URL, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Economic calendar request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as EconomicCalendarResponse;
  return normalizeEconomicEvents(data);
}

function resolveSources(
  source: FetchEconomicEventsOptions["source"],
): CalendarSource[] {
  if (source === "rest") {
    return ["rest"];
  }
  if (source === "edge") {
    return ["edge"];
  }

  const candidates: CalendarSource[] = [];
  if (ECONOMIC_CALENDAR_URL) {
    candidates.push("rest");
  }
  candidates.push("edge");
  return candidates;
}

export async function fetchEconomicEvents(
  options: FetchEconomicEventsOptions = {},
): Promise<EconomicEvent[]> {
  const { force = false, source = "auto" } = options;

  if (force) {
    cachedEvents = null;
    cachedError = null;
  } else {
    if (cachedEvents) {
      return cachedEvents;
    }
    if (pendingRequest) {
      return pendingRequest;
    }
    if (cachedError && cachedEvents) {
      return cachedEvents;
    }
  }

  const sources = resolveSources(source);

  const request = (async () => {
    let lastError: Error | null = null;
    let lastResult: EconomicEvent[] | null = null;

    for (const candidate of sources) {
      try {
        const result = candidate === "rest"
          ? await fetchFromRest()
          : await fetchFromEdge();
        if (result.length > 0) {
          return result;
        }
        lastResult = result;
      } catch (err) {
        const error = err instanceof Error
          ? err
          : new Error("Unable to load economic calendar events");
        lastError = error;
      }
    }

    if (lastResult) {
      return lastResult;
    }

    if (lastError) {
      throw lastError;
    }

    return [];
  })();

  pendingRequest = request
    .then((events) => {
      cachedEvents = events;
      cachedError = null;
      return events;
    })
    .catch((err) => {
      cachedEvents = [];
      cachedError = err instanceof Error ? err.message : String(err);
      throw err instanceof Error
        ? err
        : new Error("Unable to load economic calendar events");
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}

export function getCachedEconomicEvents(): EconomicEvent[] {
  return cachedEvents ?? [];
}

export function getCachedEconomicEventsError(): string | null {
  return cachedError;
}

export function resetEconomicCalendarCache() {
  cachedEvents = null;
  cachedError = null;
  pendingRequest = null;
}

export function isFetchingEconomicEvents(): boolean {
  return pendingRequest !== null;
}
