"use client";

import React, { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Interactive3DCard } from "@/components/ui/interactive-cards";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import {
  Award,
  CheckCircle,
  Crown,
  Gift,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import { ThreeDEmoticon } from "@/components/ui/three-d-emoticons";
import { cn } from "@/lib/utils";
import type { Plan } from "@/types/plan";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";

interface VIPSubscriptionPlansProps {
  onSelectPlan?: (planId: string) => void;
  compact?: boolean;
}

const deriveSavings = (plan: Plan): string | undefined => {
  if (plan.is_lifetime) {
    return undefined;
  }
  if (plan.duration_months >= 6) {
    return "25% OFF";
  }
  if (plan.duration_months >= 3) {
    return "15% OFF";
  }
  return undefined;
};

const getPlanIcon = (index: number) => {
  switch (index) {
    case 0:
      return <Star className="h-6 w-6" />;
    case 1:
      return <Crown className="h-6 w-6" />;
    case 2:
      return <Award className="h-6 w-6" />;
    default:
      return <TrendingUp className="h-6 w-6" />;
  }
};

const getPlanColor = (index: number, popular: boolean) => {
  if (popular) return "from-dc-brand to-dc-brand-dark";
  switch (index) {
    case 0:
      return "from-blue-500 to-blue-600";
    case 1:
      return "from-dc-brand to-dc-brand-dark";
    case 2:
      return "from-red-500 to-red-600";
    default:
      return "from-gray-500 to-gray-600";
  }
};

const formatDuration = (plan: Plan) => {
  if (plan.is_lifetime) {
    return "Lifetime Access";
  }
  if (plan.duration_months === 1) {
    return "1 month";
  }
  return `${plan.duration_months} months`;
};

const getDisplayPrice = (plan: Plan) =>
  plan.pricing?.displayPrice ?? plan.price;
const getDctAmount = (plan: Plan) =>
  plan.pricing?.dctAmount ?? plan.dct_amount ?? plan.price;
const getTonAmount = (plan: Plan) =>
  plan.pricing?.tonAmount ?? plan.ton_amount ?? null;

export function VIPSubscriptionPlans({
  onSelectPlan,
  compact = false,
}: VIPSubscriptionPlansProps) {
  const { plans, loading, error, refresh } = useSubscriptionPlans();

  const derivedPlans = useMemo(
    () =>
      plans.map((plan, index) => ({
        plan,
        index,
        popular: index === 1,
        savings: deriveSavings(plan),
      })),
    [plans],
  );

  const handleSelectPlan = (planId: string) => {
    if (onSelectPlan) {
      onSelectPlan(planId);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("tab", "plan");
    url.searchParams.set("selected", planId);
    window.history.pushState({}, "", url.toString());
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3"></div>
              <div className="h-8 bg-muted rounded w-1/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-4 bg-muted rounded w-full"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-muted-foreground">
          {error} Refresh to try loading VIP plans again.
        </p>
        <Button variant="secondary" onClick={() => refresh(true)}>
          Retry loading plans
        </Button>
      </div>
    );
  }

  if (derivedPlans.length === 0) {
    return (
      <div className="text-center text-muted-foreground space-y-2">
        <p>VIP pricing will publish here as soon as subscriptions go live.</p>
        <p>Check back shortly or contact support for a concierge onboarding.</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {derivedPlans.slice(0, 3).map(({ plan, index, popular, savings }) => {
          const displayPrice = getDisplayPrice(plan);
          const dctAmount = getDctAmount(plan);
          const tonAmount = getTonAmount(plan);

          return (
            <Interactive3DCard
              key={plan.id}
              intensity={0.1}
              scale={1.02}
              className="relative overflow-hidden"
            >
              <Card className="h-full border-0">
                {popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-dc-brand to-dc-brand-dark text-white text-center py-1 text-xs font-medium">
                    MOST POPULAR
                  </div>
                )}
                <CardHeader className={cn("text-center", popular && "pt-8")}>
                  <div
                    className={`w-12 h-12 mx-auto rounded-full bg-gradient-to-r ${
                      getPlanColor(index, popular)
                    } flex items-center justify-center text-white mb-2`}
                  >
                    {getPlanIcon(index)}
                  </div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-dc-brand">
                      ${displayPrice}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ≈ {dctAmount.toFixed(2)} DCT
                      {typeof tonAmount === "number" && tonAmount > 0 && (
                        <span className="ml-1">
                          / {tonAmount.toFixed(3)} TON
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDuration(plan)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    className={cn(
                      "w-full",
                      popular && "bg-dc-brand hover:bg-dc-brand-dark",
                    )}
                  >
                    Choose Plan
                  </Button>
                </CardContent>
              </Card>
            </Interactive3DCard>
          );
        })}
      </div>
    );
  }

  return (
    <FadeInOnView delay={100} animation="fade-in-up">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ThreeDEmoticon emoji="👑" size={32} intensity={0.4} animate />
            <h2 className="text-2xl font-bold bg-gradient-to-r from-dc-brand to-dc-brand-dark bg-clip-text text-transparent">
              VIP Subscription Plans
            </h2>
            <ThreeDEmoticon emoji="✨" size={28} intensity={0.3} animate />
          </div>
          <p className="text-muted-foreground">
            Choose the perfect plan to elevate your trading journey
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {derivedPlans.map(({ plan, index, popular, savings }) => {
              const displayPrice = getDisplayPrice(plan);
              const dctAmount = getDctAmount(plan);
              const tonAmount = getTonAmount(plan);

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Interactive3DCard
                    intensity={popular ? 0.15 : 0.1}
                    scale={popular ? 1.03 : 1.02}
                    glowEffect={popular}
                    className="relative overflow-hidden group"
                  >
                    <Card
                      className={cn(
                        "h-full border-2 transition-all duration-300",
                        popular
                          ? "border-dc-brand shadow-lg shadow-dc-brand/20"
                          : "border-border hover:border-dc-brand-light",
                      )}
                    >
                      {popular && (
                        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-dc-brand to-dc-brand-dark text-white text-center py-2 font-medium">
                          <div className="flex items-center justify-center gap-1">
                            <Crown className="h-4 w-4" />
                            MOST POPULAR
                            <Sparkles className="h-4 w-4" />
                          </div>
                        </div>
                      )}

                      {savings && (
                        <div className="absolute top-2 right-2 z-10">
                          <Badge className="bg-green-500 text-white">
                            <Gift className="h-3 w-3 mr-1" />
                            {savings}
                          </Badge>
                        </div>
                      )}

                      <CardHeader
                        className={cn(
                          "text-center relative",
                          popular && "pt-12",
                        )}
                      >
                        <motion.div
                          className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-r ${
                            getPlanColor(index, popular)
                          } flex items-center justify-center text-white mb-4 shadow-lg`}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                          }}
                        >
                          {getPlanIcon(index)}
                        </motion.div>

                        <CardTitle className="text-xl font-bold">
                          {plan.name}
                        </CardTitle>

                        <div className="space-y-1">
                          <div className="text-3xl font-bold text-dc-brand">
                            ${displayPrice}
                            <span className="text-base text-muted-foreground ml-1">
                              {plan.currency}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ≈ {dctAmount.toFixed(2)} DCT
                            {typeof tonAmount === "number" && tonAmount > 0 && (
                              <span className="ml-1">
                                / {tonAmount.toFixed(3)} TON
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDuration(plan)}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          {plan.features.map((feature, featureIndex) => (
                            <motion.div
                              key={featureIndex}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                delay: featureIndex * 0.08,
                              }}
                              className="flex items-center gap-2"
                            >
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-muted-foreground">
                                {feature}
                              </span>
                            </motion.div>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Shield className="h-4 w-4 text-blue-500" />
                            Secure checkout
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            Instant activation
                          </div>
                        </div>

                        <Button
                          onClick={() => handleSelectPlan(plan.id)}
                          className={cn(
                            "w-full transition-transform duration-300",
                            popular
                              ? "bg-dc-brand hover:bg-dc-brand-dark"
                              : "bg-muted hover:bg-muted/80 text-foreground",
                          )}
                        >
                          {popular ? "Join the VIP wave" : "Select plan"}
                        </Button>
                      </CardContent>
                    </Card>
                  </Interactive3DCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </FadeInOnView>
  );
}
