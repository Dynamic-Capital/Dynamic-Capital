export interface PostgrestErrorLike {
  code: string;
  details: string | null;
  hint: string | null;
  message: string;
}

interface DailyAnalyticsRow {
  button_clicks: Record<string, unknown> | null;
}

type ButtonClickMap = Record<string, number>;

type MaybeSingleResult = {
  data: DailyAnalyticsRow | null;
  error: PostgrestErrorLike | null;
};

interface DailyAnalyticsSelectQuery {
  eq(column: string, value: string): DailyAnalyticsSelectQuery;
  maybeSingle(): Promise<MaybeSingleResult>;
}

interface DailyAnalyticsUpsertQuery {
  upsert(
    payload: { date: string; button_clicks: ButtonClickMap },
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ): Promise<{ data: unknown; error: PostgrestErrorLike | null }>;
}

export interface DailyAnalyticsClient {
  from(table: string): DailyAnalyticsSelectQuery & DailyAnalyticsUpsertQuery & {
    select(_columns: string): DailyAnalyticsSelectQuery;
  };
}

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
  supabase: DailyAnalyticsClient,
  date: string,
  eventType: string,
): Promise<PostgrestErrorLike | null> {
  const { data, error } = await supabase
    .from("daily_analytics")
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
