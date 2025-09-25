import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MotionCard, MotionCardContainer } from "@/components/ui/motion-card";
import {
  FloatingActionCard,
  Interactive3DCard,
  LiquidCard,
} from "@/components/ui/interactive-cards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Award,
  Clock,
  Gift,
  MessageSquare,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
} from "@/lib/lucide";
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

  const isInTelegram = typeof window !== "undefined" && window.Telegram?.WebApp;

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        // Fetch about us and services from bot_content
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

          setAboutUs(
            aboutContent?.content_value ||
              "Dynamic Capital is your premier destination for professional trading insights and VIP market analysis. We provide cutting-edge trading signals, comprehensive market research, and personalized support to help you achieve your financial goals.",
          );
          setServices(
            servicesContent?.content_value ||
              "📈 Real-time Trading Signals\n📊 Daily Market Analysis\n🛡️ Risk Management Guidance\n👨‍🏫 Personal Trading Mentor\n💎 Exclusive VIP Community\n📞 24/7 Customer Support",
          );
          setAnnouncements(
            announcementsContent?.content_value ||
              "🚀 New year, new trading opportunities! Join our VIP community and get access to premium signals.",
          );
        }

        // Fetch active promotions - Only if backend is available
        try {
          const { callEdgeFunction } = await import("@/config/supabase");
          const { data: promoData, status: promoStatus } =
            await callEdgeFunction("ACTIVE_PROMOS");
          if (
            promoStatus === 200 && (promoData as any)?.ok &&
            (promoData as any).promotions
          ) {
            setActivePromos((promoData as any).promotions);
          }
        } catch (promoError) {
          console.warn("Promo fetch failed - using defaults");
        }

        // Fetch subscription status if in Telegram
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
            setSubscription(subData as SubscriptionStatus);
          } else {
            console.warn("Subscription fetch failed:", subStatus);
          }
        }
      } catch (error) {
        console.error("Failed to fetch content:", error);
        // Fallback to default content if fetch fails
        setAboutUs(
          "Dynamic Capital is your premier destination for professional trading insights and VIP market analysis. We provide cutting-edge trading signals, comprehensive market research, and personalized support to help you achieve your financial goals.",
        );
        setServices(
          "📈 Real-time Trading Signals\n📊 Daily Market Analysis\n🛡️ Risk Management Guidance\n👨‍🏫 Personal Trading Mentor\n💎 Exclusive VIP Community\n📞 24/7 Customer Support",
        );
        setAnnouncements(
          "🚀 New year, new trading opportunities! Join our VIP community and get access to premium signals.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [telegramData?.user?.id, isInTelegram]);

  const formatDiscountText = (promo: ActivePromo) => {
    return promo.discount_type === "percentage"
      ? `${promo.discount_value}% OFF`
      : `$${promo.discount_value} OFF`;
  };

  const handlePromoClick = (promoCode: string) => {
    // Navigate to plan tab with promo code
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "plan");
    url.searchParams.set("promo", promoCode);
    window.history.pushState({}, "", url.toString());
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const bgOpacity = Math.min(scrollY / 300, 0.8);

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
        {/* Animated Hero Section */}
        <motion.div variants={childVariants}>
          <AnimatedWelcomeMini className="ui-rounded-lg ui-shadow" />
        </motion.div>

        {/* Animated Status Display */}
        {isInTelegram && (
          <motion.div variants={childVariants}>
            <AnimatedStatusDisplay
              isVip={subscription?.is_vip}
              planName={subscription?.plan_name || "Free"}
              daysRemaining={subscription?.days_remaining}
              paymentStatus={subscription?.payment_status}
              showBackground={false}
            />
          </motion.div>
        )}

        {/* Have a Promo Code Section */}
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
            <CardContent>
              <PromoCodeInput
                planId="6e07f718-606e-489d-9626-2a5fa3e84eec"
                onApplied={(code) => handlePromoClick(code)}
              />
            </CardContent>
          </MotionCard>
        </FadeInOnView>

        {/* Announcements with 3D Emoticons */}
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
            </div>
          </MotionCard>
        </FadeInOnView>

        {/* Limited Offers / Active Promos */}
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
                    {activePromos.map((promo, index) => (
                      <Interactive3DCard
                        key={index}
                        intensity={0.05}
                        scale={1.02}
                        onClick={() => handlePromoClick(promo.code)}
                        className="cursor-pointer group min-w-0"
                      >
                        <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <Badge className="bg-green-500 text-white font-mono text-sm group-hover:scale-105 transition-transform">
                              {promo.code}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-green-600 group-hover:scale-105 transition-transform"
                            >
                              {formatDiscountText(promo)}
                            </Badge>
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
                        </div>
                      </Interactive3DCard>
                    ))}
                  </HorizontalSnapScroll>
                )
                : (
                  <div className="text-center py-8 space-y-3">
                    <motion.div
                      className="w-16 h-16 mx-auto bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center"
                      whileHover={{ scale: 1.1, rotate: 10 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                      }}
                    >
                      <ThreeDEmoticon emoji="🎁" size={32} intensity={0.5} />
                    </motion.div>
                    <p className="text-muted-foreground text-sm">
                      No active promotions right now, but check back soon for
                      amazing deals!
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set("tab", "plan");
                        window.history.pushState({}, "", url.toString());
                        window.dispatchEvent(new PopStateEvent("popstate"));
                      }}
                    >
                      View Plans
                    </Button>
                  </div>
                )}
            </div>
          </Interactive3DCard>
        </FadeInOnView>

        {/* About Dynamic Capital */}
        <FadeInOnView delay={300} animation="bounce-in">
          <motion.div whileHover={{ scale: 1.02 }}>
            <LiquidCard
              className="hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] ui-rounded-lg ui-shadow ui-border-glass"
              color="hsl(var(--primary))"
            >
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
              </div>
            </LiquidCard>
          </motion.div>
        </FadeInOnView>

        {/* Our Services - Stack Carousel */}
        <FadeInOnView delay={320} animation="fade-in-up">
          <ServiceStackCarousel services={services} />
        </FadeInOnView>

        {/* VIP Packages - Enhanced */}
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
            </div>

            <LivePlansSection
              showPromo={!!isInTelegram}
              telegramData={telegramData}
              showHeader={false}
              onPlanSelect={(planId) => {
                // Switch to plan tab
                const url = new URL(window.location.href);
                url.searchParams.set("tab", "plan");
                window.history.pushState({}, "", url.toString());
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
            />
          </div>
        </FadeInOnView>

        {/* Call to Action */}
        <MotionCard
          variant="glow"
          hover={true}
          animate={true}
          delay={0.6}
          className="bg-gradient-to-r from-primary/10 to-dc-brand-light/10 border-primary/20 ui-rounded-lg ui-shadow"
        >
          <CardContent className="p-6 text-center">
            <div className="flex justify-center items-center gap-2 mb-3">
              <ThreeDEmoticon
                emoji="🚀"
                size={24}
                intensity={0.4}
                animate={true}
              />
              <Sparkles className="h-6 w-6 text-primary" />
              <TradingEmoticonSet variant="success" />
            </div>
            <h3 className="text-heading font-semibold mb-2">
              Ready to Start Trading Like a Pro?
            </h3>
            <p className="text-body-sm text-muted-foreground mb-4">
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
          </CardContent>
        </MotionCard>
      </motion.div>
    </div>
  );
}
