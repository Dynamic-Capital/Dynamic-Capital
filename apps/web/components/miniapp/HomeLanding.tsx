"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Clock,
  Gift,
  Megaphone,
  RefreshCw,
  Send,
  Sparkles,
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
  const router = useRouter();
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

  const primaryInsight = useMemo(() => {
    if (insights.length === 0) return null;
    return (
      insights.find((insight) => insight.emphasis === "popularity") ??
        insights[0]
    );
  }, [insights]);

  const handleExplorePlans = useCallback(() => {
    router.push("/miniapp/fund");
  }, [router]);

  const handleTalkToDesk = useCallback(() => {
    if (typeof window === "undefined") return;
    window.open("https://t.me/DynamicCapital_Support", "_blank", "noopener");
  }, []);

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

  const heroHighlights = useMemo(
    () => [
      {
        id: "session",
        label: "Session",
        value: isInTelegram ? "Telegram" : "Web",
        Icon: Send,
      },
      {
        id: "desk-time",
        label: "Desk time",
        value: deskClock.formatted,
        Icon: Clock,
      },
      {
        id: "sync",
        label: "Last sync",
        value: lastSyncedLabel,
        Icon: RefreshCw,
      },
    ],
    [deskClock.formatted, isInTelegram, lastSyncedLabel],
  );

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
        className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-primary/20 via-background/95 to-background px-5 py-6 text-left shadow-[0_26px_70px_rgba(15,23,42,0.55)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.28),_transparent_55%)]" />
        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="bg-primary/15 text-primary">
              <Sparkles className="mr-1 h-3 w-3" /> Live trading desk
            </Badge>
            <Badge
              variant="outline"
              className="border-border/40 bg-background/40"
            >
              <Megaphone className="mr-1 h-3 w-3" />{" "}
              {announcement.split(" ")[0] ?? "Announcement"}
            </Badge>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> Desk time {deskClock.formatted}
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="text-2xl font-semibold leading-tight text-foreground md:text-3xl">
              Command your trading edge with Dynamic Capital
            </h1>
            <p className="text-sm text-muted-foreground whitespace-pre-line md:text-base">
              {about}
            </p>
            <div className="flex flex-wrap gap-2">
              {serviceHighlights.map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="bg-background/80 text-foreground/90"
                >
                  {item}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {heroHighlights.map(({ id, label, value, Icon }) => (
              <div
                key={id}
                className="rounded-2xl border border-border/40 bg-background/80 p-4 backdrop-blur"
              >
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 text-primary" /> {label}
                </div>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {value ?? "just now"}
                </p>
              </div>
            ))}
          </div>

          {primaryInsight && (
            <Card className="border-primary/20 bg-background/70">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-primary">
                  <BarChart3 className="h-4 w-4" /> Trending market insight
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {primaryInsight.message}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              onClick={handleExplorePlans}
              className="touch-target"
            >
              Explore plans
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTalkToDesk}
              className="touch-target"
            >
              Talk to our desk
            </Button>
            <span className="text-xs text-muted-foreground">
              {lastSyncedLabel && `Synced ${lastSyncedLabel}`}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/40 bg-background/80 p-4 backdrop-blur">
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

            <div className="rounded-2xl border border-border/40 bg-background/80 p-4 backdrop-blur">
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

          {activePromo && (
            <Card className="border-primary/25 bg-primary/10">
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

      <Card className="border-border/40 bg-background/70">
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
