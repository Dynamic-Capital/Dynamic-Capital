import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import { HorizontalSnapScroll } from "@/components/ui/horizontal-snap-scroll";

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
          const contents = contentData.contents || [];
          
          const aboutContent = contents.find((c: BotContent) => c.content_key === 'about_us');
          const servicesContent = contents.find((c: BotContent) => c.content_key === 'our_services');
          const announcementsContent = contents.find((c: BotContent) => c.content_key === 'announcements');
          
          setAboutUs(aboutContent?.content_value || "Dynamic Capital is your premier destination for professional trading insights and VIP market analysis. We provide cutting-edge trading signals, comprehensive market research, and personalized support to help you achieve your financial goals.");
          setServices(servicesContent?.content_value || "📈 Real-time Trading Signals\n📊 Daily Market Analysis\n🛡️ Risk Management Guidance\n👨‍🏫 Personal Trading Mentor\n💎 Exclusive VIP Community\n📞 24/7 Customer Support");
          setAnnouncements(announcementsContent?.content_value || "🚀 New year, new trading opportunities! Join our VIP community and get access to premium signals.");
        }

        // Fetch active promotions
        const promoResponse = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/active-promos');
        if (promoResponse.ok) {
          const promoData = await promoResponse.json();
          setActivePromos(promoData.promotions || []);
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
  }, []);

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
    <div 
      className="space-y-4 scroll-bg-transition"
      style={{
        background: `linear-gradient(135deg, 
          hsl(var(--telegram) / ${0.9 - bgOpacity * 0.3}), 
          hsl(var(--primary) / ${0.8 - bgOpacity * 0.2}), 
          hsl(var(--accent) / ${0.7 - bgOpacity * 0.2})), 
          hsl(var(--background) / ${bgOpacity})`
      }}
    >
      {/* Hero Section */}
      <Card className="liquid-glass border-primary/30">
        <CardContent className="ui-p-lg text-center">
          <div className="ui-mb-base">
            <Star className="icon-lg text-primary mx-auto ui-mb-sm animate-pulse-glow" />
            <h1 className="text-title ui-mb-xs font-sf-pro text-foreground">Dynamic Capital VIP</h1>
            <p className="text-body-sm text-muted-foreground font-sf-pro ui-mb-sm">Professional Trading • Premium Signals • VIP Support</p>
          </div>
          <div className="flex items-center justify-center gap-4 text-caption">
            <div className="flex items-center gap-1 ui-p-xs ui-rounded-full bg-success/10">
              <Users className="icon-xs text-success" />
              <span className="text-foreground font-medium">5000+ Members</span>
            </div>
            <div className="flex items-center gap-1 ui-p-xs ui-rounded-full bg-info/10">
              <TrendingUp className="icon-xs text-info" />
              <span className="text-foreground font-medium">85% Success</span>
            </div>
            <div className="flex items-center gap-1 ui-p-xs ui-rounded-full bg-primary/10">
              <Shield className="icon-xs text-primary" />
              <span className="text-foreground font-medium">Verified</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Announcements */}
      <FadeInOnView delay={100} animation="slide-in-right">
        <Card className="liquid-glass">
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
        </Card>
      </FadeInOnView>

      {/* Active Promo Codes */}
      {activePromos.length > 0 && (
        <FadeInOnView delay={200} animation="bounce-in">
          <Card className="ui-card-interactive">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-subheading">
                <Gift className="icon-sm text-success animate-wiggle" />
                Active Promo Codes
              </CardTitle>
              <CardDescription className="text-body-sm">Limited time offers - use these codes when subscribing!</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
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
                  <div 
                    key={index}
                    onClick={() => handlePromoClick(promo.code)}
                    className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg hover:from-green-500/15 hover:to-emerald-500/15 transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
                  >
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
                ))}
              </HorizontalSnapScroll>
            </CardContent>
          </Card>
        </FadeInOnView>
      )}

      {/* About Dynamic Capital */}
      <FadeInOnView delay={300} animation="bounce-in">
        <Card className="liquid-glass hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-subheading">
              <Award className="icon-sm text-primary animate-pulse-glow" />
              About Dynamic Capital
            </CardTitle>
          </CardHeader>
          <CardContent className="prose">
            <p className="text-body-sm text-foreground whitespace-pre-line leading-relaxed">
              {aboutUs}
            </p>
          </CardContent>
        </Card>
      </FadeInOnView>

      {/* Our Services */}
      <FadeInOnView delay={500} animation="slide-in-right">
        <Card className="liquid-glass hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-subheading">
              <Target className="icon-sm text-blue-500 animate-float" />
              Our Services
            </CardTitle>
          </CardHeader>
          <CardContent className="prose">
            <div className="ui-stack-sm">
              {services.split('\n').filter(service => service.trim()).map((service, index) => {
                // Map service emojis to lucide icons
                const getServiceIcon = (text: string) => {
                  if (text.includes('📈') || text.includes('Signal')) return TrendingUp;
                  if (text.includes('📊') || text.includes('Analysis')) return Star;
                  if (text.includes('🛡️') || text.includes('Risk')) return Shield;
                  if (text.includes('👨‍🏫') || text.includes('Mentor')) return Users;
                  if (text.includes('💎') || text.includes('VIP')) return Sparkles;
                  if (text.includes('📞') || text.includes('Support')) return MessageSquare;
                  return Award;
                };
                
                const ServiceIcon = getServiceIcon(service);
                
                return (
                  <FadeInOnView
                    key={index}
                    delay={600 + (index * 100)}
                    animation="fade-in"
                  >
                    <div className="flex items-center gap-3 ui-p-sm ui-rounded-lg hover:bg-muted/30 transition-all duration-300 hover:scale-[1.02] group">
                      <ServiceIcon className="icon-xs text-primary group-hover:animate-float transition-all duration-300 flex-shrink-0" />
                      <span className="text-body-sm text-foreground flex-1">{service.replace(/[📈📊🛡️👨‍🏫💎📞]/g, '').replace('•', '').trim()}</span>
                    </div>
                  </FadeInOnView>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </FadeInOnView>

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
      <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
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
      </Card>
    </div>
  );
}