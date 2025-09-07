import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HorizontalSnapScroll } from "@/components/ui/horizontal-snap-scroll";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import PromoCodeInput from "@/components/billing/PromoCodeInput";

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
              itemWidth="clamp(300px, 90vw, 350px)" 
              gap="clamp(1rem, 3vw, 1.5rem)"
              className="pb-4"
            >
              {plans.map((plan, index) => (
                <Card 
                  key={plan.id} 
                  className={`relative transition-all duration-300 hover:shadow-xl hover:scale-[1.02] glass-card ${
                    isVipPlan(plan.name) 
                      ? 'border-primary/40 shadow-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5' 
                      : 'border-border/50 hover:border-primary/30'
                  }`}
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  {isVipPlan(plan.name) && (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-primary to-purple-500 text-white px-3 py-1 text-xs font-bold rounded-full shadow-lg animate-bounce-in z-10">
                      <Star className="w-3 h-3 inline mr-1" />
                      POPULAR
                    </div>
                  )}

                  <CardHeader className="pb-3 relative">
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-lg font-bold">{plan.name}</span>
                      {isVipPlan(plan.name) && <Crown className="w-5 h-5 text-primary animate-pulse-glow" />}
                    </CardTitle>
                    
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-3xl font-black bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
                        {formatPrice(plan)}
                      </span>
                      {plan.is_lifetime && (
                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-2 py-1 animate-pulse-glow">
                          ⚡ LIFETIME
                        </Badge>
                      )}
                      {!plan.is_lifetime && (
                        <span className="text-sm text-muted-foreground">
                          /{plan.duration_months} month{plan.duration_months !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    {plan.features && plan.features.length > 0 && (
                      <div className="space-y-3 bg-gradient-to-br from-muted/20 to-muted/10 rounded-lg p-3">
                        {plan.features.map((feature, index) => (
                          <div key={index} className="flex items-start gap-3 group">
                            <div className="bg-primary/10 rounded-full p-1 group-hover:bg-primary/20 transition-colors">
                              <Check className="w-3 h-3 text-primary shrink-0" />
                            </div>
                            <span className="text-sm font-medium leading-relaxed group-hover:text-primary transition-colors">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2">
                      <Button 
                        onClick={() => handleSelectPlan(plan.id)}
                        className={`w-full font-semibold py-3 transition-all duration-300 hover:scale-105 ${
                          isVipPlan(plan.name) 
                            ? "bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white shadow-lg animate-pulse-glow" 
                            : "glass-button border-primary/30 hover:bg-primary/10"
                        }`}
                        variant={isVipPlan(plan.name) ? "default" : "outline"}
                      >
                        {isVipPlan(plan.name) ? "🚀 Get VIP Access" : "Select Plan"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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