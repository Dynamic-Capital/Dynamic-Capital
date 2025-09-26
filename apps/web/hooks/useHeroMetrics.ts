"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEdgeFunction } from "@/hooks/useEdgeFunction";
import { SUPABASE_ENV_ERROR } from "@/config/supabase";

const NUMBER_FORMAT = new Intl.NumberFormat("en-US");

const DEFAULT_RESPONSE: LandingHeroMetricsResponse = {
  generatedAt: "1970-01-01T00:00:00.000Z",
  tradersOnboarded: { total: 9200 },
  liveSignals: {
    last30Days: 180,
    last90Days: 540,
    windows: { last30Days: 30, last90Days: 90 },
  },
  mentorSatisfaction: {
    average: 4.9,
    fallback: true,
    sampleSize: 0,
    lastSubmissionAt: null,
    windowDays: 90,
  },
};

export interface LandingHeroMetricsResponse {
  generatedAt: string;
  tradersOnboarded: { total: number };
  liveSignals: {
    last30Days: number;
    last90Days: number;
    windows: { last30Days: number; last90Days: number };
  };
  mentorSatisfaction: {
    average: number | null;
    fallback: boolean;
    sampleSize: number;
    lastSubmissionAt: string | null;
    windowDays: number;
  };
}

export interface HeroMetricDisplay {
  icon: string;
  label: string;
  value: string;
  rawValue: number | null;
  isFallback: boolean;
}

interface QuickMetricDisplay extends HeroMetricDisplay {
  helperText?: string;
}

function formatCount(value: number, plusThreshold = 100): string {
  const rounded = Math.max(0, Math.floor(value));
  const formatted = NUMBER_FORMAT.format(rounded);
  return rounded >= plusThreshold ? `${formatted}+` : formatted;
}

function formatScore(value: number | null): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value.toFixed(1)}/5`;
  }
  return "N/A";
}

function deriveHeroMetrics(
  data: LandingHeroMetricsResponse,
  usingFallback: boolean,
): HeroMetricDisplay[] {
  return [
    {
      icon: "users",
      label: "traders onboarded to the desk",
      value: formatCount(data.tradersOnboarded.total, 500),
      rawValue: data.tradersOnboarded.total,
      isFallback: usingFallback,
    },
    {
      icon: "timer",
      label: "live signals executed in the last 30 days",
      value: formatCount(data.liveSignals.last30Days, 50),
      rawValue: data.liveSignals.last30Days,
      isFallback: usingFallback,
    },
    {
      icon: "sparkles",
      label: "mentor satisfaction score",
      value: formatScore(data.mentorSatisfaction.average),
      rawValue: data.mentorSatisfaction.average,
      isFallback: usingFallback || data.mentorSatisfaction.fallback,
    },
  ];
}

function deriveQuickMetrics(
  data: LandingHeroMetricsResponse,
  usingFallback: boolean,
): QuickMetricDisplay[] {
  const cadencePerDay = data.liveSignals.windows.last30Days > 0
    ? data.liveSignals.last30Days / data.liveSignals.windows.last30Days
    : 0;
  return [
    {
      icon: "timer",
      label: "signal cadence this month",
      value: `${cadencePerDay.toFixed(1)}/day`,
      helperText: `${
        formatCount(data.liveSignals.last30Days, 50)
      } total in the last 30 days`,
      rawValue: cadencePerDay,
      isFallback: usingFallback,
    },
    {
      icon: "target",
      label: "signals executed in the last 90 days",
      value: formatCount(data.liveSignals.last90Days, 100),
      rawValue: data.liveSignals.last90Days,
      isFallback: usingFallback,
    },
    {
      icon: "sparkles",
      label: "mentor satisfaction (90-day window)",
      value: formatScore(data.mentorSatisfaction.average),
      helperText: data.mentorSatisfaction.sampleSize > 0
        ? `${data.mentorSatisfaction.sampleSize} recent reviews`
        : "Awaiting new reviews",
      rawValue: data.mentorSatisfaction.average,
      isFallback: usingFallback || data.mentorSatisfaction.fallback,
    },
  ];
}

export function useHeroMetrics() {
  const callEdgeFunction = useEdgeFunction();

  const query = useQuery<LandingHeroMetricsResponse, Error>({
    queryKey: ["landing-hero-metrics"],
    queryFn: async () => {
      if (SUPABASE_ENV_ERROR) {
        throw new Error(SUPABASE_ENV_ERROR);
      }

      const { data, error } = await callEdgeFunction<
        LandingHeroMetricsResponse
      >(
        "LANDING_HERO_METRICS",
        { method: "GET" },
      );

      if (error) {
        throw new Error(error.message);
      }

      return data ?? DEFAULT_RESPONSE;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const resolvedData = query.data ?? DEFAULT_RESPONSE;
  const usingFallback = !query.data;

  const heroMetrics = useMemo(
    () => deriveHeroMetrics(resolvedData, usingFallback),
    [resolvedData, usingFallback],
  );

  const quickMetrics = useMemo(
    () => deriveQuickMetrics(resolvedData, usingFallback),
    [resolvedData, usingFallback],
  );

  return {
    data: query.data,
    resolved: resolvedData,
    heroMetrics,
    quickMetrics,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
