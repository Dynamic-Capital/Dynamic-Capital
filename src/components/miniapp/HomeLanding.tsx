import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MotionCard, MotionCardContainer } from "@/components/ui/motion-card";
import { Interactive3DCard, FloatingActionCard, LiquidCard } from "@/components/ui/interactive-cards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Star, 
  TrendingUp, 
  Shield, 
  Clock, 
  Users, 
  Sparkles,
  MessageSquare,
  Award,
  Target,
  Gift
} from "lucide-react";
import { LivePlansSection } from "@/components/shared/LivePlansSection";
import { ServiceStackCarousel } from "@/components/shared/ServiceStackCarousel";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import { HorizontalSnapScroll } from "@/components/ui/horizontal-snap-scroll";
import PromoCodeInput from "@/components/billing/PromoCodeInput";
import AnimatedWelcomeMini from "./AnimatedWelcomeMini";
import { AnimatedStatusDisplay } from "./AnimatedStatusDisplay";
import { motion, AnimatePresence } from "framer-motion";
import { parentVariants, childVariants, slowParentVariants } from "@/lib/motion-variants";

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

interface HomeLandingProps {
  telegramData: any;
}

export default function HomeLanding({ telegramData }: HomeLandingProps) {
  const [aboutUs, setAboutUs] = useState<string>("Loading...");
  const [services, setServices] = useState<string>("Loading...");
  const [announcements, setAnnouncements] = useState<string>("Stay tuned for updates!");
  const [activePromos, setActivePromos] = useState<ActivePromo[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [subscription, setSubscription] = useState<any>(null);

  const isInTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        // Fetch about us and services from bot_content
        const contentResponse = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/content-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keys: ['about_us', 'our_services', 'announcements']
          })
        });
        
        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          if (contentData.ok && contentData.contents) {
            const contents = contentData.contents;
            
            const aboutContent = contents.find((c: BotContent) => c.content_key === 'about_us');
            const servicesContent = contents.find((c: BotContent) => c.content_key === 'our_services');
            const announcementsContent = contents.find((c: BotContent) => c.content_key === 'announcements');
            
            setAboutUs(aboutContent?.content_value || "Dynamic Capital is your premier destination for professional trading insights and VIP market analysis. We provide cutting-edge trading signals, comprehensive market research, and personalized support to help you achieve your financial goals.");
            setServices(servicesContent?.content_value || "📈 Real-time Trading Signals\n📊 Daily Market Analysis\n🛡️ Risk Management Guidance\n👨‍🏫 Personal Trading Mentor\n💎 Exclusive VIP Community\n📞 24/7 Customer Support");
            setAnnouncements(announcementsContent?.content_value || "🚀 New year, new trading opportunities! Join our VIP community and get access to premium signals.");
          }
        } else {
          console.warn('Content fetch failed:', contentResponse.status);
        }

        // Fetch active promotions
        const promoResponse = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/active-promos');
        if (promoResponse.ok) {
          const promoData = await promoResponse.json();
          if (promoData.ok && promoData.promotions) {
            setActivePromos(promoData.promotions);
          }
        } else {
          console.warn('Promo fetch failed:', promoResponse.status);
        }

        // Fetch subscription status if in Telegram
        if (isInTelegram && telegramData?.user?.id) {
          const subResponse = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/subscription-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegram_id: telegramData.user.id
            })
          });
          if (subResponse.ok) {
            const subData = await subResponse.json();
            setSubscription(subData);
          } else {
            console.warn('Subscription fetch failed:', subResponse.status);
          }
        }

      } catch (error) {
        console.error('Failed to fetch content:', error);
        // Fallback to default content if fetch fails
        setAboutUs("Dynamic Capital is your premier destination for professional trading insights and VIP market analysis. We provide cutting-edge trading signals, comprehensive market research, and personalized support to help you achieve your financial goals.");
        setServices("📈 Real-time Trading Signals\n📊 Daily Market Analysis\n🛡️ Risk Management Guidance\n👨‍🏫 Personal Trading Mentor\n💎 Exclusive VIP Community\n📞 24/7 Customer Support");
        setAnnouncements("🚀 New year, new trading opportunities! Join our VIP community and get access to premium signals.");
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [telegramData?.user?.id]);

  const formatDiscountText = (promo: ActivePromo) => {
    return promo.discount_type === 'percentage' 
      ? `${promo.discount_value}% OFF` 
      : `$${promo.discount_value} OFF`;
  };

  const handlePromoClick = (promoCode: string) => {
    // Navigate to plan tab with promo code
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'plan');
    url.searchParams.set('promo', promoCode);
    window.history.pushState({}, '', url.toString());
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const bgOpacity = Math.min(scrollY / 300, 0.8);

  return (
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
          hsl(var(--background) / ${bgOpacity})`
      }}
    >
      {/* Animated Hero Section */}
      <motion.div variants={childVariants}>
        <AnimatedWelcomeMini className="rounded-lg" />
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
        <MotionCard variant="glass" hover={true} animate={true} delay={0.1} className="border-primary/20">
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

      {/* Announcements */}
      <FadeInOnView delay={150} animation="slide-in-right">
        <MotionCard variant="glass" hover={true} animate={true} delay={0.2}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-subheading">
              <MessageSquare className="icon-sm text-info animate-pulse-glow" />
              Latest Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="prose">
            <FadeInOnView delay={200} animation="fade-in">
              <div className="ui-p-base status-info ui-rounded-lg">
                <p className="text-body-sm whitespace-pre-line leading-relaxed text-foreground">{announcements}</p>
              </div>
            </FadeInOnView>
          </CardContent>
        </MotionCard>
      </FadeInOnView>

      {/* Active Promo Codes */}
      <FadeInOnView delay={250} animation="bounce-in">
        <Interactive3DCard 
          intensity={0.1} 
          scale={1.02} 
          glowEffect={activePromos.length > 0}
          className="border-primary/20"
        >
          <div className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="icon-sm text-success animate-wiggle" />
              <h3 className="text-subheading font-semibold">
                {activePromos.length > 0 ? "Active Promo Codes" : "Limited Time Offers"}
              </h3>
            </div>
            <p className="text-body-sm text-muted-foreground mb-4">
              {activePromos.length > 0 
                ? "Limited time offers - use these codes when subscribing!" 
                : "Stay tuned for exclusive promo codes and special discounts!"
              }
            </p>
            {activePromos.length > 0 ? (
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
                      <p className="text-sm text-muted-foreground mb-2">{promo.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Valid until: {new Date(promo.valid_until).toLocaleDateString()}</span>
                        </div>
                        <div className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Tap to apply →
                        </div>
                      </div>
                    </div>
                  </Interactive3DCard>
                ))}
              </HorizontalSnapScroll>
            ) : (
              <div className="text-center py-8 space-y-3">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                  <Gift className="h-8 w-8 text-primary" />
                </div>
                <p className="text-muted-foreground text-sm">
                  No active promotions right now, but check back soon for amazing deals!
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('tab', 'plan');
                    window.history.pushState({}, '', url.toString());
                    window.dispatchEvent(new PopStateEvent('popstate'));
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
        <LiquidCard className="hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]" color="hsl(var(--primary))">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="icon-sm text-primary animate-pulse-glow" />
              <h3 className="text-subheading font-semibold">About Dynamic Capital</h3>
            </div>
            <p className="text-body-sm text-foreground whitespace-pre-line leading-relaxed">
              {aboutUs}
            </p>
          </div>
        </LiquidCard>
      </FadeInOnView>

      {/* Our Services - Stack Carousel */}
      <ServiceStackCarousel services={services} />

      {/* VIP Packages */}
      <div>
        <LivePlansSection 
          showPromo={!!isInTelegram} 
          telegramData={telegramData}
          onPlanSelect={(planId) => {
            // Switch to plan tab
            const url = new URL(window.location.href);
            url.searchParams.set('tab', 'plan');
            window.history.pushState({}, '', url.toString());
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
        />
      </div>

      {/* Call to Action */}
      <MotionCard variant="glow" hover={true} animate={true} delay={0.6} className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
        <CardContent className="p-4 text-center">
          <Sparkles className="h-6 w-6 text-primary mx-auto mb-2" />
          <h3 className="text-base font-semibold mb-1">Ready to Start Trading Like a Pro?</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Join thousands of successful traders who trust Dynamic Capital for their trading journey.
          </p>
          <div className="flex gap-2 justify-center">
            <Button 
              size="sm"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('tab', 'plan');
                window.history.pushState({}, '', url.toString());
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
            >
              View VIP Plans
            </Button>
            {isInTelegram && (
              <Button 
                size="sm"
                variant="outline" 
                onClick={() => {
                  window.open('https://t.me/Dynamic_VIP_BOT', '_blank');
                }}
              >
                Contact Support
              </Button>
            )}
          </div>
        </CardContent>
      </MotionCard>
    </motion.div>
  );
}