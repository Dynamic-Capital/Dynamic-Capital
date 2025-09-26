"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

import {
  type Colors,
  Column,
  Heading,
  Icon,
  Line,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";

import { useSupabase } from "@/context/SupabaseProvider";

type Positioning = "Overweight" | "Market weight" | "Underweight";

type FundamentalInsight = {
  id: string;
  asset: string;
  sector: string;
  positioning: Positioning;
  summary: string;
  catalysts: string[];
  riskControls: string;
  metrics: { label: string; value: string }[];
};

const POSITIONING_VALUES = [
  "Overweight",
  "Market weight",
  "Underweight",
] as const satisfies readonly Positioning[];

const isPositioning = (value: string | undefined): value is Positioning =>
  Boolean(value && POSITIONING_VALUES.includes(value as Positioning));

type FundamentalHighlightApiEntry = {
  id: string;
  asset: string;
  sector: string;
  positioning: string;
  summary: string;
  catalysts?: string[];
  riskControls: string;
  metrics?: Array<{ label: string; value: string }>;
  updatedAt?: string;
};

type FundamentalHighlightsResponse = {
  data?: FundamentalHighlightApiEntry[];
};

const POSITIONING_STYLES: Record<
  Positioning,
  { background: Colors; icon: string }
> = {
  Overweight: { background: "brand-alpha-weak", icon: "trending-up" },
  "Market weight": { background: "neutral-alpha-weak", icon: "bar-chart" },
  Underweight: { background: "danger-alpha-weak", icon: "trending-down" },
};

const STATIC_FUNDAMENTAL_INSIGHTS: FundamentalInsight[] = [
  {
    id: "nvda",
    asset: "NVDA",
    sector: "Semiconductors",
    positioning: "Overweight",
    summary:
      "Data-center backlog and H200 ramp keep revenue visibility high through FY25. Demand from hyperscalers and sovereign AI funds still exceeds supply.",
    catalysts: [
      "May earnings update with fresh visibility on Blackwell shipments",
      "Potential incremental capex commitments from top-three hyperscalers",
    ],
    riskControls:
      "Scaling entries on pullbacks toward $820 with invalidation under $780 weekly support. Hedged via SOXX puts into earnings window.",
    metrics: [
      { label: "YoY revenue", value: "+262%" },
      { label: "Gross margin", value: "74%" },
      { label: "Forward P/E", value: "33x" },
    ],
  },
  {
    id: "cldx",
    asset: "CLDX",
    sector: "Biotech",
    positioning: "Market weight",
    summary:
      "Pipeline milestones in Q2 keep optionality alive, but valuation already prices in a successful Phase 2b readout. We stay balanced while waiting on data.",
    catalysts: [
      "Phase 2b results for CDX-0159 chronic urticaria study",
      "Partnership chatter with large-cap pharma for commercialization support",
    ],
    riskControls:
      "Hold core starter size with a stop under $30. Leverage covered calls to finance protection ahead of binary data catalysts.",
    metrics: [
      { label: "Cash runway", value: "8 quarters" },
      { label: "EV / Sales", value: "6.2x" },
      { label: "Short interest", value: "7%" },
    ],
  },
  {
    id: "xom",
    asset: "XOM",
    sector: "Energy",
    positioning: "Underweight",
    summary:
      "Crude supply discipline supports cash flows, but valuation no longer compensates for slowing downstream margins and energy transition capex needs.",
    catalysts: [
      "Next OPEC+ meeting commentary on summer production targets",
      "US Gulf Coast margin data for indications of refining softness",
    ],
    riskControls:
      "Running a reduced core position with tight stop above $125. Pair trade expressed through long CVX / short XOM to keep sector beta neutral.",
    metrics: [
      { label: "Dividend yield", value: "3.1%" },
      { label: "Net debt / EBITDA", value: "0.7x" },
      { label: "Implied Brent", value: "$83" },
    ],
  },
];

const FUNDAMENTAL_REFRESH_MS = 5 * 60_000;

export function FundamentalAnalysisSection() {
  const { supabase } = useSupabase();
  const [liveInsights, setLiveInsights] = useState<FundamentalInsight[] | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const usingLiveData = liveInsights !== null;
  const insights = liveInsights ?? STATIC_FUNDAMENTAL_INSIGHTS;

  const lastUpdatedLabel = useMemo(() => {
    if (!usingLiveData) {
      return "Showing latest desk playbook snapshot";
    }

    if (!lastUpdated) {
      return isLoading ? "Refreshing highlights…" : "Awaiting live highlights";
    }

    const formatted = new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(lastUpdated);
    return `Updated ${formatted}`;
  }, [isLoading, lastUpdated, usingLiveData]);

  useEffect(() => {
    let isMounted = true;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    const normaliseHighlight = (
      entry: FundamentalHighlightApiEntry,
    ): FundamentalInsight => ({
      id: entry.id,
      asset: entry.asset,
      sector: entry.sector,
      positioning: isPositioning(entry.positioning)
        ? entry.positioning
        : "Market weight",
      summary: entry.summary,
      catalysts: entry.catalysts ?? [],
      riskControls: entry.riskControls,
      metrics: entry.metrics ?? [],
    });

    const resolveLastUpdated = (
      entries: FundamentalHighlightApiEntry[],
    ): Date | null => {
      let latest: Date | null = null;
      for (const entry of entries) {
        if (!entry.updatedAt) continue;
        const parsed = new Date(entry.updatedAt);
        if (Number.isNaN(parsed.getTime())) continue;
        if (!latest || parsed > latest) {
          latest = parsed;
        }
      }
      return latest;
    };

    async function fetchHighlights() {
      if (!isMounted) return;

      setIsLoading(true);

      try {
        const { data, error: fnError } = await supabase.functions.invoke<
          FundamentalHighlightsResponse
        >("fundamental-positioning-highlights", { method: "GET" });

        if (!isMounted) return;

        if (fnError) {
          setError(fnError.message ?? "Failed to load highlights");
        } else if (Array.isArray(data?.data)) {
          setLiveInsights(data.data.map(normaliseHighlight));
          setLastUpdated(resolveLastUpdated(data.data));
          setError(null);
        }
      } catch (caught: unknown) {
        if (isMounted) {
          const message = caught instanceof Error
            ? caught.message
            : "Failed to load highlights";
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          if (refreshTimer) {
            clearTimeout(refreshTimer);
          }
          refreshTimer = setTimeout(fetchHighlights, FUNDAMENTAL_REFRESH_MS);
        }
      }
    }

    fetchHighlights();

    const channel = supabase
      .channel("fundamental-positioning-highlights")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fundamental_positioning" },
        () => {
          if (!isMounted) return;
          fetchHighlights();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const showEmptyState = usingLiveData && insights.length === 0 && !isLoading;

  return (
    <Column
      id="fundamental-analysis"
      fillWidth
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      gap="32"
      shadow="l"
    >
      <Column gap="12" maxWidth={32}>
        <Heading variant="display-strong-xs">
          Fundamental positioning highlights
        </Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Snapshot of the desk's highest conviction fundamental calls this week,
          including catalysts on the radar and the risk controls backing each
          stance.
        </Text>
        <Text variant="label-default-s" onBackground="neutral-medium">
          {lastUpdatedLabel}
        </Text>
        {error
          ? (
            <Text variant="label-default-s" onBackground="danger-medium">
              {error}
            </Text>
          )
          : null}
      </Column>
      <Column gap="24">
        {showEmptyState
          ? (
            <Text variant="body-default-m" onBackground="neutral-medium">
              Live positioning feed has no published highlights yet.
            </Text>
          )
          : (
            insights.map((insight, index) => {
              const positioningStyles = POSITIONING_STYLES[insight.positioning];

              return (
                <Fragment key={insight.id}>
                  <Column
                    background="page"
                    border="neutral-alpha-weak"
                    radius="l"
                    padding="l"
                    gap="20"
                  >
                    <Row
                      horizontal="between"
                      vertical="center"
                      gap="12"
                      s={{ direction: "column", align: "start" }}
                    >
                      <Column gap="4">
                        <Heading variant="heading-strong-m">
                          {insight.asset}
                        </Heading>
                        <Text
                          variant="body-default-s"
                          onBackground="neutral-medium"
                        >
                          {insight.sector}
                        </Text>
                      </Column>
                      <Tag
                        size="s"
                        background={positioningStyles.background}
                        prefixIcon={positioningStyles.icon}
                      >
                        {insight.positioning}
                      </Tag>
                    </Row>
                    <Text variant="body-default-m" onBackground="neutral-weak">
                      {insight.summary}
                    </Text>
                    <Column gap="12">
                      <Heading
                        as="h3"
                        variant="label-default-m"
                        onBackground="neutral-medium"
                      >
                        Key catalysts
                      </Heading>
                      <Column as="ul" gap="8">
                        {insight.catalysts.map((catalyst, catalystIndex) => (
                          <Row key={catalystIndex} gap="8" vertical="start">
                            <Icon name="sparkles" onBackground="brand-medium" />
                            <Text as="li" variant="body-default-m">
                              {catalyst}
                            </Text>
                          </Row>
                        ))}
                      </Column>
                    </Column>
                    <Column gap="12">
                      <Heading
                        as="h3"
                        variant="label-default-m"
                        onBackground="neutral-medium"
                      >
                        Risk controls
                      </Heading>
                      <Text variant="body-default-m">
                        {insight.riskControls}
                      </Text>
                    </Column>
                    <Row gap="8" wrap>
                      {insight.metrics.map((metric) => (
                        <Tag
                          key={metric.label}
                          size="s"
                          background="neutral-alpha-weak"
                        >
                          {metric.label}: {metric.value}
                        </Tag>
                      ))}
                    </Row>
                  </Column>
                  {index < insights.length - 1
                    ? <Line background="neutral-alpha-weak" />
                    : null}
                </Fragment>
              );
            })
          )}
      </Column>
    </Column>
  );
}

export default FundamentalAnalysisSection;
