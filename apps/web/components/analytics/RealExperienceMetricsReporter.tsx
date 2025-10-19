"use client";

import { useEffect, useRef } from "react";
import { type Metric, onCLS, onINP, onLCP, onTTFB } from "web-vitals";

import { useAnalytics } from "@/hooks/useAnalytics";

type MetricName = "CLS" | "LCP" | "INP" | "TTFB";

type MetricThreshold = {
  good: number;
  poor: number;
};

const METRIC_THRESHOLDS: Record<MetricName, MetricThreshold> = {
  CLS: { good: 0.1, poor: 0.25 },
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  TTFB: { good: 800, poor: 1800 },
};

const METRIC_WEIGHTS: Record<MetricName, number> = {
  CLS: 0.25,
  LCP: 0.3,
  INP: 0.25,
  TTFB: 0.2,
};

type CapturedMetric =
  & Pick<Metric, "name" | "value" | "rating" | "navigationType">
  & {
    delta: number;
  };

function scoreMetric(name: MetricName, value: number): number {
  const { good, poor } = METRIC_THRESHOLDS[name];

  if (name === "CLS") {
    if (value <= good) return 100;
    if (value >= poor) return 0;
    const range = poor - good;
    const offset = value - good;
    return Math.max(0, Math.round(100 * (1 - offset / range)));
  }

  if (value <= good) return 100;
  if (value >= poor) return 0;
  const range = poor - good;
  const offset = value - good;
  return Math.max(0, Math.round(100 * (1 - offset / range)));
}

function computeScore(
  metrics: Partial<Record<MetricName, CapturedMetric>>,
): number | null {
  let weightedScore = 0;
  let totalWeight = 0;

  (Object.keys(METRIC_WEIGHTS) as MetricName[]).forEach((name) => {
    const metric = metrics[name];
    if (!metric) {
      return;
    }
    const weight = METRIC_WEIGHTS[name];
    weightedScore += scoreMetric(name, metric.value) * weight;
    totalWeight += weight;
  });

  if (totalWeight === 0) {
    return null;
  }

  return Math.round(weightedScore / totalWeight);
}

export function RealExperienceMetricsReporter() {
  const { trackEvent } = useAnalytics();
  const metricsRef = useRef<Partial<Record<MetricName, CapturedMetric>>>({});
  const reportedRef = useRef(false);

  useEffect(() => {
    if (reportedRef.current) {
      return;
    }

    const maybeReport = (force = false) => {
      if (reportedRef.current) {
        return;
      }

      const metrics = metricsRef.current;
      const hasPrimaryMetrics = metrics.LCP !== undefined &&
        metrics.CLS !== undefined &&
        metrics.TTFB !== undefined;

      if (!force && !hasPrimaryMetrics) {
        return;
      }

      const score = computeScore(metrics);
      if (score === null) {
        return;
      }

      reportedRef.current = true;

      const timestamp = new Date().toISOString();
      const serializedMetrics = Object.fromEntries(
        Object.entries(metrics).map(([key, metric]) => [
          key,
          metric
            ? {
              value: metric.value,
              rating: metric.rating,
              delta: metric.delta,
              navigationType: metric.navigationType,
            }
            : null,
        ]),
      );

      trackEvent({
        event_type: "real_experience_metrics",
        interaction_data: {
          score,
          metrics: serializedMetrics,
          timestamp,
        },
      });

      if (process.env.NODE_ENV !== "production") {
        console.info("[RES] Real experience metrics", { score, metrics });
      }
    };

    const reportTimeout = window.setTimeout(() => {
      maybeReport(true);
    }, 10_000);

    onCLS((metric) => {
      metricsRef.current.CLS = {
        name: metric.name as MetricName,
        value: metric.value,
        rating: metric.rating,
        navigationType: metric.navigationType,
        delta: metric.delta,
      };
      maybeReport();
    });

    onLCP((metric) => {
      metricsRef.current.LCP = {
        name: metric.name as MetricName,
        value: metric.value,
        rating: metric.rating,
        navigationType: metric.navigationType,
        delta: metric.delta,
      };
      maybeReport();
    });

    onINP((metric) => {
      metricsRef.current.INP = {
        name: metric.name as MetricName,
        value: metric.value,
        rating: metric.rating,
        navigationType: metric.navigationType,
        delta: metric.delta,
      };
      maybeReport();
    }, { reportAllChanges: true });

    onTTFB((metric) => {
      metricsRef.current.TTFB = {
        name: metric.name as MetricName,
        value: metric.value,
        rating: metric.rating,
        navigationType: metric.navigationType,
        delta: metric.delta,
      };
      maybeReport();
    });

    return () => {
      window.clearTimeout(reportTimeout);
    };
  }, [trackEvent]);

  return null;
}
