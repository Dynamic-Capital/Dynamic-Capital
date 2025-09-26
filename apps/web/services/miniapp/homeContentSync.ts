import { callEdgeFunction } from "@/config/supabase";

export type HomeSectionId =
  | "hero"
  | "status"
  | "promo"
  | "announcements"
  | "market-pulse"
  | "about"
  | "services"
  | "plans"
  | "cta";

export interface HomeContent {
  aboutUs: string;
  services: string;
  announcements: string;
}

export interface MarketPulseMetric {
  id: string;
  label: string;
  value: number;
  change?: number;
  changeLabel?: string;
  description?: string;
  unit?: string;
  confidence?: number;
}

export interface MultiLlmInsight {
  provider: string;
  message: string;
  emphasis?: "marketing" | "popularity" | "neutral";
}

interface ProviderSectionScore {
  id: HomeSectionId;
  score: number;
  reason?: string;
}

interface ProviderInference {
  sections: ProviderSectionScore[];
  overrides?: Partial<HomeContent>;
  metrics?: MarketPulseMetric[];
  insights?: MultiLlmInsight[];
  confidence: number;
  latencyMs?: number;
  usedFallback?: boolean;
}

interface MultiLlmPayload {
  baseContent: HomeContent;
  baseScores: Record<HomeSectionId, number>;
  analytics: MiniAppAnalyticsSummary;
  subscription?: SubscriptionSnapshot | null;
}

interface MultiLlmProviderConfig {
  id: string;
  label: string;
  weight: number;
  infer: (payload: MultiLlmPayload) => Promise<ProviderInference>;
}

export interface SubscriptionSnapshot {
  is_vip?: boolean;
  plan_name?: string;
  days_remaining?: number;
  payment_status?: string;
}

export interface DynamicHomeSyncResult {
  order: HomeSectionId[];
  sections: Array<
    ProviderSectionScore & {
      providerBreakdown: Record<string, number>;
    }
  >;
  metrics: MarketPulseMetric[];
  overrides?: Partial<HomeContent>;
  insights: MultiLlmInsight[];
  updatedAt: string;
  providers: Array<
    {
      id: string;
      label: string;
      confidence: number;
      latencyMs?: number;
      usedFallback?: boolean;
    }
  >;
}

interface MiniAppAnalyticsSummary {
  views: Record<HomeSectionId, number>;
  conversions: {
    plans?: number;
    promos?: number;
    support?: number;
  };
  marketingCampaigns: Array<{
    section: HomeSectionId;
    priority: number;
    headline?: string;
    boost?: number;
  }>;
  pnl?: number;
  pnlChange?: number;
  growthRate?: number;
  retentionRate?: number;
  vipShare?: number;
  marketingMomentum?: number;
}

const DEFAULT_ANALYTICS_SUMMARY: MiniAppAnalyticsSummary = {
  views: {
    hero: 1,
    status: 0.6,
    promo: 0.5,
    announcements: 0.4,
    "market-pulse": 0.5,
    about: 0.3,
    services: 0.35,
    plans: 0.45,
    cta: 0.4,
  },
  conversions: {
    plans: 0.32,
    promos: 0.18,
    support: 0.12,
  },
  marketingCampaigns: [
    { section: "plans", priority: 0.8, headline: "VIP push", boost: 0.15 },
    { section: "promo", priority: 0.6, headline: "Promo sprint", boost: 0.1 },
  ],
  pnl: 0.68,
  pnlChange: 0.12,
  growthRate: 0.54,
  retentionRate: 0.74,
  vipShare: 0.41,
  marketingMomentum: 0.6,
};

export const DEFAULT_MARKET_PULSE_METRICS: MarketPulseMetric[] = [
  {
    id: "pnl",
    label: "30d Realized PnL",
    value: 68,
    change: 12,
    changeLabel: "+12%",
    description: "Trailing 30-day profit & loss momentum",
    unit: "%",
    confidence: 0.6,
  },
  {
    id: "growth",
    label: "Signal Accuracy Growth",
    value: 54,
    change: 6,
    changeLabel: "+6%",
    description: "Accuracy delta compared to previous week",
    unit: "%",
    confidence: 0.55,
  },
  {
    id: "vip",
    label: "VIP Conversion",
    value: 41,
    change: 4,
    changeLabel: "+4%",
    description: "Share of users upgrading to VIP",
    unit: "%",
    confidence: 0.5,
  },
  {
    id: "engagement",
    label: "Daily Engagement",
    value: 72,
    change: 9,
    changeLabel: "+9%",
    description: "Rolling engagement index across sections",
    unit: "%",
    confidence: 0.58,
  },
];

export const DEFAULT_HOME_SECTION_ORDER: HomeSectionId[] = [
  "hero",
  "status",
  "promo",
  "announcements",
  "market-pulse",
  "about",
  "services",
  "plans",
  "cta",
];

function sanitizeNumber(value: unknown): number | undefined {
  if (typeof value !== "number") return undefined;
  if (!Number.isFinite(value)) return undefined;
  return value;
}

function normalizeRatio(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  if (value > 1) {
    return Math.max(0, Math.min(100, value));
  }
  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}

async function loadAnalyticsSummary(): Promise<MiniAppAnalyticsSummary> {
  try {
    const { data, error } = await callEdgeFunction<Record<string, unknown>>(
      "ANALYTICS_DATA",
      {
        method: "POST",
        body: {
          scope: "miniapp-home",
          timeframe: "7d",
        },
      },
    );

    if (error || !data) {
      throw new Error(error?.message ?? "No analytics payload");
    }

    return parseAnalyticsPayload(data);
  } catch (analyticsError) {
    console.warn("Falling back to default analytics summary", analyticsError);
    return DEFAULT_ANALYTICS_SUMMARY;
  }
}

function parseAnalyticsPayload(
  raw: Record<string, unknown>,
): MiniAppAnalyticsSummary {
  const summary: MiniAppAnalyticsSummary = {
    views: { ...DEFAULT_ANALYTICS_SUMMARY.views },
    conversions: { ...DEFAULT_ANALYTICS_SUMMARY.conversions },
    marketingCampaigns: [...DEFAULT_ANALYTICS_SUMMARY.marketingCampaigns],
    pnl: DEFAULT_ANALYTICS_SUMMARY.pnl,
    pnlChange: DEFAULT_ANALYTICS_SUMMARY.pnlChange,
    growthRate: DEFAULT_ANALYTICS_SUMMARY.growthRate,
    retentionRate: DEFAULT_ANALYTICS_SUMMARY.retentionRate,
    vipShare: DEFAULT_ANALYTICS_SUMMARY.vipShare,
    marketingMomentum: DEFAULT_ANALYTICS_SUMMARY.marketingMomentum,
  };

  const candidateViews = raw["section_views"] ?? raw["views"];
  if (candidateViews && typeof candidateViews === "object") {
    for (const [key, value] of Object.entries(candidateViews)) {
      if ((key as HomeSectionId) && typeof value === "number") {
        const section = key as HomeSectionId;
        summary.views[section] = Math.max(0, value);
      }
    }
  }

  const candidateConversions = raw["conversions"];
  if (candidateConversions && typeof candidateConversions === "object") {
    const conversions = candidateConversions as Record<string, unknown>;
    if (typeof conversions["plans"] === "number") {
      summary.conversions.plans = Math.max(0, conversions["plans"] as number);
    }
    if (typeof conversions["promos"] === "number") {
      summary.conversions.promos = Math.max(0, conversions["promos"] as number);
    }
    if (typeof conversions["support"] === "number") {
      summary.conversions.support = Math.max(
        0,
        conversions["support"] as number,
      );
    }
  }

  const campaignsRaw = raw["marketing_campaigns"];
  if (Array.isArray(campaignsRaw)) {
    summary.marketingCampaigns = campaignsRaw.reduce<
      MiniAppAnalyticsSummary["marketingCampaigns"]
    >((acc, entry) => {
      if (!entry || typeof entry !== "object") {
        return acc;
      }
      const data = entry as Record<string, unknown>;
      const section = data["section"];
      if (typeof section !== "string") {
        return acc;
      }
      acc.push({
        section: section as HomeSectionId,
        priority: typeof data["priority"] === "number"
          ? data["priority"] as number
          : 0.5,
        headline: typeof data["headline"] === "string"
          ? data["headline"] as string
          : undefined,
        boost: typeof data["boost"] === "number"
          ? data["boost"] as number
          : 0.1,
      });
      return acc;
    }, []);
  }

  const pnl = sanitizeNumber(raw["pnl"] ?? raw["realized_pnl"]);
  if (typeof pnl === "number") {
    summary.pnl = pnl;
  }

  const pnlChange = sanitizeNumber(raw["pnl_change"]);
  if (typeof pnlChange === "number") {
    summary.pnlChange = pnlChange;
  }

  const growth = sanitizeNumber(raw["growth_rate"] ?? raw["accuracy_growth"]);
  if (typeof growth === "number") {
    summary.growthRate = growth;
  }

  const retention = sanitizeNumber(raw["retention_rate"]);
  if (typeof retention === "number") {
    summary.retentionRate = retention;
  }

  const vipShare = sanitizeNumber(raw["vip_share"] ?? raw["vip_conversion"]);
  if (typeof vipShare === "number") {
    summary.vipShare = vipShare;
  }

  const momentum = sanitizeNumber(
    raw["marketing_momentum"] ?? raw["campaign_momentum"],
  );
  if (typeof momentum === "number") {
    summary.marketingMomentum = momentum;
  }

  return summary;
}

function buildBaseScores(
  analytics: MiniAppAnalyticsSummary,
  subscription?: SubscriptionSnapshot | null,
): Record<HomeSectionId, number> {
  const base: Record<HomeSectionId, number> = {
    ...DEFAULT_BASE_SECTION_WEIGHTS,
  };

  const totalViews = Object.values(analytics.views).reduce(
    (acc, value) => acc + (Number.isFinite(value) ? value : 0),
    0,
  );

  if (totalViews > 0) {
    for (const section of DEFAULT_HOME_SECTION_ORDER) {
      const sectionViews = analytics.views[section] ?? 0;
      const popularityShare = sectionViews / totalViews;
      base[section] += popularityShare * 0.4;
    }
  }

  if (subscription?.is_vip) {
    base.plans += 0.2;
    base.status += 0.15;
  } else {
    base.plans += 0.05;
    base.status -= 0.1;
  }

  const marketingBoost = analytics.marketingMomentum ?? 0;
  base["market-pulse"] += marketingBoost * 0.3;
  base.promo += (analytics.conversions.promos ?? 0) * 0.25;
  base.plans += (analytics.conversions.plans ?? 0) * 0.35;

  return base;
}

const DEFAULT_BASE_SECTION_WEIGHTS: Record<HomeSectionId, number> = {
  hero: 0.8,
  status: 0.45,
  promo: 0.5,
  announcements: 0.42,
  "market-pulse": 0.48,
  about: 0.35,
  services: 0.4,
  plans: 0.6,
  cta: 0.55,
};

const MULTI_LLM_PROVIDERS: MultiLlmProviderConfig[] = [
  {
    id: "popularity-engine",
    label: "Popularity Signal Model",
    weight: 0.55,
    infer: async (payload) => {
      const start = typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();
      const viewScores = Object.entries(payload.analytics.views).map((
        [key, value],
      ) => ({
        id: key as HomeSectionId,
        weight: Number.isFinite(value) ? (value as number) : 0,
      }));

      const totalWeight = viewScores.reduce(
        (acc, item) => acc + item.weight,
        0,
      );

      const sections: ProviderSectionScore[] = DEFAULT_HOME_SECTION_ORDER.map(
        (section) => {
          const entry = viewScores.find((item) => item.id === section);
          const normalized = totalWeight > 0 && entry
            ? entry.weight / totalWeight
            : 0;
          const score = payload.baseScores[section] + normalized * 0.8;
          let reason = `Section engagement share ${
            (normalized * 100).toFixed(1)
          }%`;
          if (section === "plans") {
            reason += ` · conversions ${
              (payload.analytics.conversions.plans ?? 0) * 100
            }%`;
          }
          return {
            id: section,
            score,
            reason,
          };
        },
      );

      const insights: MultiLlmInsight[] = [];
      const ranked = [...sections].sort((a, b) => b.score - a.score).slice(
        0,
        2,
      );
      for (const section of ranked) {
        insights.push({
          provider: "Popularity Signal Model",
          message: `${section.id.replace("-", " ")} is trending with ${
            section.score.toFixed(2)
          } weighted score`,
          emphasis: "popularity",
        });
      }

      return {
        sections,
        metrics: buildMetricsFromAnalytics(payload.analytics),
        insights,
        confidence: 0.75,
        latencyMs:
          (typeof performance !== "undefined" && performance.now
            ? performance.now()
            : Date.now()) - start,
      };
    },
  },
  {
    id: "marketing-engine",
    label: "Marketing Strategy Model",
    weight: 0.45,
    infer: async (payload) => {
      const start = typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();
      const campaigns = payload.analytics.marketingCampaigns;
      const sections: ProviderSectionScore[] = DEFAULT_HOME_SECTION_ORDER.map(
        (section) => {
          const campaign = campaigns.find((item) => item.section === section);
          const campaignBoost = campaign ? (campaign.boost ?? 0.1) : 0;
          const score = payload.baseScores[section] + campaignBoost * 0.9;
          const reason = campaign
            ? `Active campaign priority ${
              (campaign.priority * 100).toFixed(0)
            }%`
            : "Baseline marketing weighting";
          return { id: section, score, reason };
        },
      );

      const overrides: Partial<HomeContent> = {};
      const promoCampaign = campaigns.find((campaign) =>
        campaign.section === "promo"
      );
      if (promoCampaign?.headline) {
        overrides.announcements =
          `${promoCampaign.headline}\nOur marketing desk recommends spotlighting promos today.`;
      }

      const insights: MultiLlmInsight[] = campaigns.slice(0, 2).map((
        campaign,
      ) => ({
        provider: "Marketing Strategy Model",
        message: `${campaign.section.replace("-", " ")} boosted by ${
          (campaign.priority * 100).toFixed(0)
        }% priority`,
        emphasis: "marketing",
      }));

      return {
        sections,
        overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
        metrics: emphasizeMarketingMetrics(payload.analytics),
        insights,
        confidence: 0.68,
        latencyMs:
          (typeof performance !== "undefined" && performance.now
            ? performance.now()
            : Date.now()) - start,
      };
    },
  },
];

function buildMetricsFromAnalytics(
  analytics: MiniAppAnalyticsSummary,
): MarketPulseMetric[] {
  return [
    {
      id: "pnl",
      label: "30d Realized PnL",
      value: normalizeRatio(
        analytics.pnl,
        DEFAULT_MARKET_PULSE_METRICS[0].value,
      ),
      change: analytics.pnlChange,
      changeLabel: analytics.pnlChange !== undefined
        ? `${analytics.pnlChange >= 0 ? "+" : ""}${
          (analytics.pnlChange * 100).toFixed(1)
        }%`
        : DEFAULT_MARKET_PULSE_METRICS[0].changeLabel,
      description: "Trailing 30-day profit & loss momentum",
      unit: "%",
      confidence: 0.72,
    },
    {
      id: "growth",
      label: "Signal Accuracy Growth",
      value: normalizeRatio(
        analytics.growthRate,
        DEFAULT_MARKET_PULSE_METRICS[1].value,
      ),
      change: analytics.growthRate,
      changeLabel: analytics.growthRate !== undefined
        ? `${analytics.growthRate >= 0 ? "+" : ""}${
          (analytics.growthRate * 100).toFixed(1)
        }%`
        : DEFAULT_MARKET_PULSE_METRICS[1].changeLabel,
      description: "Accuracy delta compared to previous week",
      unit: "%",
      confidence: 0.66,
    },
    {
      id: "vip",
      label: "VIP Conversion",
      value: normalizeRatio(
        analytics.vipShare,
        DEFAULT_MARKET_PULSE_METRICS[2].value,
      ),
      change: analytics.vipShare,
      changeLabel: analytics.vipShare !== undefined
        ? `${analytics.vipShare >= 0 ? "+" : ""}${
          (analytics.vipShare * 100).toFixed(1)
        }%`
        : DEFAULT_MARKET_PULSE_METRICS[2].changeLabel,
      description: "Share of users upgrading to VIP",
      unit: "%",
      confidence: 0.61,
    },
    {
      id: "engagement",
      label: "Daily Engagement",
      value: normalizeRatio(
        analytics.retentionRate,
        DEFAULT_MARKET_PULSE_METRICS[3].value,
      ),
      change: analytics.retentionRate,
      changeLabel: analytics.retentionRate !== undefined
        ? `${analytics.retentionRate >= 0 ? "+" : ""}${
          (analytics.retentionRate * 100).toFixed(1)
        }%`
        : DEFAULT_MARKET_PULSE_METRICS[3].changeLabel,
      description: "Rolling engagement index across sections",
      unit: "%",
      confidence: 0.64,
    },
  ];
}

function emphasizeMarketingMetrics(
  analytics: MiniAppAnalyticsSummary,
): MarketPulseMetric[] {
  const base = buildMetricsFromAnalytics(analytics);
  const marketingMomentum = normalizeRatio(
    analytics.marketingMomentum,
    60,
  );
  return base.map((metric) => {
    if (metric.id === "engagement") {
      return {
        ...metric,
        label: "Engagement Momentum",
        value: Math.round((metric.value + marketingMomentum) / 2),
        confidence: 0.7,
      };
    }
    if (metric.id === "vip") {
      return {
        ...metric,
        value: Math.min(100, Math.round(metric.value * 1.05)),
        confidence: 0.69,
      };
    }
    return metric;
  });
}

export async function fetchDynamicHomeSync(
  input: {
    baseContent: HomeContent;
    subscription?: SubscriptionSnapshot | null;
  },
): Promise<DynamicHomeSyncResult> {
  const analytics = await loadAnalyticsSummary();
  const baseScores = buildBaseScores(analytics, input.subscription);

  const providersResults = await Promise.all(
    MULTI_LLM_PROVIDERS.map(async (provider) => {
      try {
        const inference = await provider.infer({
          baseContent: input.baseContent,
          baseScores,
          analytics,
          subscription: input.subscription,
        });
        return { provider, inference };
      } catch (error) {
        console.warn(`Provider ${provider.id} failed`, error);
        return {
          provider,
          inference: {
            sections: DEFAULT_HOME_SECTION_ORDER.map((section) => ({
              id: section,
              score: baseScores[section],
              reason: "Fallback weighting",
            })),
            metrics: DEFAULT_MARKET_PULSE_METRICS,
            insights: [
              {
                provider: provider.label,
                message: "Provider fallback activated",
                emphasis: "neutral",
              },
            ],
            confidence: 0.4,
            usedFallback: true,
          } satisfies ProviderInference,
        };
      }
    }),
  );

  const sectionsAggregation = new Map<
    HomeSectionId,
    {
      score: number;
      reasons: string[];
      providerBreakdown: Record<string, number>;
    }
  >();

  const aggregatedMetrics = new Map<
    string,
    { value: number; weight: number; metric: MarketPulseMetric }
  >();
  const insights: MultiLlmInsight[] = [];

  for (const { provider, inference } of providersResults) {
    const providerWeight = provider.weight * (inference.confidence ?? 0.5);

    for (const section of inference.sections) {
      if (!sectionsAggregation.has(section.id)) {
        sectionsAggregation.set(section.id, {
          score: baseScores[section.id] ?? 0,
          reasons: [],
          providerBreakdown: {},
        });
      }
      const aggregate = sectionsAggregation.get(section.id)!;
      aggregate.score += section.score * providerWeight;
      if (section.reason) {
        aggregate.reasons.push(`${provider.label}: ${section.reason}`);
      }
      aggregate.providerBreakdown[provider.id] = section.score;
    }

    if (inference.metrics) {
      for (const metric of inference.metrics) {
        const existing = aggregatedMetrics.get(metric.id);
        const weightedValue = metric.value * providerWeight;
        if (!existing) {
          aggregatedMetrics.set(metric.id, {
            value: weightedValue,
            weight: providerWeight,
            metric,
          });
        } else {
          existing.value += weightedValue;
          existing.weight += providerWeight;
        }
      }
    }

    if (inference.insights) {
      insights.push(...inference.insights);
    }
  }

  const sections = DEFAULT_HOME_SECTION_ORDER.map((section) => {
    const aggregate = sectionsAggregation.get(section);
    if (!aggregate) {
      return {
        id: section,
        score: baseScores[section] ?? 0,
        reason: "Baseline weighting",
        providerBreakdown: {},
      };
    }
    return {
      id: section,
      score: aggregate.score,
      reason: aggregate.reasons.join(" · ") || "Baseline weighting",
      providerBreakdown: aggregate.providerBreakdown,
    };
  }).sort((a, b) => b.score - a.score);

  const metrics = Array.from(aggregatedMetrics.values()).map((entry) => ({
    ...entry.metric,
    value: Math.round(
      entry.weight > 0 ? entry.value / entry.weight : entry.metric.value,
    ),
  }));

  const providers = providersResults.map(({ provider, inference }) => ({
    id: provider.id,
    label: provider.label,
    confidence: inference.confidence,
    latencyMs: inference.latencyMs,
    usedFallback: inference.usedFallback,
  }));

  const combinedOverrides: Partial<HomeContent> = {};
  for (const { inference } of providersResults) {
    if (!inference.overrides) continue;
    Object.assign(combinedOverrides, inference.overrides);
  }

  return {
    order: sections.map((section) => section.id),
    sections,
    metrics: metrics.length > 0 ? metrics : DEFAULT_MARKET_PULSE_METRICS,
    overrides: Object.keys(combinedOverrides).length > 0
      ? combinedOverrides
      : undefined,
    insights,
    updatedAt: new Date().toISOString(),
    providers,
  };
}
