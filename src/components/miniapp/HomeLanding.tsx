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

  const isInTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;

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

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="bg-gradient-to-br from-primary/10 via-purple-500/10 to-blue-500/10 border-primary/20">
        <CardContent className="p-6 text-center">
          <div className="mb-4">
            <Star className="h-12 w-12 text-primary mx-auto mb-3" />
            <h1 className="text-2xl font-bold mb-2">Dynamic Capital VIP</h1>
            <p className="text-muted-foreground">Professional Trading • Premium Signals • VIP Support</p>
          </div>
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-green-500" />
              <span>5000+ Members</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span>85% Success Rate</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="h-4 w-4 text-purple-500" />
              <span>Verified Signals</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Announcements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            Latest Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm whitespace-pre-line">{announcements}</p>
          </div>
        </CardContent>
      </Card>

      {/* Active Promo Codes */}
      {activePromos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-green-500" />
              Active Promo Codes
            </CardTitle>
            <CardDescription>Limited time offers - use these codes when subscribing!</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activePromos.map((promo, index) => (
                <div key={index} className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <Badge className="bg-green-500 text-white font-mono text-sm">
                      {promo.code}
                    </Badge>
                    <Badge variant="outline" className="text-green-600">
                      {formatDiscountText(promo)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{promo.description}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Valid until: {new Date(promo.valid_until).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* About Dynamic Capital */}
      <FadeInOnView delay={300} animation="bounce-in">
        <Card className="hover:shadow-lg transition-all duration-300 hover:scale-102">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary animate-pulse-glow" />
              About Dynamic Capital
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {aboutUs}
            </p>
          </CardContent>
        </Card>
      </FadeInOnView>

      {/* Our Services */}
      <FadeInOnView delay={500} animation="slide-in-right">
        <Card className="hover:shadow-lg transition-all duration-300 hover:scale-102">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Our Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {services.split('\n').filter(service => service.trim()).map((service, index) => (
                <FadeInOnView
                  key={index}
                  delay={600 + (index * 100)}
                  animation="fade-in"
                >
                  <div className="flex items-center gap-2 text-sm hover:scale-105 transition-transform duration-200">
                    <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                    <span>{service.replace('•', '').trim()}</span>
                  </div>
                </FadeInOnView>
              ))}
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
        <CardContent className="p-6 text-center">
          <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2">Ready to Start Trading Like a Pro?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Join thousands of successful traders who trust Dynamic Capital for their trading journey.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('tab', 'plan');
              window.history.pushState({}, '', url.toString());
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}>
              View VIP Plans
            </Button>
            {isInTelegram && (
              <Button variant="outline" onClick={() => {
                window.open('https://t.me/Dynamic_VIP_BOT', '_blank');
              }}>
                Contact Support
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}