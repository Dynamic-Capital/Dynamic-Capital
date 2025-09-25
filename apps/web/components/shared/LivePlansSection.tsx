"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  Check,
  CheckCircle,
  Coins,
  CreditCard,
  Crown,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  ThreeDEmoticon,
  TradingEmoticonSet,
} from "@/components/ui/three-d-emoticons";
import {
  AnimatedHeading,
  CountUp,
  GradientText,
} from "@/components/ui/enhanced-typography";
import {
  Interactive3DCard,
  StaggeredGrid,
} from "@/components/ui/interactive-cards";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import { HorizontalSnapScroll } from "@/components/ui/horizontal-snap-scroll";
import { useToast } from "@/hooks/useToast";
import { buildFunctionUrl, callEdgeFunction } from "@/config/supabase";
import PromoCodeInput from "@/components/billing/PromoCodeInput";
import { formatPrice } from "@/utils";
import { ActivePromosSection } from "@/components/shared/ActivePromosSection";

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
  onBankPayment?: () => void;
  onCryptoPayment?: () => void;
  telegramData?: any;
  showHeader?: boolean;
}

export const LivePlansSection = ({
  showPromo = false,
  onPlanSelect,
  onBankPayment,
  onCryptoPayment,
  telegramData,
  showHeader = true,
}: LivePlansSectionProps) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPlans = useCallback(async () => {
    try {
      const { data, error } = await callEdgeFunction("PLANS");

      if (error) {
        throw new Error(error.message);
      }

      if ((data as any)?.plans) {
        setPlans((data as any).plans);
      }
    } catch (error) {
      console.error("Failed to fetch plans:", error);
      toast({
        title: "Error",
        description: "Failed to load subscription plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleSelectPlan = (planId: string) => {
    if (onPlanSelect) {
      onPlanSelect(planId);
    } else if (telegramData?.webApp) {
      // Open in Telegram Mini App
      const url = `${buildFunctionUrl("MINIAPP")}?tab=plan&plan=${planId}`;
      window.open(url, "_blank");
    } else {
      // Open in new tab for web users
      const url = `${buildFunctionUrl("MINIAPP")}?tab=plan&plan=${planId}`;
      window.open(url, "_blank");
      toast({
        title: "Opening in Mini App",
        description: "The plan selection will open in a new tab",
      });
    }
  };

  const formatPlanPrice = (plan: Plan) => {
    const price = formatPrice(plan.price, plan.currency);
    return plan.is_lifetime ? price : `${price}/mo`;
  };

  const isVipPlan = (name: string) =>
    name.toLowerCase().includes("vip") || name.toLowerCase().includes("pro");

  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-4 py-8">
          <div className="flex gap-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 flex-1" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <FadeInOnView>
      <div className="space-y-6">
        <Card className={showHeader ? undefined : "border-none shadow-none"}>
          {showHeader && (
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary animate-pulse-glow" />
                VIP Subscription Plans
              </CardTitle>
            </CardHeader>
          )}
          <CardContent className={showHeader ? undefined : "p-0"}>
            {showHeader && (
              <p className="text-muted-foreground mb-6">
                Choose the perfect plan for your trading journey. All plans
                include premium signals, market analysis, and exclusive access
                to our VIP community.
              </p>
            )}

            {showPromo && (
              <div className="mb-6 space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Have a promo code?</h4>
                  <PromoCodeInput planId={plans[0]?.id || ""} />
                </div>
                <ActivePromosSection />
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
                      ? "border-gradient-vip shadow-vip"
                      : "border-primary/30"
                  }`}
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="flex justify-between items-start ui-mb-base">
                    <div className="ui-stack-xs">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-heading text-foreground">
                          {plan.name}
                        </h4>
                        {isVipPlan(plan.name) && (
                          <Badge className="bg-gradient-to-r from-primary to-accent text-white text-xs animate-pulse ui-p-xs">
                            ⭐ VIP
                          </Badge>
                        )}
                      </div>
                      <p className="text-body-sm text-muted-foreground">
                        {plan.is_lifetime
                          ? "Lifetime access"
                          : `${plan.duration_months} month${
                            plan.duration_months > 1 ? "s" : ""
                          }`}
                      </p>
                    </div>
                    <div className="text-right ui-stack-xs">
                      <div className="text-title font-bold text-primary">
                        {formatPlanPrice(plan)}
                      </div>
                      <div className="text-caption text-muted-foreground">
                        {plan.currency}
                      </div>
                    </div>
                  </div>

                  {plan.features && plan.features.length > 0 && (
                    <div className="ui-mb-lg">
                      <div className="ui-stack-sm">
                        {plan.features.slice(0, 3).map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <Check className="icon-xs text-green-500 flex-shrink-0" />
                            <span className="text-body-sm text-foreground">
                              {feature}
                            </span>
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
                        ? "bg-gradient-to-r from-primary/20 to-accent/20 hover:from-primary/30 hover:to-accent/30"
                        : "bg-gradient-to-r from-primary/20 to-blue-600/20 hover:from-primary/30 hover:to-blue-600/30"
                    }`}
                  >
                    {isVipPlan(plan.name) ? "Get VIP Access" : "Select Plan"}
                  </Button>
                </div>
              ))}
            </HorizontalSnapScroll>

            <FadeInOnView delay={600}>
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  ✨ Instant activation • 🔒 Secure payment • 📱 Full Telegram
                  integration
                </p>
              </div>
            </FadeInOnView>
          </CardContent>
        </Card>

        {(onBankPayment || onCryptoPayment) && (
          <div className="mt-8 grid md:grid-cols-2 gap-8">
            {onBankPayment && (
              <Card
                className="bot-card group hover:shadow-xl transition-all duration-300 cursor-pointer"
                onClick={onBankPayment}
              >
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-[hsl(var(--accent-green))] to-[hsl(var(--accent-green-light))] rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                    <CreditCard className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors font-poppins">
                    Bank Transfer
                  </h4>
                  <p className="text-muted-foreground font-inter">
                    Secure bank-to-bank transfer
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={onBankPayment}
                  >
                    Select Method
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}
            {onCryptoPayment && (
              <Card
                className="bot-card group hover:shadow-xl transition-all duration-300 cursor-pointer"
                onClick={onCryptoPayment}
              >
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-[hsl(var(--accent-gold))] to-[hsl(var(--accent-yellow))] rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                    <Coins className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors font-poppins">
                    Cryptocurrency
                  </h4>
                  <p className="text-muted-foreground font-inter">
                    Bitcoin, USDT, and more
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={onCryptoPayment}
                  >
                    Select Method
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </FadeInOnView>
  );
};
