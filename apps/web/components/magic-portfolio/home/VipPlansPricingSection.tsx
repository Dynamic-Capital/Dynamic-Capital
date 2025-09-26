"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Button,
  Column,
  Heading,
  Icon,
  Row,
  Spinner,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import { callEdgeFunction } from "@/config/supabase";
import { useWalletConnect } from "@/hooks/useWalletConnect";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import type { Plan } from "@/types/plan";
import { formatPrice } from "@/utils";

import styles from "./VipPlansPricingSection.module.scss";

type ContentBatchResponse = {
  contents?: Array<{ content_key: string; content_value: string }>;
};

type PopularPlanContent = {
  popular_plan_id?: string | null;
};

const MAX_FEATURES_DISPLAY = 6;

function formatDuration(plan: Plan): string {
  if (plan.is_lifetime) {
    return "Lifetime access";
  }

  const months = plan.duration_months;
  if (months <= 1) return "Monthly";
  if (months === 3) return "Quarterly";
  if (months === 6) return "Semi-annual";
  if (months === 12) return "Annual";
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} year${years > 1 ? "s" : ""}`;
  }
  return `${months} months`;
}

function describePlanFrequency(plan: Plan): string {
  if (plan.is_lifetime) {
    return "one-time";
  }

  const months = plan.duration_months;
  if (months <= 1) return "per month";
  if (months === 3) return "every quarter";
  if (months === 6) return "every 6 months";
  if (months === 12) return "per year";
  if (months % 12 === 0) {
    const years = months / 12;
    return `every ${years} years`;
  }
  return `every ${months} months`;
}

function getMonthlyEquivalent(plan: Plan): number | null {
  if (plan.is_lifetime) return null;
  const months = plan.duration_months;
  if (months <= 1) return null;
  if (!Number.isFinite(months) || months === 0) return null;
  const value = plan.price / months;
  return Number.isFinite(value) ? value : null;
}

function resolvePopularPlanId(contents?: PopularPlanContent): string | null {
  if (!contents?.popular_plan_id) {
    return null;
  }
  const id = contents.popular_plan_id.trim();
  return id.length > 0 ? id : null;
}

export function VipPlansPricingSection() {
  const { plans, loading, error, hasData, refresh } = useSubscriptionPlans();
  const [popularPlanId, setPopularPlanId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const connectWallet = useWalletConnect();
  const router = useRouter();

  useEffect(() => {
    let isActive = true;

    const loadPopularPlan = async () => {
      try {
        const { data, error: contentError } = await callEdgeFunction<
          ContentBatchResponse
        >("CONTENT_BATCH", {
          method: "POST",
          body: { keys: ["popular_plan_id"] },
        });

        if (!isActive) {
          return;
        }

        if (contentError) {
          console.warn(
            "[VipPlansPricingSection] Unable to load popular plan content:",
            contentError.message,
          );
          return;
        }

        const contents = data?.contents ?? [];
        const lookup: PopularPlanContent = {};

        for (const item of contents) {
          if (item.content_key === "popular_plan_id") {
            lookup.popular_plan_id = item.content_value;
          }
        }

        setPopularPlanId(resolvePopularPlanId(lookup));
      } catch (err) {
        console.warn(
          "[VipPlansPricingSection] Failed to fetch popular plan content",
          err,
        );
      }
    };

    void loadPopularPlan();

    return () => {
      isActive = false;
    };
  }, []);

  const sortedPlans = useMemo(() => {
    if (plans.length === 0) {
      return [] as Plan[];
    }

    const list = [...plans];
    list.sort((a, b) => {
      if (popularPlanId) {
        if (a.id === popularPlanId) return -1;
        if (b.id === popularPlanId) return 1;
      }

      if (a.is_lifetime && !b.is_lifetime) return 1;
      if (!a.is_lifetime && b.is_lifetime) return -1;

      if (a.duration_months !== b.duration_months) {
        return a.duration_months - b.duration_months;
      }

      return a.price - b.price;
    });

    return list;
  }, [plans, popularPlanId]);

  const handleSubscribe = (plan: Plan) => {
    connectWallet({ planId: plan.id });
    router.push(`/checkout?plan=${encodeURIComponent(plan.id)}`);
  };

  if (loading) {
    return (
      <Column gap="20" align="start" className={styles.section}>
        <Row gap="12" vertical="center">
          <Spinner />
          <Text variant="body-default-m">Loading VIP pricing…</Text>
        </Row>
      </Column>
    );
  }

  if (error) {
    return (
      <Column gap="20" align="start" className={styles.section}>
        <Column gap="12" align="start">
          <Heading variant="display-strong-xs">
            VIP plans are warming up
          </Heading>
          <Text variant="body-default-m" onBackground="brand-weak">
            {error}
          </Text>
        </Column>
        <Button
          size="m"
          variant="secondary"
          data-border="rounded"
          onClick={() => refresh(true)}
          prefixIcon="refresh"
        >
          Retry loading plans
        </Button>
      </Column>
    );
  }

  if (!hasData) {
    return (
      <Column gap="20" align="start" className={styles.section}>
        <Column gap="12" align="start">
          <Heading variant="display-strong-xs">
            VIP plans publish here as soon as pricing is live
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            Check back shortly or chat with the desk team for a concierge
            walkthrough.
          </Text>
        </Column>
        <Row gap="12" s={{ direction: "column" }}>
          <Button
            size="m"
            variant="secondary"
            data-border="rounded"
            href="/checkout"
            prefixIcon="sparkles"
          >
            Open secure checkout
          </Button>
          <Button
            size="m"
            variant="secondary"
            data-border="rounded"
            arrowIcon
            href="#vip-packages"
          >
            View detailed VIP packages
          </Button>
        </Row>
      </Column>
    );
  }

  return (
    <Column gap="20" align="start" className={styles.section}>
      <Column gap="12" align="start">
        <Tag size="s" background="brand-alpha-weak" prefixIcon="sparkles">
          VIP plans
        </Tag>
        <Heading variant="display-strong-xs" wrap="balance">
          Choose the desk access tier that fits your momentum
        </Heading>
        <Text
          variant="body-default-l"
          onBackground="neutral-weak"
          wrap="balance"
        >
          Pricing updates in sync with the mini app so every plan you see here
          matches the checkout experience.
        </Text>
      </Column>

      <div className={styles.planGrid}>
        {sortedPlans.map((plan, index) => {
          const isPopular = popularPlanId
            ? plan.id === popularPlanId
            : index === 1 && sortedPlans.length > 1;
          const monthlyEquivalent = getMonthlyEquivalent(plan);
          const features = plan.features ?? [];
          const visibleFeatures = features.slice(0, MAX_FEATURES_DISPLAY);
          const remainingFeatureCount = Math.max(
            0,
            features.length - visibleFeatures.length,
          );

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.08,
                duration: reduceMotion ? 0 : 0.4,
              }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <div
                className={`${styles.planCard} ${
                  isPopular ? styles.popularCard : ""
                }`}
              >
                {isPopular && (
                  <span className={styles.popularGlow} aria-hidden="true" />
                )}
                <div
                  className={isPopular ? styles.popularCardContent : undefined}
                >
                  {isPopular && (
                    <span className={styles.popularBadge}>
                      <Icon name="crown" className={styles.popularBadgeIcon} />
                      Most popular
                    </span>
                  )}

                  <Column gap="12" align="start">
                    <Row gap="12" vertical="center">
                      <Icon
                        name={plan.is_lifetime ? "infinity" : "sparkles"}
                        onBackground="brand-medium"
                      />
                      <Heading variant="heading-strong-m">{plan.name}</Heading>
                    </Row>
                    <Text
                      variant="body-default-m"
                      onBackground="neutral-weak"
                      wrap="balance"
                    >
                      {plan.is_lifetime
                        ? "Lifetime desk access with every upgrade baked in."
                        : "Recurring access with automation updates and weekly accountability."}
                    </Text>
                  </Column>

                  <div className={styles.priceWrap}>
                    <span className={styles.priceLabel}>Investment</span>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={plan.id}
                        className={styles.priceValue}
                        initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
                        transition={{ duration: reduceMotion ? 0 : 0.25 }}
                      >
                        {formatPrice(plan.price, plan.currency)}
                        <span className={styles.priceSuffix}>
                          /{describePlanFrequency(plan)}
                        </span>
                      </motion.span>
                    </AnimatePresence>
                    {monthlyEquivalent && (
                      <Text
                        variant="body-default-s"
                        onBackground="neutral-weak"
                      >
                        ≈ {formatPrice(
                          monthlyEquivalent,
                          plan.currency,
                          "en-US",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )} /month equivalent
                      </Text>
                    )}
                  </div>

                  <Row gap="8" vertical="center">
                    <Tag
                      size="s"
                      prefixIcon={plan.is_lifetime ? "shield" : "calendar"}
                    >
                      {formatDuration(plan)}
                    </Tag>
                    <Tag size="s" prefixIcon="rocket">
                      Synced with mini app
                    </Tag>
                  </Row>

                  {visibleFeatures.length > 0 && (
                    <ul className={styles.featureList}>
                      {visibleFeatures.map((feature) => (
                        <li key={feature} className={styles.featureItem}>
                          <Icon name="check" className={styles.featureIcon} />
                          <span>{feature}</span>
                        </li>
                      ))}
                      {remainingFeatureCount > 0 && (
                        <li className={styles.featureItem}>
                          <Icon
                            name="layers"
                            className={styles.featureIcon}
                          />
                          <span>
                            +{remainingFeatureCount} more desk utilities
                          </span>
                        </li>
                      )}
                    </ul>
                  )}

                  <div className={styles.footer}>
                    <Button
                      size="m"
                      variant={isPopular ? "primary" : "secondary"}
                      data-border="rounded"
                      onClick={() => handleSubscribe(plan)}
                      prefixIcon="sparkles"
                    >
                      Subscribe now
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Column>
  );
}

export default VipPlansPricingSection;
