"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { formatPrice } from "@/utils";
import type { Plan } from "@/types/plan";

const getPlanLabel = (plan: Plan) => {
  if (plan.is_lifetime) {
    return "Lifetime";
  }

  const months = plan.duration_months;

  if (months === 1) return "Monthly";
  if (months === 3) return "Quarterly";
  if (months === 6) return "Semi-annual";
  if (months === 12) return "Annual";
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} year${years > 1 ? "s" : ""}`;
  }

  return `${months} months`;
};

const describePlanFrequency = (plan: Plan) => {
  if (plan.is_lifetime) {
    return "One-time investment";
  }

  const months = plan.duration_months;

  if (months === 1) return "per month";
  if (months === 3) return "per quarter";
  if (months === 6) return "every 6 months";
  if (months === 12) return "per year";
  if (months % 12 === 0) {
    const years = months / 12;
    return `every ${years} years`;
  }

  return `every ${months} months`;
};

const VipPriceSwitcher = () => {
  const { plans, loading, error, hasData, refresh } = useSubscriptionPlans();

  const orderedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      if (a.is_lifetime && !b.is_lifetime) return 1;
      if (!a.is_lifetime && b.is_lifetime) return -1;
      return a.duration_months - b.duration_months;
    });
  }, [plans]);

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  useEffect(() => {
    if (orderedPlans.length === 0) {
      setSelectedPlanId(null);
      return;
    }

    if (
      !selectedPlanId ||
      !orderedPlans.some((plan) => plan.id === selectedPlanId)
    ) {
      setSelectedPlanId(orderedPlans[0].id);
    }
  }, [orderedPlans, selectedPlanId]);

  const selectedPlan = useMemo(
    () => orderedPlans.find((plan) => plan.id === selectedPlanId) ?? null,
    [orderedPlans, selectedPlanId],
  );

  const monthlyPlan = useMemo(
    () =>
      orderedPlans.find((plan) =>
        !plan.is_lifetime && plan.duration_months === 1
      ) ?? null,
    [orderedPlans],
  );

  const savings = useMemo(() => {
    if (!selectedPlan || !monthlyPlan) return null;
    if (selectedPlan.is_lifetime) return null;
    if (selectedPlan.duration_months <= 1) return null;
    if (selectedPlan.currency !== monthlyPlan.currency) return null;

    const monthlyEquivalent = selectedPlan.price / selectedPlan.duration_months;
    if (monthlyEquivalent >= monthlyPlan.price) return null;

    const percent = Math.round(
      (1 - monthlyEquivalent / monthlyPlan.price) * 100,
    );
    const amountSaved = monthlyPlan.price * selectedPlan.duration_months -
      selectedPlan.price;
    return { percent, amountSaved };
  }, [selectedPlan, monthlyPlan]);

  const renderPricingContent = () => {
    if (loading) {
      return (
        <motion.div
          key="loading"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <div className="text-lg text-muted-foreground">
            Loading live pricing…
          </div>
        </motion.div>
      );
    }

    if (error) {
      return (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="text-center space-y-4"
        >
          <div className="text-lg text-muted-foreground">
            Unable to load live pricing right now.
          </div>
          <Button variant="outline" onClick={() => refresh(true)}>
            Retry loading plans
          </Button>
        </motion.div>
      );
    }

    if (!selectedPlan) {
      return (
        <motion.div
          key="empty"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <div className="text-lg text-muted-foreground">
            VIP plans will appear here as soon as they are published in
            Supabase.
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={selectedPlan.id}
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
        className="text-center"
      >
        <div className="text-sm uppercase tracking-[0.3em] text-muted-foreground mb-3">
          {selectedPlan.name}
        </div>
        <div className="text-5xl sm:text-6xl md:text-7xl font-black bg-gradient-to-r from-primary via-dc-accent to-primary bg-clip-text text-transparent mb-2">
          {formatPrice(selectedPlan.price, selectedPlan.currency)}
        </div>
        <div className="text-lg sm:text-xl text-muted-foreground font-medium">
          {describePlanFrequency(selectedPlan)}
        </div>
        {savings
          ? (
            <div className="text-sm text-accent-green font-semibold mt-2">
              Save {savings.percent}% ({formatPrice(
                savings.amountSaved,
                selectedPlan.currency,
              )}) compared to monthly billing
            </div>
          )
          : selectedPlan.is_lifetime
          ? (
            <div className="text-sm text-primary font-semibold mt-2">
              One payment. Permanent VIP desk access.
            </div>
          )
          : null}
      </motion.div>
    );
  };

  return (
    <section className="py-16 bg-gradient-to-b from-transparent via-card/10 to-transparent">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-foreground via-primary to-dc-accent bg-clip-text text-transparent">
            VIP Membership Plans
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your trading journey. Pricing updates
            automatically from the Supabase subscription plans table shared with
            the Telegram bot.
          </p>
        </motion.div>

        {!error && (loading || orderedPlans.length > 0)
          ? (
            <motion.div
              className="flex flex-col items-center justify-center gap-4 sm:flex-row mb-8"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-2 shadow-lg">
                <div className="flex flex-col sm:flex-row gap-2">
                  {orderedPlans.length === 0
                    ? (
                      <div className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-muted-foreground">
                        Loading options…
                      </div>
                    )
                    : orderedPlans.map((plan) => {
                      const isActive = plan.id === selectedPlanId;
                      return (
                        <motion.button
                          key={plan.id}
                          className={`px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold transition-all duration-300 relative overflow-hidden ${
                            isActive
                              ? "bg-gradient-to-r from-primary to-dc-accent text-white shadow-lg shadow-primary/30"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          onClick={() => setSelectedPlanId(plan.id)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          aria-pressed={isActive}
                        >
                          {isActive && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                              animate={{ x: ["-100%", "100%"] }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            />
                          )}
                          <span className="relative z-10">
                            {getPlanLabel(plan)}
                          </span>
                        </motion.button>
                      );
                    })}
                </div>
              </div>
            </motion.div>
          )
          : null}

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="relative">
            <AnimatePresence mode="wait">
              {renderPricingContent()}
            </AnimatePresence>
          </div>
        </motion.div>

        {hasData
          ? (
            <div className="mt-10 flex justify-center">
              <Button
                variant="ghost"
                size="lg"
                className="rounded-full"
                asChild
              >
                <a href="#vip-packages" className="flex items-center gap-2">
                  View detailed VIP packages
                </a>
              </Button>
            </div>
          )
          : null}
      </div>
    </section>
  );
};

export default VipPriceSwitcher;
