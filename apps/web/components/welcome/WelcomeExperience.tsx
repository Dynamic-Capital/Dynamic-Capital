"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Crown,
  Rocket,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import { MotionCard } from "@/components/ui/motion-card";
import { cn } from "@/utils";
import { useToast } from "@/hooks/useToast";
import {
  fetchWelcomeContent,
  fetchWelcomePlans,
  type PlanIdentifier,
  type WelcomeContent,
  type WelcomePlans,
} from "@/lib/welcome";
import { VipPromoBanner } from "@/components/miniapp/VipPromoBanner";

type PlanKind = "monthly" | "lifetime" | "free";

type PlanCallback = (planId: string, kind: PlanKind) => void;

type WelcomeExperienceProps = {
  className?: string;
  onSelectPlan?: PlanCallback;
  onPromoApply?: (code: string) => void;
};

type MiniWelcomeExperienceProps = {
  className?: string;
  onSelectPlan?: PlanCallback;
  onPromoApply?: (code: string) => void;
};

const DEFAULT_CONTENT: WelcomeContent = {
  raw: "Professional Trading • Premium Signals • VIP Support",
  lines: [
    "Professional Trading",
    "Premium Signals",
    "VIP Support",
  ],
};

const ICON_SEQUENCE = [Sparkles, Rocket, TrendingUp, Shield, Users, Crown];

function useWelcomeData() {
  const [content, setContent] = useState<WelcomeContent>(DEFAULT_CONTENT);
  const [plans, setPlans] = useState<WelcomePlans>({ plans: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([fetchWelcomeContent(), fetchWelcomePlans()])
      .then(([nextContent, nextPlans]) => {
        if (!mounted) return;
        setContent(nextContent);
        setPlans(nextPlans);
      })
      .catch((error) => {
        console.error("Failed to load welcome experience data", error);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { content, plans, loading };
}

function planName(kind: PlanKind) {
  switch (kind) {
    case "monthly":
      return "Monthly";
    case "lifetime":
      return "Lifetime";
    default:
      return "Free";
  }
}

function usePlanSelection(onSelectPlan?: PlanCallback) {
  const { toast } = useToast();

  const handlePlan = (plan: PlanIdentifier | undefined, kind: PlanKind) => {
    if (!onSelectPlan) return;

    if (!plan && kind !== "free") {
      toast({
        title: `${planName(kind)} plan unavailable`,
        description: "Check back soon or contact support for assistance.",
        variant: "destructive",
      });
      return;
    }

    if (plan) {
      onSelectPlan(plan.id, kind);
      toast({
        title: `${planName(kind)} plan ready`,
        description: "We'll guide you through the next steps.",
        duration: 3000,
      });
    } else {
      onSelectPlan("free", "free");
      toast({
        title: "Free access activated",
        description: "Explore the platform with the complimentary plan.",
        duration: 3000,
      });
    }
  };

  return { handlePlan };
}

export function WelcomeExperience({
  className,
  onSelectPlan,
  onPromoApply,
}: WelcomeExperienceProps) {
  const { content, plans, loading } = useWelcomeData();
  const { handlePlan } = usePlanSelection(onSelectPlan);

  const linesWithIcons = useMemo(() =>
    content.lines.map((line, index) => ({
      line,
      Icon: ICON_SEQUENCE[index % ICON_SEQUENCE.length],
    })), [content.lines]);

  return (
    <FadeInOnView className={className}>
      <div className="mx-auto flex max-w-5xl flex-col gap-10 text-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            Dynamic Capital AI Trading Suite
          </div>
          <h1 className="text-4xl font-bold sm:text-5xl">
            Build elite trading discipline with AI copilots
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            Personalized trading intelligence, instant mentorship, and automated
            risk controls for ambitious investors.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <AnimatePresence mode="sync">
            {linesWithIcons.map(({ line, Icon }, index) => (
              <motion.div
                key={`${line}-${index}`}
                className="mx-auto flex max-w-xl items-center justify-center gap-3 rounded-full border border-primary/30 bg-background/70 px-6 py-3 shadow-sm"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ delay: index * 0.08, duration: 0.5 }}
              >
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-base font-medium text-muted-foreground">
                  {line}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Button
            size="lg"
            onClick={() => handlePlan(plans.monthly, "monthly")}
            disabled={loading}
            className="min-w-[180px]"
          >
            Start monthly
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => handlePlan(plans.lifetime, "lifetime")}
            disabled={loading}
            className="min-w-[200px]"
          >
            Unlock lifetime access
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => handlePlan(undefined, "free")}
            className="min-w-[160px]"
          >
            Try the free tier
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {["24/7 VIP desk", "Risk-managed signals", "Community accountability"]
            .map((title, index) => (
              <Card key={title} className="border-primary/20 bg-background/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {index === 0 && <Shield className="h-4 w-4 text-primary" />}
                    {index === 1 && (
                      <TrendingUp className="h-4 w-4 text-primary" />
                    )}
                    {index === 2 && <Users className="h-4 w-4 text-primary" />}
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {index === 0 &&
                    "Dedicated human traders review every high-priority alert before you act."}
                  {index === 1 &&
                    "Position sizing playbooks + AI alerts keep your downside protected."}
                  {index === 2 &&
                    "Join an accountability pod of profitable traders leveling up together."}
                </CardContent>
              </Card>
            ))}
        </div>

        <VipPromoBanner
          className="mx-auto max-w-3xl"
          onApplyPromo={(code) => onPromoApply?.(code)}
        />
      </div>
    </FadeInOnView>
  );
}

export function MiniWelcomeExperience({
  className,
  onSelectPlan,
  onPromoApply,
}: MiniWelcomeExperienceProps) {
  const { content, plans, loading } = useWelcomeData();
  const { handlePlan } = usePlanSelection(onSelectPlan);

  const rotatingLines = useMemo(() => content.lines.slice(0, 3), [
    content.lines,
  ]);

  return (
    <MotionCard
      variant="glass"
      hover={false}
      animate={true}
      className={cn("border-primary/30", className)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className="flex items-center gap-1 text-xs"
          >
            <Zap className="h-3 w-3" />
            Instant onboarding
          </Badge>
          <span className="text-xs text-muted-foreground">
            {loading ? "Syncing..." : `${plans.plans.length} plan options`}
          </span>
        </div>
        <CardTitle className="text-xl font-semibold">
          Welcome to Dynamic Capital VIP
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-lg border border-primary/20 bg-primary/10">
          <AnimatePresence initial={false}>
            {rotatingLines.map((line, index) => (
              <motion.div
                key={`${line}-${index}`}
                className="px-4 py-3 text-sm font-medium text-primary"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ delay: index * 0.12, duration: 0.45 }}
              >
                {line}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Button
            onClick={() => handlePlan(plans.monthly, "monthly")}
            disabled={loading}
            className="w-full"
          >
            Monthly
          </Button>
          <Button
            variant="secondary"
            onClick={() => handlePlan(plans.lifetime, "lifetime")}
            disabled={loading}
            className="w-full"
          >
            Lifetime
          </Button>
          <Button
            variant="outline"
            onClick={() => handlePlan(undefined, "free")}
            className="w-full"
          >
            Free tour
          </Button>
        </div>

        <VipPromoBanner
          className="border-dashed border-primary/30 bg-background"
          onApplyPromo={(code) => {
            onPromoApply?.(code);
          }}
        />
      </CardContent>
    </MotionCard>
  );
}
