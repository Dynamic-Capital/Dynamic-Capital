"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Brain,
  Clock,
  Crown,
  Gift,
  LineChart,
  type LucideIcon,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceStackCarousel } from "@/components/shared/ServiceStackCarousel";
import { callEdgeFunction } from "@/config/supabase";
import { useDeskClock } from "@/hooks/useDeskClock";
import {
  DEFAULT_MARKET_PULSE_METRICS,
  fetchDynamicHomeSync,
  type MarketPulseMetric,
  type MultiLlmInsight,
} from "@/services/miniapp/homeContentSync";
import { toast } from "sonner";

import { AskSection } from "./AskSection";
import { FAQSection } from "./FAQSection";
import PlanSection from "./PlanSection";
import { QuickActions } from "./QuickActions";
import StatusSection from "./StatusSection";
import { MiniAppMetricsSliders } from "./MiniAppMetricsSliders";

type TelegramData = {
  user?: {
    id: number;
  };
};

type HomeLandingProps = {
  telegramData: TelegramData;
};

type BotContent = {
  content_key: string;
  content_value: string;
};

type ActivePromo = {
  code: string;
  description?: string;
  discount_type?: string;
  discount_value?: number;
  valid_until?: string;
};

const DEFAULT_ABOUT_TEXT =
  "Dynamic Capital delivers professional trading insights, high-velocity signals, and a dedicated support desk built for serious investors.";
const DEFAULT_SERVICES_TEXT =
  "📈 Real-time Trading Signals\n📊 Daily Market Analysis\n🛡️ Risk Management Guidance\n👨‍🏫 Personal Trading Mentor\n💎 Exclusive VIP Community\n📞 24/7 Customer Support";
const DEFAULT_ANNOUNCEMENT =
  "🚀 Welcome to the new Dynamic Capital experience. Tap a section below to explore plans, market intelligence, and support.";

const HERO_HIGHLIGHT_ICONS: Record<string, LucideIcon> = {
  pnl: LineChart,
  growth: TrendingUp,
  vip: Crown,
  engagement: Activity,
};

const INSIGHT_ICON_MAP: Record<
  NonNullable<MultiLlmInsight["emphasis"]>,
  LucideIcon
> = {
  marketing: Megaphone,
  popularity: Sparkles,
  neutral: Brain,
};

function clampConfidence(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return Math.min(Math.max(value, 0), 1);
}

function ConfidenceGauge({ value }: { value?: number | null }) {
  const confidence = clampConfidence(value);

  if (confidence === null) {
    return null;
  }

  const degrees = confidence * 360;
  const percentage = Math.round(confidence * 100);

  return (
    <div className="relative h-12 w-12">
      <div
        className="h-full w-full rounded-full border border-primary/20 bg-muted/30"
        style={{
          background:
            `conic-gradient(hsl(var(--primary)) ${degrees}deg, hsl(var(--primary) / 0.1) ${degrees}deg 360deg)`,
        }}
      />
      <div className="absolute inset-[5px] flex items-center justify-center rounded-full bg-background/90 text-[10px] font-semibold text-primary">
        {percentage}%
      </div>
    </div>
  );
}

function parseServiceHighlights(services: string) {
  return services
    .split("\n")
    .map((service) =>
      service
        .replace(/\p{Extended_Pictographic}/gu, "")
        .replace("•", "")
        .trim()
    )
    .filter(Boolean)
    .slice(0, 4);
}

function formatPromoBadge(promo?: ActivePromo | null) {
  if (!promo) return null;
  const { discount_type, discount_value } = promo;
  if (discount_type === "percentage" && typeof discount_value === "number") {
    return `${discount_value}% off`;
  }
  if (discount_type === "fixed" && typeof discount_value === "number") {
    return `$${discount_value} off`;
  }
  return "Special offer";
}

export default function HomeLanding({ telegramData }: HomeLandingProps) {
  const [about, setAbout] = useState(DEFAULT_ABOUT_TEXT);
  const [services, setServices] = useState(DEFAULT_SERVICES_TEXT);
  const [announcement, setAnnouncement] = useState(DEFAULT_ANNOUNCEMENT);
  const [metrics, setMetrics] = useState<MarketPulseMetric[]>(
    DEFAULT_MARKET_PULSE_METRICS,
  );
  const [insights, setInsights] = useState<MultiLlmInsight[]>([]);
  const [activePromo, setActivePromo] = useState<ActivePromo | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const deskClock = useDeskClock();
  const isInTelegram = typeof window !== "undefined" &&
    Boolean(window.Telegram?.WebApp);

  useEffect(() => {
    let mounted = true;

    const fetchContent = async () => {
      setLoading(true);

      try {
        const { data: contentData, status: contentStatus } =
          await callEdgeFunction("CONTENT_BATCH", {
            method: "POST",
            body: {
              keys: ["about_us", "our_services", "announcements"],
            },
          });

        let nextAbout = DEFAULT_ABOUT_TEXT;
        let nextServices = DEFAULT_SERVICES_TEXT;
        let nextAnnouncement = DEFAULT_ANNOUNCEMENT;

        if (
          contentStatus === 200 &&
          (contentData as { ok?: boolean; contents?: BotContent[] })?.contents
        ) {
          const contents =
            (contentData as { contents?: BotContent[] }).contents ?? [];
          const aboutEntry = contents.find((item) =>
            item.content_key === "about_us"
          );
          const servicesEntry = contents.find((item) =>
            item.content_key === "our_services"
          );
          const announcementEntry = contents.find((item) =>
            item.content_key === "announcements"
          );

          if (aboutEntry?.content_value) {
            nextAbout = aboutEntry.content_value;
          }
          if (servicesEntry?.content_value) {
            nextServices = servicesEntry.content_value;
          }
          if (announcementEntry?.content_value) {
            nextAnnouncement = announcementEntry.content_value;
          }
        }

        if (!mounted) return;
        setAbout(nextAbout);
        setServices(nextServices);
        setAnnouncement(nextAnnouncement);

        try {
          const syncResult = await fetchDynamicHomeSync({
            baseContent: {
              aboutUs: nextAbout,
              services: nextServices,
              announcements: nextAnnouncement,
            },
            subscription: null,
          });

          if (!mounted) return;

          setMetrics(
            syncResult.metrics.length > 0
              ? syncResult.metrics
              : DEFAULT_MARKET_PULSE_METRICS,
          );
          setInsights(syncResult.insights);
          setLastSyncedAt(syncResult.updatedAt ?? null);
        } catch (syncError) {
          console.error("Failed to run dynamic home sync", syncError);
          if (mounted) {
            setMetrics(DEFAULT_MARKET_PULSE_METRICS);
            setInsights([]);
            setLastSyncedAt(null);
          }
        }
      } catch (error) {
        console.error("Failed to fetch mini app content", error);
        if (mounted) {
          setAbout(DEFAULT_ABOUT_TEXT);
          setServices(DEFAULT_SERVICES_TEXT);
          setAnnouncement(DEFAULT_ANNOUNCEMENT);
          setMetrics(DEFAULT_MARKET_PULSE_METRICS);
        }
      }

      try {
        const { data: promoData, status: promoStatus } = await callEdgeFunction(
          "ACTIVE_PROMOS",
        );
        if (
          mounted &&
          promoStatus === 200 &&
          (promoData as { promotions?: ActivePromo[] })?.promotions?.length
        ) {
          const [firstPromo] = (promoData as { promotions?: ActivePromo[] })
            .promotions!;
          setActivePromo(firstPromo);
        } else if (mounted) {
          setActivePromo(null);
        }
      } catch (promoError) {
        console.warn("Promo fetch failed", promoError);
        if (mounted) {
          setActivePromo(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void fetchContent();

    return () => {
      mounted = false;
    };
  }, []);

  const handlePromoCopy = useCallback(async () => {
    if (!activePromo?.code || typeof navigator === "undefined") return;

    const clipboard = navigator.clipboard;
    if (!clipboard?.writeText) {
      toast.error("Clipboard not available in this browser");
      return;
    }

    try {
      await clipboard.writeText(activePromo.code);
      toast.success("Promo code copied");
    } catch (error) {
      console.warn("Failed to copy promo code", error);
      toast.error("Couldn't copy promo code");
    }
  }, [activePromo?.code]);

  const serviceHighlights = useMemo(
    () => parseServiceHighlights(services),
    [services],
  );

  const averageConfidence = useMemo(() => {
    const confidences = metrics
      .map((metric) => clampConfidence(metric.confidence))
      .filter((value): value is number => value !== null);

    if (confidences.length === 0) return null;

    const mean = confidences.reduce((total, confidence) =>
      total + confidence, 0) /
      confidences.length;

    return {
      percentage: Math.round(mean * 100),
      label: mean >= 0.75
        ? "High confidence"
        : mean >= 0.55
        ? "Stable confidence"
        : "Emerging signal",
    };
  }, [metrics]);

  const heroHighlights = useMemo(
    () =>
      metrics.slice(0, 3).map((metric) => {
        const Icon = HERO_HIGHLIGHT_ICONS[metric.id] ?? Sparkles;
        const valueLabel = typeof metric.value === "number"
          ? `${metric.value}${metric.unit ?? ""}`
          : String(metric.value ?? "—");

        return {
          ...metric,
          Icon,
          valueLabel,
        };
      }),
    [metrics],
  );

  const topInsights = useMemo(
    () => insights.slice(0, 3),
    [insights],
  );

  const lastSyncedLabel = useMemo(() => {
    if (!lastSyncedAt) {
      return "just now";
    }
    const lastSyncedDate = new Date(lastSyncedAt);
    const diff = deskClock.now.getTime() - lastSyncedDate.getTime();
    if (!Number.isFinite(diff) || diff < 0) {
      return "just now";
    }
    const minutes = Math.round(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) {
      return `${hours} hr${hours === 1 ? "" : "s"} ago`;
    }
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }, [deskClock.now, lastSyncedAt]);

  if (loading) {
    return (
      <div className="space-y-5 py-10">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="miniapp-hero px-5 py-6 text-left"
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-20 left-1/4 h-40 w-40 rounded-full bg-primary/35 blur-3xl"
          animate={{ opacity: [0.45, 0.7, 0.45], scale: [1, 1.1, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 right-1/5 h-56 w-56 rounded-full bg-dc-brand-light/30 blur-[110px]"
          animate={{ opacity: [0.2, 0.45, 0.25], rotate: [0, 8, -8, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="bg-primary/15 text-primary">
              <Sparkles className="mr-1 h-3 w-3" /> Live trading desk
            </Badge>
            <span className="flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-muted-foreground shadow-sm shadow-primary/10">
              <Clock className="h-3 w-3 text-primary" /> Desk time{" "}
              {deskClock.formatted}
            </span>
            <span className="flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-muted-foreground shadow-sm shadow-primary/10">
              <Megaphone className="h-3 w-3 text-primary" />
              {isInTelegram ? "Telegram" : "Web"} session
            </span>
            <span className="flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-muted-foreground shadow-sm shadow-primary/10">
              <RefreshCw className="h-3 w-3 text-primary" /> Synced{" "}
              {lastSyncedLabel}
            </span>
            {averageConfidence && (
              <span className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-primary">
                <ShieldCheck className="h-3 w-3" />
                {averageConfidence.label} · {averageConfidence.percentage}%
              </span>
            )}
            {activePromo && (
              <button
                type="button"
                onClick={handlePromoCopy}
                className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-medium text-primary transition hover:bg-primary/15"
              >
                <Gift className="h-3 w-3" /> Copy promo {activePromo.code}
              </button>
            )}
          </div>

          <div className="space-y-4">
            <h1 className="text-2xl font-semibold leading-tight text-foreground">
              Command your trading edge with Dynamic Capital
            </h1>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {about}
            </p>
            <motion.div
              className="flex flex-wrap items-center gap-3 pt-1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Button asChild size="sm" className="shadow-lg shadow-primary/20">
                <Link href="/miniapp/plans">Explore VIP plans</Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-primary/40 text-primary hover:bg-primary/10"
              >
                <Link href="/miniapp/dynamic-signals">View live signals</Link>
              </Button>
              <span className="text-[11px] text-muted-foreground/80">
                Telegram ID {telegramData.user?.id ?? "—"}
              </span>
            </motion.div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="miniapp-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Announcement
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">
                    {announcement}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="miniapp-panel p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Core services
              </p>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {serviceHighlights.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {heroHighlights.length > 0 && (
            <motion.div
              className="grid gap-3 sm:grid-cols-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              {heroHighlights.map((highlight) => {
                const HighlightIcon = highlight.Icon;
                const isPositive = typeof highlight.change === "number"
                  ? highlight.change >= 0
                  : true;

                return (
                  <motion.div
                    key={highlight.id}
                    className="miniapp-panel group relative overflow-hidden p-4"
                    whileHover={{ translateY: -4, scale: 1.01 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-primary/15 to-transparent opacity-0 group-hover:opacity-100"
                      initial={{ x: "-40%" }}
                      whileHover={{ x: "40%" }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                    />
                    <div className="relative z-10 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                          <HighlightIcon className="h-4 w-4" />
                        </span>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
                            {highlight.label}
                          </p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-semibold text-foreground">
                              {highlight.valueLabel}
                            </span>
                            {highlight.changeLabel && (
                              <Badge
                                variant="secondary"
                                className={`border-0 px-2 py-0 text-[11px] font-medium ${
                                  isPositive
                                    ? "bg-emerald-500/15 text-emerald-400"
                                    : "bg-rose-500/15 text-rose-400"
                                }`}
                              >
                                {highlight.changeLabel}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          variant="outline"
                          className="border-primary/20 text-[10px] uppercase tracking-wide text-primary"
                        >
                          Desk
                        </Badge>
                        <ConfidenceGauge value={highlight.confidence} />
                      </div>
                    </div>
                    {highlight.description && (
                      <p className="relative z-10 mt-3 text-xs text-muted-foreground">
                        {highlight.description}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {topInsights.length > 0 && (
            <motion.div
              className="miniapp-panel p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Brain className="h-4 w-4" />
                </span>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
                      Strategy intel
                    </p>
                    <Badge
                      variant="outline"
                      className="border-primary/30 text-[10px] uppercase tracking-wide text-primary"
                    >
                      AI curated
                    </Badge>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {topInsights.map((insight, index) => {
                      const InsightIcon = insight.emphasis
                        ? INSIGHT_ICON_MAP[insight.emphasis]
                        : Brain;
                      return (
                        <li
                          key={`${insight.provider}-${index}`}
                          className="rounded-2xl border border-primary/10 bg-background/60 p-3 shadow-sm shadow-primary/5"
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <InsightIcon className="h-3.5 w-3.5" />
                            </span>
                            <div className="space-y-1">
                              <p className="text-sm text-foreground">
                                {insight.message}
                              </p>
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">
                                {insight.provider}
                              </p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {activePromo && (
            <Card className="glass-motion-card border border-primary/25">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-primary">
                  <Gift className="h-4 w-4" /> Limited-time offer
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3 text-sm text-primary-foreground">
                <Badge className="bg-primary text-primary-foreground">
                  {formatPromoBadge(activePromo)}
                </Badge>
                <span className="text-primary-foreground/80">
                  Use code{" "}
                  <span className="font-semibold tracking-wide">
                    {activePromo.code}
                  </span>
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePromoCopy}
                  className="ml-auto"
                >
                  Copy code
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.section>

      <StatusSection telegramData={telegramData} />

      <MiniAppMetricsSliders
        metrics={metrics}
        insights={insights}
        deskTimeLabel={deskClock.formatted}
        lastSyncedLabel={lastSyncedLabel}
      />

      <QuickActions />

      <PlanSection />

      <Card className="glass-motion-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            What you get with VIP access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceStackCarousel services={services} />
        </CardContent>
      </Card>

      <FAQSection />

      <AskSection />
    </div>
  );
}
