import tradingDeskPlan from "@/data/trading-desk-plan.json" with {
  type: "json",
};
import {
  getEconomicCalendarApiKey,
  getEconomicCalendarUrl,
} from "@/config/economic-calendar";
import { callEdgeFunction } from "@/config/supabase";
import { findInstrumentMetadata } from "@/data/instruments";
import type { EconomicEvent, ImpactLevel } from "@/types/economic-event";

const ECONOMIC_CALENDAR_URL = getEconomicCalendarUrl();
const ECONOMIC_CALENDAR_API_KEY = getEconomicCalendarApiKey();

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
  uid?: string | number | null;
  uuid?: string | number | null;
  unique_id?: string | number | null;
  uniqueId?: string | number | null;
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
  forecast?: string | number | null;
  consensus?: string | number | null;
  previous?: string | number | null;
  revised?: string | number | null;
  actual?: string | number | null;
  country?: string | null;
  currency?: string | null;
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

type OpenSourceCalendarEvent = {
  title?: string | null;
  date?: string | null;
  impact?: string | null;
  forecast?: string | number | null;
  previous?: string | number | null;
  actual?: string | number | null;
  country?: string | null;
  currency?: string | null;
};

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

type MarketQuote = {
  last: number;
  changePercent: number;
  high: number;
  low: number;
  updatedAt: Date | null;
};

type EconomicEventMarketInstrument =
  EconomicEvent["marketHighlights"][number]["instruments"][number];

const AWESOME_API_BASE_URL = "https://economia.awesomeapi.com.br/last";

const DEFAULT_NUMBER_FORMAT: Intl.NumberFormatOptions = {
  style: "decimal",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

const DXY_COMPOSITION: Array<{ instrumentId: string; exponent: number }> = [
  { instrumentId: "EURUSD", exponent: -0.576 },
  { instrumentId: "USDJPY", exponent: 0.136 },
  { instrumentId: "GBPUSD", exponent: -0.119 },
  { instrumentId: "USDCAD", exponent: 0.091 },
  { instrumentId: "USDSEK", exponent: 0.042 },
  { instrumentId: "USDCHF", exponent: 0.036 },
];

const MARKET_FOCUS_OVERRIDES: Record<string, string[]> = {
  usd: ["DXY"],
  "us dollar": ["DXY"],
  dxy: ["DXY"],
  eur: ["EURUSD"],
  euro: ["EURUSD"],
  jpy: ["USDJPY"],
  yen: ["USDJPY"],
  gbp: ["GBPUSD"],
  pound: ["GBPUSD"],
  aud: ["AUDUSD"],
  aussie: ["AUDUSD"],
  nzd: ["NZDUSD"],
  cad: ["USDCAD"],
  chf: ["USDCHF"],
  btc: ["BTCUSD"],
  bitcoin: ["BTCUSD"],
  eth: ["ETHUSD"],
  ether: ["ETHUSD"],
  xau: ["XAUUSD"],
  gold: ["XAUUSD"],
  xag: ["XAGUSD"],
  silver: ["XAGUSD"],
  oil: ["USOil"],
  "crude oil": ["USOil"],
  wti: ["USOil"],
  brent: ["UKOil"],
};

function normalizeFocusToken(value: string): string {
  return value.trim().toLowerCase();
}

function hasAwesomeApiSupport(instrumentId: string): boolean {
  if (instrumentId === "DXY") {
    return true;
  }

  const metadata = findInstrumentMetadata(instrumentId);
  return Boolean(metadata?.base && metadata.quote);
}

function resolveFocusInstruments(focus: string): string[] {
  const normalized = normalizeFocusToken(focus);
  if (!normalized) {
    return [];
  }

  const override = MARKET_FOCUS_OVERRIDES[normalized];
  if (override) {
    return override.filter((instrumentId) =>
      hasAwesomeApiSupport(instrumentId)
    );
  }

  const sanitized = focus.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!sanitized) {
    return [];
  }

  if (hasAwesomeApiSupport(sanitized)) {
    return [sanitized];
  }

  if (sanitized.length === 3) {
    if (sanitized === "USD") {
      return ["DXY"];
    }

    const forward = `${sanitized}USD`;
    if (hasAwesomeApiSupport(forward)) {
      return [forward];
    }

    const backward = `USD${sanitized}`;
    if (hasAwesomeApiSupport(backward)) {
      return [backward];
    }
  }

  return [];
}

function toAwesomeApiCode(instrumentId: string): string | null {
  const metadata = findInstrumentMetadata(instrumentId);
  if (!metadata?.base || !metadata.quote) {
    return null;
  }
  return `${metadata.base}-${metadata.quote}`;
}

function parseNumber(value?: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseTimestamp(value?: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = `${value.replace(" ", "T")}Z`;
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
}

async function fetchAwesomeApiQuotes(
  instrumentIds: Iterable<string>,
): Promise<Record<string, MarketQuote>> {
  const targets = new Set<string>();

  for (const instrumentId of instrumentIds) {
    if (instrumentId === "DXY") {
      for (const component of DXY_COMPOSITION) {
        targets.add(component.instrumentId);
      }
      continue;
    }

    if (hasAwesomeApiSupport(instrumentId)) {
      targets.add(instrumentId);
    }
  }

  const marketCodes = Array.from(targets)
    .map((instrumentId) => toAwesomeApiCode(instrumentId))
    .filter((code): code is string => Boolean(code));

  if (marketCodes.length === 0) {
    return {};
  }

  const url = `${AWESOME_API_BASE_URL}/${marketCodes.join(",")}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(
      `AwesomeAPI request failed: ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as Record<
    string,
    {
      bid?: string;
      pctChange?: string;
      high?: string;
      low?: string;
      create_date?: string | null;
    }
  >;

  const quotes: Record<string, MarketQuote> = {};

  for (const [key, value] of Object.entries(payload)) {
    const last = parseNumber(value.bid);
    const changePercent = parseNumber(value.pctChange);
    const high = parseNumber(value.high);
    const low = parseNumber(value.low);

    if (
      last === undefined ||
      changePercent === undefined ||
      high === undefined ||
      low === undefined
    ) {
      continue;
    }

    const timestamp = parseTimestamp(value.create_date);
    quotes[key] = {
      last,
      changePercent,
      high,
      low,
      updatedAt: timestamp ? new Date(timestamp) : null,
    };
  }

  return quotes;
}

function computeDxyQuote(
  quotes: Record<string, MarketQuote>,
): MarketQuote | undefined {
  const base = 50.14348112;
  let last = base;
  let high = base;
  let low = base;
  let changeDecimal = 0;

  for (const { instrumentId, exponent } of DXY_COMPOSITION) {
    const quote = quotes[instrumentId];
    if (!quote) {
      return undefined;
    }

    const rate = quote.last;
    const highRate = exponent >= 0 ? quote.high : quote.low;
    const lowRate = exponent >= 0 ? quote.low : quote.high;

    if (
      rate === undefined ||
      highRate === undefined ||
      lowRate === undefined ||
      !Number.isFinite(rate) ||
      !Number.isFinite(highRate) ||
      !Number.isFinite(lowRate)
    ) {
      return undefined;
    }

    last *= Math.pow(rate, exponent);
    high *= Math.pow(highRate, exponent);
    low *= Math.pow(lowRate, exponent);
    changeDecimal += exponent * (quote.changePercent / 100);
  }

  const computedHigh = Math.max(high, low);
  const computedLow = Math.min(high, low);

  if (
    !Number.isFinite(last) ||
    !Number.isFinite(computedHigh) ||
    !Number.isFinite(computedLow)
  ) {
    return undefined;
  }

  return {
    last,
    high: computedHigh,
    low: computedLow,
    changePercent: changeDecimal * 100,
    updatedAt: null,
  };
}

async function withMarketHighlights(
  events: EconomicEvent[],
): Promise<EconomicEvent[]> {
  if (events.length === 0) {
    return events;
  }

  const focusPlans = events.map((event) =>
    event.marketFocus.map((focus) => ({
      focus,
      instrumentIds: resolveFocusInstruments(focus),
    }))
  );

  const instruments = new Set<string>();
  for (const focusPlan of focusPlans) {
    for (const { instrumentIds } of focusPlan) {
      for (const instrumentId of instrumentIds) {
        instruments.add(instrumentId);
      }
    }
  }

  let quotes: Record<string, MarketQuote> = {};

  if (instruments.size > 0) {
    try {
      quotes = await fetchAwesomeApiQuotes(instruments);
    } catch (error) {
      console.error(
        "Failed to load AwesomeAPI quotes for economic calendar",
        error,
      );
      quotes = {};
    }

    if (instruments.has("DXY")) {
      const dxy = computeDxyQuote(quotes);
      if (dxy) {
        const updatedAtSource = DXY_COMPOSITION
          .map((component) =>
            quotes[component.instrumentId]?.updatedAt?.getTime()
          )
          .filter((value): value is number =>
            value !== undefined && Number.isFinite(value)
          );
        const updatedAt = updatedAtSource.length > 0
          ? new Date(Math.max(...updatedAtSource))
          : null;
        quotes = { ...quotes, DXY: { ...dxy, updatedAt } };
      }
    }
  }

  return events.map((event, index) => {
    const focusPlan = focusPlans[index];
    const marketHighlights = focusPlan.map(({ focus, instrumentIds }) => {
      const instrumentsWithData = instrumentIds
        .map((instrumentId): EconomicEventMarketInstrument | null => {
          const metadata = findInstrumentMetadata(instrumentId);
          if (!metadata) {
            return null;
          }
          const quote = quotes[instrumentId];
          const instrument: EconomicEventMarketInstrument = {
            instrumentId: metadata.id,
            displaySymbol: metadata.displaySymbol ?? metadata.id,
            name: metadata.name,
            format: metadata.format ?? DEFAULT_NUMBER_FORMAT,
            last: quote?.last,
            changePercent: quote?.changePercent,
            high: quote?.high,
            low: quote?.low,
            lastUpdated: quote?.updatedAt
              ? quote.updatedAt.toISOString()
              : null,
          };
          return instrument;
        })
        .filter((entry): entry is EconomicEventMarketInstrument =>
          entry !== null
        );

      return { focus, instruments: instrumentsWithData };
    });

    return { ...event, marketHighlights };
  });
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

function extractCountry(raw: RawEconomicEvent): string | null {
  const candidate = firstString(raw.country, raw.currency);
  if (!candidate) {
    return null;
  }
  const normalized = candidate.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function toIsoStringIfValid(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function buildStatsCommentary(raw: RawEconomicEvent): string | null {
  const segments: string[] = [];
  const forecast = firstString(raw.forecast, raw.consensus);
  if (forecast) {
    segments.push(`Forecast: ${forecast}`);
  }
  const previous = firstString(raw.previous, raw.revised);
  if (previous) {
    segments.push(`Previous: ${previous}`);
  }
  const actual = firstString(raw.actual);
  if (actual) {
    segments.push(`Actual: ${actual}`);
  }
  return segments.length > 0 ? segments.join(" · ") : null;
}

function deriveEventId(
  raw: RawEconomicEvent,
  title: string,
  index: number,
): string | null {
  const direct = firstString(
    raw.id,
    raw.slug,
    raw.code,
    raw.event_id,
    raw.external_id,
    raw.uid,
    raw.uuid,
    raw.unique_id,
    raw.uniqueId,
  );
  if (direct) {
    return direct;
  }

  const dateToken = firstString(
    raw.scheduled_at,
    raw.scheduledAt,
    raw.start_at,
    raw.startAt,
    raw.timestamp,
    raw.datetime,
    raw.date_time,
    raw.date,
  );

  const slugSegments = [
    dateToken ? dateToken.replace(/[^0-9A-Za-z]/g, "") : null,
    extractCountry(raw),
    title,
  ].filter((segment): segment is string => Boolean(segment));

  const slug = slugSegments
    .map((segment) =>
      segment
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    )
    .filter((segment) => segment.length > 0)
    .join("-")
    .replace(/-{2,}/g, "-");

  if (slug.length > 0) {
    return slug;
  }

  return `event-${index}`;
}

function matchDeskPlanByTitle(
  title: string,
  raw: RawEconomicEvent,
): string | null {
  const normalizedTitle = title.toLowerCase();
  const country = extractCountry(raw);

  if (
    normalizedTitle.includes("fomc") ||
    normalizedTitle.includes("federal open market") ||
    normalizedTitle.includes("powell")
  ) {
    return "fomc";
  }

  if (
    normalizedTitle.includes("ecb") ||
    normalizedTitle.includes("lagarde")
  ) {
    return "ecb-speeches";
  }

  if (
    country === "GBP" &&
    (normalizedTitle.includes("cpi") || normalizedTitle.includes("inflation"))
  ) {
    return "uk-cpi";
  }

  if (
    (country === "USD" || country === "US") &&
    normalizedTitle.includes("pmi")
  ) {
    return "us-pmi";
  }

  return null;
}

function isOpenSourceCalendarEvent(
  value: unknown,
): value is OpenSourceCalendarEvent {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.title === "string" && typeof record.date === "string";
}

function mapOpenSourceCalendarEvent(
  value: OpenSourceCalendarEvent,
): RawEconomicEvent | null {
  if (typeof value.title !== "string" || typeof value.date !== "string") {
    return null;
  }

  const title = value.title.trim();
  if (title.length === 0) {
    return null;
  }

  const scheduledAt = toIsoStringIfValid(value.date) ?? value.date;
  const impact = typeof value.impact === "string" ? value.impact : null;
  const forecast = firstString(value.forecast);
  const previous = firstString(value.previous);
  const actual = firstString(value.actual);
  const countryValue = firstString(value.country, value.currency);
  const normalizedCountry = countryValue ? countryValue.toUpperCase() : null;

  const base: RawEconomicEvent = {
    title,
    scheduled_at: scheduledAt,
    date: value.date,
    impact,
    forecast,
    previous,
    actual,
    country: normalizedCountry ?? null,
    currency: normalizedCountry ?? null,
    market_focus: normalizedCountry ? [normalizedCountry] : undefined,
    notes: normalizedCountry ? `Country: ${normalizedCountry}` : undefined,
  };

  return base;
}

function extractRawEconomicEvents(
  payload: EconomicCalendarResponse,
): RawEconomicEvent[] {
  const collection = Array.isArray(payload)
    ? payload
    : payload?.events ?? payload?.data ?? payload?.result ?? null;

  if (!Array.isArray(collection)) {
    return [];
  }

  if (collection.every(isOpenSourceCalendarEvent)) {
    return collection
      .map((entry) => mapOpenSourceCalendarEvent(entry))
      .filter((entry): entry is RawEconomicEvent => entry !== null);
  }

  return collection as RawEconomicEvent[];
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

function parseDeskPlan(
  raw: RawEconomicEvent,
  eventId: string,
  title: string,
): string[] {
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
  const matchedPlanId = matchDeskPlanByTitle(title, raw) ?? eventId;
  return getDeskPlanFromSnapshot(matchedPlanId);
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
    raw.currency,
    raw.country,
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

function formatDay(date: Date | null, fallback?: string | null): string {
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

function formatTime(date: Date | null, fallback?: string | null): string {
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
  index: number,
): { event: EconomicEvent; sortKey: number } | null {
  const title = firstString(raw.title, raw.name, raw.headline, raw.label);
  if (!title) {
    return null;
  }

  const eventId = deriveEventId(raw, title, index);
  if (!eventId) {
    return null;
  }

  const baseCommentary = firstString(
    raw.commentary,
    raw.summary,
    raw.description,
    raw.notes,
  );
  const statsCommentary = buildStatsCommentary(raw);
  const commentaryParts = [baseCommentary, statsCommentary]
    .filter((part): part is string => Boolean(part && part.trim().length > 0));
  const uniqueCommentary = commentaryParts.filter((part, index, array) =>
    array.findIndex((value) => value === part) === index
  );
  const commentary = uniqueCommentary.length > 0
    ? uniqueCommentary.join(" · ")
    : "";

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
    marketHighlights: [],
    commentary,
    deskPlan: parseDeskPlan(raw, eventId, title),
  };

  return { event, sortKey };
}

function normalizeEconomicEvents(
  payload: EconomicCalendarResponse,
): EconomicEvent[] {
  const collection = extractRawEconomicEvents(payload);

  if (collection.length === 0) {
    return [];
  }

  return collection
    .map((raw, index) => normalizeEconomicEvent(raw, index))
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

  const events = normalizeEconomicEvents(data);
  return withMarketHighlights(events);
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
  const events = normalizeEconomicEvents(data);
  return withMarketHighlights(events);
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
    if (cachedEvents !== null && !cachedError) {
      return cachedEvents;
    }
    if (pendingRequest) {
      return pendingRequest;
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
      cachedEvents = null;
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
