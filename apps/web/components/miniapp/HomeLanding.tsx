"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Gift, Megaphone, Sparkles } from "lucide-react";

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
import { MiniAppSection } from "./MiniAppSection";
import { MiniAppGrid } from "./MiniAppGrid";

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

const SECTION_LINKS = [
  { id: "status", label: "Desk status" },
  { id: "actions", label: "Actions & plans" },
  { id: "support", label: "Support" },
] as const;

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

function LiveSyncBadge({ label }: { label: string }) {
  return (
    <Badge
      variant="secondary"
      className="inline-flex items-center gap-2 border-emerald-400/30 bg-emerald-400/10 text-[0.7rem] font-semibold text-emerald-200 shadow-sm"
    >
      <span
        className="h-2 w-2 animate-pulse rounded-full bg-emerald-300"
        aria-hidden
      />
      Live sync · {label}
    </Badge>
  );
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
      <div className="space-y-6 py-12">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-36 lg:space-y-16">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="miniapp-hero px-6 py-7 text-left"
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary"
            >
              <Sparkles className="mr-1 h-3 w-3" aria-hidden />
              Live trading desk
            </Badge>
            <span className="flex items-center gap-2 font-semibold text-muted-foreground/90">
              <Clock className="h-3 w-3" aria-hidden /> Desk{" "}
              {deskClock.formatted}
            </span>
            <span className="flex items-center gap-2 font-semibold text-muted-foreground/90">
              <Megaphone className="h-3 w-3" aria-hidden />{" "}
              {isInTelegram ? "Telegram" : "Web"} session
            </span>
            <LiveSyncBadge label={lastSyncedLabel} />
          </div>

          <div className="space-y-4">
            <h1 className="text-balance font-heading text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
              Command your trading edge with Dynamic Capital
            </h1>
            <p className="whitespace-pre-line text-base leading-relaxed text-muted-foreground/90">
              {about}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="miniapp-panel space-y-4 p-6">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary/80">
                Announcement
              </p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {announcement}
              </p>
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary/90">
                View updates <ArrowRight className="h-3 w-3" aria-hidden />
              </span>
            </div>

            <div className="miniapp-panel space-y-4 p-6">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary/80">
                Core services
              </p>
              <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                {serviceHighlights.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/70" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {activePromo && (
            <Card className="glass-motion-card border border-primary/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Gift className="h-4 w-4" aria-hidden /> Limited-time offer
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm leading-relaxed text-primary-foreground sm:flex-row sm:items-center">
                <Badge className="w-fit bg-primary/90 px-3 py-1 text-primary-foreground shadow">
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
                  className="w-full sm:ml-auto sm:w-auto"
                >
                  Copy code
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.section>

      <nav className="miniapp-summary-nav" aria-label="Mini app overview">
        {SECTION_LINKS.map(({ id, label }) => (
          <a key={id} className="miniapp-summary-nav__link" href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>

      <MiniAppGrid
        id="status"
        title="Desk status"
        description="Monitor live trading guidance, signals, and the metrics powering today's calls."
      >
        <MiniAppSection tone="raised">
          <StatusSection telegramData={telegramData} />
        </MiniAppSection>
        <MiniAppSection tone="muted">
          <MiniAppMetricsSliders
            metrics={metrics}
            insights={insights}
            deskTimeLabel={deskClock.formatted}
            lastSyncedLabel={lastSyncedLabel}
            loading={loading}
          />
        </MiniAppSection>
      </MiniAppGrid>

      <MiniAppGrid
        id="actions"
        title="Actions & membership"
        description="Jump straight into the workflows you use most or review upgrade paths tailored to your desk."
      >
        <MiniAppSection tone="raised">
          <QuickActions />
        </MiniAppSection>
        <MiniAppSection tone="muted" contentClassName="gap-6">
          <PlanSection />
        </MiniAppSection>
        <MiniAppSection tone="plain" className="md:col-span-2">
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                What you get with VIP access
              </h3>
              <p className="text-sm text-muted-foreground">
                Explore the benefits included with every VIP membership tier.
              </p>
            </div>
            <ServiceStackCarousel services={services} />
          </div>
        </MiniAppSection>
      </MiniAppGrid>

      <MiniAppGrid
        id="support"
        title="Support & knowledge base"
        description="Find quick answers or tap the desk for personalised guidance."
        contentClassName="md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
      >
        <MiniAppSection tone="muted">
          <FAQSection />
        </MiniAppSection>
        <MiniAppSection tone="plain">
          <AskSection />
        </MiniAppSection>
      </MiniAppGrid>
    </div>
  );
}
