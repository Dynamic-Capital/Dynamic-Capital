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
              itemWidth="320px" 
              gap="1.5rem"
              className="pb-4"
            >
              {plans.map((plan, index) => (
                <Card 
                  key={plan.id} 
                  className={`relative transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                    isVipPlan(plan.name) 
                      ? 'border-primary/50 shadow-primary/10 animate-pulse-glow' 
                      : 'border-muted hover:border-primary/30'
                  }`}
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  {isVipPlan(plan.name) && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-primary to-primary/80 text-primary-foreground px-3 py-1 text-xs font-medium rounded-bl-lg animate-bounce-in">
                      <Star className="w-3 h-3 inline mr-1" />
                      Popular
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                      {plan.name}
                      {isVipPlan(plan.name) && <Crown className="w-4 h-4 text-primary" />}
                    </CardTitle>
                    
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                        {formatPrice(plan)}
                      </span>
                      {plan.is_lifetime && (
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                          Lifetime
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {plan.features && plan.features.length > 0 && (
                      <div className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-4">
                      <Button 
                        onClick={() => handleSelectPlan(plan.id)}
                        className="w-full transition-all duration-300 hover:scale-105"
                        variant={isVipPlan(plan.name) ? "default" : "outline"}
                      >
                        Select Plan
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