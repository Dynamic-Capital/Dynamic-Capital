"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SubscriptionPlan } from "./types";
import { ViewHeader } from "./ViewHeader";

interface PackagesViewProps {
  onBack: () => void;
}

const DEFAULT_FEATURES = [
  "Premium trading signals",
  "VIP chat access",
  "Priority mentor support",
  "Market analysis briefs",
];

const toCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(value);

const normalizePlan = (plan: SubscriptionPlan): SubscriptionPlan => ({
  ...plan,
  price: typeof plan.price === "number" ? plan.price : Number(plan.price ?? 0),
  currency: plan.currency || "USD",
  duration_months:
    plan.duration_months !== null && plan.duration_months !== undefined
      ? plan.duration_months
      : plan.is_lifetime
      ? 0
      : null,
  features: Array.isArray(plan.features)
    ? plan.features.filter(
      (feature): feature is string =>
        typeof feature === "string" && feature.trim().length > 0,
    )
    : null,
});

const formatDuration = (plan: SubscriptionPlan) => {
  if (plan.is_lifetime) return "Lifetime access";
  if (!plan.duration_months) return "Flexible duration";
  if (plan.duration_months === 1) return "1 month";
  return `${plan.duration_months} months`;
};

const monthlyPrice = (plan: SubscriptionPlan) => {
  if (plan.is_lifetime) return null;
  if (!plan.duration_months || plan.duration_months <= 0) return null;
  if (!plan.price) return null;
  return plan.price / plan.duration_months;
};

export function PackagesView({ onBack }: PackagesViewProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadPlans = async () => {
      try {
        setLoading(true);
        const { data, error: fnError } = await supabase.functions.invoke(
          "plans",
          { method: "GET" },
        );

        if (fnError) {
          throw fnError;
        }

        const fetchedPlans = Array.isArray(data?.plans)
          ? (data?.plans as SubscriptionPlan[])
          : [];

        if (!isMounted) return;
        setPlans(fetchedPlans.map(normalizePlan));
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        console.error("Error loading subscription plans:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load subscription plans",
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPlans();
    return () => {
      isMounted = false;
    };
  }, []);

  const bestValuePlanId = useMemo(() => {
    let bestId: string | undefined;
    let bestMonthly = Number.POSITIVE_INFINITY;

    plans.forEach((plan) => {
      const monthly = monthlyPrice(plan);
      if (monthly !== null && monthly < bestMonthly) {
        bestMonthly = monthly;
        bestId = plan.id;
      }
    });

    return bestId;
  }, [plans]);

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card
          key={`plan-skeleton-${index}`}
          className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg"
        >
          <div className="space-y-4">
            <Skeleton className="h-6 w-24 mx-auto" />
            <Skeleton className="h-10 w-32 mx-auto" />
            <Skeleton className="h-4 w-28 mx-auto" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((__, idx) => (
                <Skeleton key={idx} className="h-3 w-3/4 mx-auto" />
              ))}
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      ))}
    </div>
  );

  const renderPlans = () => {
    if (plans.length === 0) {
      return (
        <Card className="p-8 bg-gradient-to-br from-background to-muted border-0 shadow-lg text-center">
          <h3 className="text-xl font-semibold mb-2">No subscription plans</h3>
          <p className="text-muted-foreground">
            Create a plan in Supabase to have it appear here and in the Telegram
            bot menu.
          </p>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const features = plan.features && plan.features.length > 0
            ? plan.features
            : DEFAULT_FEATURES;
          const monthly = monthlyPrice(plan);
          return (
            <Card
              key={plan.id}
              className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg relative"
            >
              {plan.is_lifetime
                ? (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-purple-600 text-white">Lifetime</Badge>
                  </div>
                )
                : plan.id === bestValuePlanId
                ? (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white">Best Value</Badge>
                  </div>
                )
                : null}

              <div className="text-center space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <p className="text-3xl font-bold text-blue-600">
                    {toCurrency(plan.price, plan.currency)}
                  </p>
                  <p className="text-muted-foreground">
                    {formatDuration(plan)}
                  </p>
                  {monthly !== null && (
                    <p className="text-xs text-muted-foreground">
                      ≈ {toCurrency(monthly, plan.currency)} per month
                    </p>
                  )}
                </div>
                <div className="space-y-2 text-sm text-muted-foreground text-left">
                  {features.map((feature) => (
                    <p key={`${plan.id}-${feature}`}>✓ {feature}</p>
                  ))}
                </div>
                <Button variant="default" className="w-full">
                  Edit Plan
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <ViewHeader
        title="Subscription Packages"
        description="Manage your VIP subscription plans"
        onBack={onBack}
      />

      {error && (
        <Alert variant="destructive" className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {loading ? renderSkeletons() : renderPlans()}
    </div>
  );
}
