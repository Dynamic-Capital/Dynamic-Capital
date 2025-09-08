import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Star, TrendingUp, Users, Crown, Zap, Check, Loader2 } from 'lucide-react';
import { ThreeDEmoticon, TradingEmoticonSet } from '@/components/ui/three-d-emoticons';
import { AnimatedHeading, GradientText, CountUp } from '@/components/ui/enhanced-typography';
import { Interactive3DCard, StaggeredGrid } from '@/components/ui/interactive-cards';
import { FadeInOnView } from '@/components/ui/fade-in-on-view';
import { HorizontalSnapScroll } from '@/components/ui/horizontal-snap-scroll';
import { useToast } from '@/hooks/use-toast';
import PromoCodeInput from '@/components/billing/PromoCodeInput';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_months: number;
  is_lifetime: boolean;
  features: string[];
}

interface LivePlansSectionProps {
  showPromo?: boolean;
  onPlanSelect?: (planId: string) => void;
  telegramData?: any;
}

export const LivePlansSection = ({ 
  showPromo = false, 
  onPlanSelect, 
  telegramData 
}: LivePlansSectionProps) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/plans');
      const data = await response.json();
      
      if (data.plans) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (planId: string) => {
    if (onPlanSelect) {
      onPlanSelect(planId);
    } else if (telegramData?.webApp) {
      // Open in Telegram Mini App
      const url = `https://qeejuomcapbdlhnjqjcc.functions.supabase.co/miniapp/?tab=plan&plan=${planId}`;
      window.open(url, '_blank');
    } else {
      // Open in new tab for web users
      const url = `https://qeejuomcapbdlhnjqjcc.functions.supabase.co/miniapp/?tab=plan&plan=${planId}`;
      window.open(url, '_blank');
      toast({
        title: "Opening in Mini App",
        description: "The plan selection will open in a new tab",
      });
    }
  };

  const formatPrice = (plan: Plan) => {
    if (plan.is_lifetime) {
      return `$${plan.price}`;
    }
    return `$${plan.price}/mo`;
  };

  const isVipPlan = (name: string) => 
    name.toLowerCase().includes("vip") || name.toLowerCase().includes("pro");

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">Loading plans...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <FadeInOnView>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary animate-pulse-glow" />
              VIP Subscription Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Choose the perfect plan for your trading journey. All plans include premium signals, 
              market analysis, and exclusive access to our VIP community.
            </p>

            {showPromo && (
              <div className="mb-6">
                <h4 className="font-medium mb-3">Have a promo code?</h4>
                <PromoCodeInput planId={plans[0]?.id || ""} />
              </div>
            )}

            <HorizontalSnapScroll 
              itemWidth="clamp(280px, 85vw, 340px)" 
              gap="clamp(0.75rem, 2.5vw, 1.25rem)"
              className="pb-4 scroll-padding-mobile"
              showArrows={plans.length > 1}
            >
              {plans.map((plan, index) => (
                <div 
                  key={plan.id}
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`liquid-glass relative ui-p-lg ui-rounded-xl hover:scale-105 transition-all duration-300 cursor-pointer group ${
                    isVipPlan(plan.name) 
                      ? 'border-gradient-vip shadow-vip' 
                      : 'border-primary/30'
                  }`}
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="flex justify-between items-start ui-mb-base">
                    <div className="ui-stack-xs">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-heading text-foreground">{plan.name}</h4>
                        {isVipPlan(plan.name) && (
                          <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs animate-pulse ui-p-xs">
                            ⭐ VIP
                          </Badge>
                        )}
                      </div>
                      <p className="text-body-sm text-muted-foreground">
                        {plan.is_lifetime ? 'Lifetime access' : `${plan.duration_months} month${plan.duration_months > 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <div className="text-right ui-stack-xs">
                      <div className="text-title font-bold text-primary">
                        ${formatPrice(plan)}
                      </div>
                      <div className="text-caption text-muted-foreground">USD</div>
                    </div>
                  </div>

                  {plan.features && plan.features.length > 0 && (
                    <div className="ui-mb-lg">
                      <div className="ui-stack-sm">
                        {plan.features.slice(0, 3).map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <Check className="icon-xs text-green-500 flex-shrink-0" />
                            <span className="text-body-sm text-foreground">{feature}</span>
                          </div>
                        ))}
                        {plan.features.length > 3 && (
                          <div className="text-caption text-muted-foreground ui-mt-xs">
                            +{plan.features.length - 3} more features
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Button 
                    className={`w-full liquid-glass-button text-foreground hover:scale-105 transition-all duration-300 ui-rounded-full font-medium ${
                      isVipPlan(plan.name) 
                        ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 hover:from-red-500/30 hover:to-pink-500/30' 
                        : 'bg-gradient-to-r from-primary/20 to-blue-600/20 hover:from-primary/30 hover:to-blue-600/30'
                    }`}
                  >
                    {isVipPlan(plan.name) ? 'Get VIP Access' : 'Select Plan'}
                  </Button>
                </div>
              ))}
            </HorizontalSnapScroll>

            <FadeInOnView delay={600}>
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  ✨ Instant activation • 🔒 Secure payment • 📱 Full Telegram integration
                </p>
              </div>
            </FadeInOnView>
          </CardContent>
        </Card>
      </div>
    </FadeInOnView>
  );
};