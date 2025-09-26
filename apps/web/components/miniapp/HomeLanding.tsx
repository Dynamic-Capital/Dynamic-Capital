"use client";

import {
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MotionCard } from "@/components/ui/motion-card";
import {
  Interactive3DCard,
  LiquidCard,
} from "@/components/ui/interactive-cards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Gift, Sparkles } from "lucide-react";
import { LivePlansSection } from "@/components/shared/LivePlansSection";
import { ServiceStackCarousel } from "@/components/shared/ServiceStackCarousel";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import { HorizontalSnapScroll } from "@/components/ui/horizontal-snap-scroll";
import PromoCodeInput from "@/components/billing/PromoCodeInput";
import AnimatedWelcomeMini from "./AnimatedWelcomeMini";
import { AnimatedStatusDisplay } from "./AnimatedStatusDisplay";
import {
  ThreeDEmoticon,
  TradingEmoticonSet,
} from "@/components/ui/three-d-emoticons";
import { AnimatePresence, motion } from "framer-motion";
import {
  childVariants,
  parentVariants,
  slowParentVariants,
} from "@/lib/motion-variants";
import { callEdgeFunction } from "@/config/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Toast } from "./Toast";
import { useDeskClock } from "@/hooks/useDeskClock";
import {
  DEFAULT_HOME_SECTION_ORDER,
  DEFAULT_MARKET_PULSE_METRICS,
  fetchDynamicHomeSync,
  type HomeSectionId,
  type MarketPulseMetric,
  type MultiLlmInsight,
} from "@/services/miniapp/homeContentSync";
import { MiniAppMetricsSliders } from "./MiniAppMetricsSliders";

interface BotContent {
  content_key: string;
  content_value: string;
}

interface ActivePromo {
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  valid_until: string;
}

interface TelegramData {
  user?: {
    id: number;
  };
}

interface SubscriptionStatus {
  is_vip?: boolean;
  plan_name?: string;
  days_remaining?: number;
  payment_status?: string;
}

interface HomeLandingProps {
  telegramData: TelegramData;
}

interface PromoValidationInfo {
  ok?: boolean;
  valid?: boolean;
  type?: "percentage" | "fixed";
  discount_type?: "percentage" | "fixed";
  value?: number;
  discount_value?: number;
  final_amount?: number;
  reason?: string;
}

const DEFAULT_ABOUT_US_TEXT =
  "Dynamic Capital is your premier destination for professional trading insights and VIP market analysis. We provide cutting-edge trading signals, comprehensive market research, and personalized support to help you achieve your financial goals.";

const DEFAULT_SERVICES_TEXT =
  "📈 Real-time Trading Signals\n📊 Daily Market Analysis\n🛡️ Risk Management Guidance\n👨‍🏫 Personal Trading Mentor\n💎 Exclusive VIP Community\n📞 24/7 Customer Support";

const DEFAULT_ANNOUNCEMENTS_TEXT =
  "🚀 New year, new trading opportunities! Join our VIP community and get access to premium signals.";

export default function HomeLanding({ telegramData }: HomeLandingProps) {
  const [aboutUs, setAboutUs] = useState<string>("Loading...");
  const [services, setServices] = useState<string>("Loading...");
  const [announcements, setAnnouncements] = useState<string>(
    "Stay tuned for updates!",
  );
  const [activePromos, setActivePromos] = useState<ActivePromo[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(
    null,
  );
  const subscriptionRef = useRef<SubscriptionStatus | null>(null);
  const [promoStatus, setPromoStatus] = useState<
    { code: string; copied: boolean | null; discountText?: string } | null
  >(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<HomeSectionId[]>(
    DEFAULT_HOME_SECTION_ORDER,
  );
  const [sectionReasons, setSectionReasons] = useState<
    Partial<Record<HomeSectionId, string>>
  >({});
  const [marketPulseMetrics, setMarketPulseMetrics] = useState<
    MarketPulseMetric[]
  >(DEFAULT_MARKET_PULSE_METRICS);
  const [llmInsights, setLlmInsights] = useState<MultiLlmInsight[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const isInTelegram = typeof window !== "undefined" && window.Telegram?.WebApp;
  const deskClock = useDeskClock();

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchContent = async () => {
      setLoading(true);

      let resolvedAbout = DEFAULT_ABOUT_US_TEXT;
      let resolvedServices = DEFAULT_SERVICES_TEXT;
      let resolvedAnnouncements = DEFAULT_ANNOUNCEMENTS_TEXT;
      let resolvedSubscription: SubscriptionStatus | null =
        subscriptionRef.current;

      try {
        const { data: contentData, status: contentStatus } =
          await callEdgeFunction("CONTENT_BATCH", {
            method: "POST",
            body: {
              keys: ["about_us", "our_services", "announcements"],
            },
          });

        if (
          contentStatus === 200 && (contentData as any)?.ok &&
          (contentData as any).contents
        ) {
          const contents = (contentData as any).contents;

          const aboutContent = contents.find((c: BotContent) =>
            c.content_key === "about_us"
          );
          const servicesContent = contents.find((c: BotContent) =>
            c.content_key === "our_services"
          );
          const announcementsContent = contents.find((c: BotContent) =>
            c.content_key === "announcements"
          );

          resolvedAbout = aboutContent?.content_value || DEFAULT_ABOUT_US_TEXT;
          resolvedServices = servicesContent?.content_value ||
            DEFAULT_SERVICES_TEXT;
          resolvedAnnouncements = announcementsContent?.content_value ||
            DEFAULT_ANNOUNCEMENTS_TEXT;
        }

        if (isMounted) {
          setAboutUs(resolvedAbout);
          setServices(resolvedServices);
          setAnnouncements(resolvedAnnouncements);
        }

        try {
          const { callEdgeFunction: callEdgeFn } = await import(
            "@/config/supabase"
          );
          const { data: promoData, status: promoStatus } = await callEdgeFn(
            "ACTIVE_PROMOS",
          );
          if (
            isMounted &&
            promoStatus === 200 && (promoData as any)?.ok &&
            (promoData as any).promotions
          ) {
            setActivePromos((promoData as any).promotions);
          }
        } catch (promoError) {
          console.warn("Promo fetch failed - using defaults", promoError);
        }

        if (isInTelegram && telegramData?.user?.id) {
          const { data: subData, status: subStatus } = await callEdgeFunction(
            "SUBSCRIPTION_STATUS",
            {
              method: "POST",
              body: {
                telegram_id: telegramData.user.id,
              },
            },
          );
          if (subStatus === 200 && subData) {
            resolvedSubscription = subData as SubscriptionStatus;
            if (isMounted) {
              subscriptionRef.current = resolvedSubscription;
              setSubscription(resolvedSubscription);
            }
          } else {
            console.warn("Subscription fetch failed:", subStatus);
          }
        }
      } catch (error) {
        console.error("Failed to fetch content:", error);
        if (isMounted) {
          setAboutUs(DEFAULT_ABOUT_US_TEXT);
          setServices(DEFAULT_SERVICES_TEXT);
          setAnnouncements(DEFAULT_ANNOUNCEMENTS_TEXT);
        }
      }

      try {
        const syncResult = await fetchDynamicHomeSync({
          baseContent: {
            aboutUs: resolvedAbout,
            services: resolvedServices,
            announcements: resolvedAnnouncements,
          },
          subscription: resolvedSubscription,
        });

        if (!isMounted) return;

        if (syncResult.overrides?.aboutUs) {
          resolvedAbout = syncResult.overrides.aboutUs;
          setAboutUs(resolvedAbout);
        }
        if (syncResult.overrides?.services) {
          resolvedServices = syncResult.overrides.services;
          setServices(resolvedServices);
        }
        if (syncResult.overrides?.announcements) {
          resolvedAnnouncements = syncResult.overrides.announcements;
          setAnnouncements(resolvedAnnouncements);
        }

        setSectionOrder(syncResult.order);
        const reasons: Partial<Record<HomeSectionId, string>> = {};
        syncResult.sections.forEach((section) => {
          reasons[section.id] = section.reason ?? "";
        });
        setSectionReasons(reasons);
        setMarketPulseMetrics(
          syncResult.metrics.length > 0
            ? syncResult.metrics
            : DEFAULT_MARKET_PULSE_METRICS,
        );
        setLlmInsights(syncResult.insights);
        setLastSyncedAt(syncResult.updatedAt);
      } catch (syncError) {
        console.error("Failed to run dynamic home sync:", syncError);
        if (isMounted) {
          setSectionOrder(DEFAULT_HOME_SECTION_ORDER);
          setMarketPulseMetrics(DEFAULT_MARKET_PULSE_METRICS);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchContent();

    return () => {
      isMounted = false;
    };
  }, [isInTelegram, telegramData?.user?.id]);

  const formatDiscountText = useCallback(
    (promo: Partial<PromoValidationInfo> | ActivePromo) => {
      const discountType = promo.discount_type ||
        (promo as PromoValidationInfo).type;
      const rawDiscountValue = typeof promo.discount_value === "number"
        ? promo.discount_value
        : typeof (promo as PromoValidationInfo).value === "number"
        ? (promo as PromoValidationInfo).value
        : undefined;

      if (!discountType || typeof rawDiscountValue !== "number") {
        return null;
      }

      const normalizedType =
        discountType === "percentage" || discountType === "fixed"
          ? discountType
          : undefined;

      if (!normalizedType) {
        return null;
      }

      return normalizedType === "percentage"
        ? `${rawDiscountValue}% OFF`
        : `$${rawDiscountValue} OFF`;
    },
    [],
  );

  const handlePromoApply = useCallback(
    async (promoCode: string, validation?: PromoValidationInfo) => {
      if (typeof window === "undefined") return;

      const discountText = formatDiscountText(validation ?? {});
      setPromoStatus({
        code: promoCode,
        copied: null,
        discountText: discountText || undefined,
      });

      let copyResult: boolean | null = null;

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(promoCode);
          copyResult = true;
        } catch (error) {
          console.warn("Failed to copy promo code", error);
          copyResult = false;
        }
      }

      setPromoStatus({
        code: promoCode,
        copied: copyResult,
        discountText: discountText || undefined,
      });

      const url = new URL(window.location.href);
      url.searchParams.set("tab", "plan");
      url.searchParams.set("promo", promoCode);
      window.history.pushState({}, "", url.toString());
      window.dispatchEvent(new PopStateEvent("popstate"));

      let message = `Promo code ${promoCode} applied`;
      if (discountText) {
        message += ` — enjoy ${discountText.toLowerCase()}`;
      }
      if (copyResult) {
        message += ". Copied to your clipboard!";
      } else if (copyResult === false) {
        message += ". Copy it manually if you need it later.";
      } else {
        message += ".";
      }

      setToastMessage(message);
      setShowToast(false);
      window.setTimeout(() => setShowToast(true), 10);
    },
    [formatDiscountText],
  );

  const handleToastDismiss = useCallback(() => {
    setShowToast(false);
    setToastMessage(null);
  }, []);

  const bgOpacity = Math.min(scrollY / 300, 0.8);

  const renderSectionReason = (
    sectionId: HomeSectionId,
    className = "text-[11px] text-muted-foreground/80 mt-2",
  ) => {
    const reason = sectionReasons[sectionId];
    if (!reason) return null;
    return <p className={className}>Focus: {reason}</p>;
  };

  const sectionRenderers: Record<HomeSectionId, () => ReactNode> = {
    hero: () => (
      <motion.div variants={childVariants}>
        <div className="space-y-3">
          <AnimatedWelcomeMini className="ui-rounded-lg ui-shadow" />
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background/60 px-3 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" />
              Auto-sync {lastSyncedLabel}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Desk time {deskClock.formatted}
            </span>
          </div>
        </div>
      </motion.div>
    ),
    status: () =>
      isInTelegram
        ? (
          <motion.div variants={childVariants}>
            <div className="space-y-2">
              <AnimatedStatusDisplay
                isVip={subscription?.is_vip}
                planName={subscription?.plan_name || "Free"}
                daysRemaining={subscription?.days_remaining}
                paymentStatus={subscription?.payment_status}
                showBackground={false}
              />
              {renderSectionReason("status")}
            </div>
          </motion.div>
        )
        : null,
    promo: () => (
      <div className="space-y-4">
        <FadeInOnView delay={100} animation="slide-in-right">
          <MotionCard
            variant="glass"
            hover={true}
            animate={true}
            delay={0.1}
            className="border-primary/20"
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-subheading">
                <Gift className="icon-sm text-primary animate-pulse-glow" />
                Have a Promo Code?
              </CardTitle>
              <CardDescription className="text-body-sm">
                Enter your promo code below to unlock exclusive discounts!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <PromoCodeInput
                planId="6e07f718-606e-489d-9626-2a5fa3e84eec"
                onApplied={(code, validation) =>
                  handlePromoApply(code, validation)}
              />
              {renderSectionReason("promo")}
            </CardContent>
          </MotionCard>
        </FadeInOnView>

        <FadeInOnView delay={250} animation="bounce-in">
          <Interactive3DCard
            intensity={0.1}
            scale={1.02}
            glowEffect={activePromos.length > 0}
            className="border-primary/20"
          >
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <ThreeDEmoticon
                  emoji="✨"
                  size={24}
                  intensity={0.4}
                  animate={true}
                />
                <h3 className="text-subheading font-semibold">
                  Limited Offers
                </h3>
                <TradingEmoticonSet variant="success" className="ml-auto" />
              </div>
              <p className="text-body-sm text-muted-foreground mb-4">
                {activePromos.length > 0
                  ? "Use these promo codes when subscribing!"
                  : "Stay tuned for exclusive promo codes and special discounts!"}
              </p>
              {activePromos.length > 0
                ? (
                  <HorizontalSnapScroll
                    autoScroll={true}
                    autoScrollInterval={4000}
                    pauseOnHover={true}
                    itemWidth="clamp(240px, 80vw, 280px)"
                    gap="clamp(0.5rem, 2vw, 0.75rem)"
                    showArrows={activePromos.length > 1}
                    className="py-3 scroll-padding-mobile"
                  >
                    {activePromos.map((promo, index) => {
                      const isActive = promoStatus?.code === promo.code;
                      const discountLabel = formatDiscountText(promo) ??
                        "Limited time";
                      const copyStatus = isActive ? promoStatus?.copied : null;
                      const statusMessage = copyStatus === true
                        ? "Copied to clipboard — ready to redeem."
                        : copyStatus === false
                        ? "Promo ready! Copy manually if you need it later."
                        : "Promo ready for checkout.";

                      return (
                        <Interactive3DCard
                          key={index}
                          intensity={0.05}
                          scale={1.02}
                          onClick={() => handlePromoApply(promo.code)}
                          className={`cursor-pointer group min-w-0 ${
                            isActive
                              ? "ring-2 ring-primary/60 shadow-lg shadow-primary/20"
                              : ""
                          }`}
                        >
                          <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                              <Badge className="bg-green-500 text-white font-mono text-sm group-hover:scale-105 transition-transform">
                                {promo.code}
                              </Badge>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="text-green-600 group-hover:scale-105 transition-transform"
                                >
                                  {discountLabel}
                                </Badge>
                                {isActive && (
                                  <Badge className="bg-primary/20 text-primary border-primary/30">
                                    Applied
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {promo.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>
                                  Valid until: {new Date(promo.valid_until)
                                    .toLocaleDateString()}
                                </span>
                              </div>
                              <div className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                Tap to apply →
                              </div>
                            </div>
                            <AnimatePresence>
                              {isActive && (
                                <motion.div
                                  className="mt-3 flex items-center gap-2 text-xs text-primary font-medium"
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 6 }}
                                >
                                  <Sparkles className="h-3 w-3" />
                                  <span>{statusMessage}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </Interactive3DCard>
                      );
                    })}
                  </HorizontalSnapScroll>
                )
                : (
                  <div className="text-center py-8 space-y-3">
                    <ThreeDEmoticon emoji="🛎️" size={24} intensity={0.3} />
                    <p className="text-body-sm text-muted-foreground">
                      Promotions are refreshed in real-time by our marketing
                      desk.
                    </p>
                  </div>
                )}
            </div>
          </Interactive3DCard>
        </FadeInOnView>
      </div>
    ),
    announcements: () => (
      <FadeInOnView delay={150} animation="slide-in-right">
        <MotionCard
          variant="glass"
          hover={true}
          animate={true}
          delay={0.2}
          className="ui-rounded-lg ui-shadow"
        >
          <div className="p-4 border-l-4 border-gradient-to-b from-primary to-accent">
            <div className="flex items-center gap-2 mb-2">
              <ThreeDEmoticon emoji="📢" size={20} intensity={0.3} />
              <h3 className="text-subheading font-semibold">
                Latest Announcements
              </h3>
              <TradingEmoticonSet variant="celebration" className="ml-auto" />
            </div>
            <FadeInOnView delay={200} animation="fade-in">
              <p className="text-body-sm whitespace-pre-line leading-relaxed text-foreground">
                {announcements}
              </p>
            </FadeInOnView>
            {renderSectionReason(
              "announcements",
              "text-[11px] text-muted-foreground mt-3",
            )}
          </div>
        </MotionCard>
      </FadeInOnView>
    ),
    "market-pulse": () => (
      <FadeInOnView delay={220} animation="fade-in-up">
        <MiniAppMetricsSliders
          metrics={marketPulseMetrics}
          insights={llmInsights}
          deskTimeLabel={deskClock.formatted}
          lastSyncedLabel={lastSyncedLabel}
          sectionReason={sectionReasons["market-pulse"]}
        />
      </FadeInOnView>
    ),
    about: () => (
      <FadeInOnView delay={300} animation="fade-in-up">
        <motion.div variants={parentVariants}>
          <LiquidCard>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <ThreeDEmoticon
                  emoji="🏆"
                  size={24}
                  intensity={0.4}
                  animate={true}
                />
                <h3 className="text-heading font-semibold">
                  About Dynamic Capital
                </h3>
                <TradingEmoticonSet variant="vip" className="ml-auto" />
              </div>
              <p className="text-subheading text-foreground/90 whitespace-pre-line leading-relaxed">
                {aboutUs}
              </p>
              {renderSectionReason("about")}
            </div>
          </LiquidCard>
        </motion.div>
      </FadeInOnView>
    ),
    services: () => (
      <FadeInOnView delay={320} animation="fade-in-up">
        <div className="space-y-2">
          {renderSectionReason(
            "services",
            "text-xs text-muted-foreground text-center",
          )}
          <ServiceStackCarousel services={services} />
        </div>
      </FadeInOnView>
    ),
    plans: () => (
      <FadeInOnView delay={350} animation="fade-in-up">
        <div className="space-y-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ThreeDEmoticon
                emoji="💎"
                size={24}
                intensity={0.4}
                animate={true}
              />
              <h3 className="text-heading font-semibold">
                VIP Subscription Plans
              </h3>
              <TradingEmoticonSet variant="vip" className="ml-auto" />
            </div>
            <p className="text-body-sm text-muted-foreground">
              Unlock premium trading insights and exclusive benefits
            </p>
            {renderSectionReason("plans", "text-xs text-muted-foreground mt-2")}
          </div>

          <LivePlansSection
            showPromo={!!isInTelegram}
            telegramData={telegramData}
            showHeader={false}
            onPlanSelect={() => {
              const url = new URL(window.location.href);
              url.searchParams.set("tab", "plan");
              window.history.pushState({}, "", url.toString());
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
          />
        </div>
      </FadeInOnView>
    ),
    cta: () => (
      <MotionCard
        variant="glow"
        hover={true}
        animate={true}
        delay={0.6}
        className="bg-gradient-to-r from-primary/10 to-dc-brand-light/10 border-primary/20 ui-rounded-lg ui-shadow"
      >
        <CardContent className="p-6 text-center space-y-4">
          <div className="flex justify-center items-center gap-2">
            <ThreeDEmoticon
              emoji="🚀"
              size={24}
              intensity={0.4}
              animate={true}
            />
            <Sparkles className="h-6 w-6 text-primary" />
            <TradingEmoticonSet variant="success" />
          </div>
          <h3 className="text-heading font-semibold">
            Ready to Start Trading Like a Pro?
          </h3>
          <p className="text-body-sm text-muted-foreground">
            Join thousands of successful traders who trust Dynamic Capital for
            their trading journey.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              className="min-h-[44px] font-semibold"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set("tab", "plan");
                window.history.pushState({}, "", url.toString());
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
            >
              View Plans
            </Button>
            <button
              className="text-subheading underline text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set("tab", "help");
                window.history.pushState({}, "", url.toString());
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
            >
              How it works
            </button>
          </div>
          {renderSectionReason("cta", "text-xs text-muted-foreground mt-4")}
        </CardContent>
      </MotionCard>
    ),
  };

  if (loading) {
    return (
      <div className="py-20 space-y-4">
        <Skeleton className="h-8 w-1/2 mx-auto" />
        <Skeleton className="h-4 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-2/3 mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative z-10">
      <motion.div
        className="space-y-4 scroll-bg-transition"
        variants={slowParentVariants}
        initial="hidden"
        animate="visible"
        style={{
          background: `linear-gradient(135deg,
            hsl(var(--telegram) / ${0.9 - bgOpacity * 0.3}),
            hsl(var(--primary) / ${0.8 - bgOpacity * 0.2}),
            hsl(var(--accent) / ${0.7 - bgOpacity * 0.2})),
            hsl(var(--background) / ${bgOpacity})`,
        }}
      >
        {sectionOrder.map((sectionId) => {
          const render = sectionRenderers[sectionId];
          if (!render) return null;
          const content = render();
          if (!content) return null;
          return <Fragment key={sectionId}>{content}</Fragment>;
        })}
      </motion.div>

      <Toast
        text={toastMessage ?? ""}
        show={Boolean(toastMessage) && showToast}
        onDismiss={handleToastDismiss}
      />
    </div>
  );
}
