"use client";

import { useCallback, useEffect, useMemo } from "react";
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
import { useWalletConnect } from "@/hooks/useWalletConnect";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { usePopularPlanId } from "@/hooks/usePopularPlanId";
import type { Plan } from "@/types/plan";
import { formatPrice } from "@/utils";
import {
  describePlanFrequency,
  formatPlanDuration,
  getMonthlyEquivalent,
} from "@/utils/plan-format";

import styles from "./VipPlansPricingSection.module.scss";

const MAX_FEATURES_DISPLAY = 6;

const BILLING_HIGHLIGHTS = [
  {
    icon: "sparkles" as const,
    copy: "DCT only burns when you use it.",
  },
  {
    icon: "gift" as const,
    copy: "Promo codes drop in every checkout.",
  },
  {
    icon: "refresh" as const,
    copy: "Copy access recharges with your tier.",
  },
];

const PLAN_EDUCATION = [
  {
    term: "Copy trading",
    description: "Desk trades mirror into your connected account.",
  },
  {
    term: "DCT (Dynamic Capital Token)",
    description: "DCT powers chat, mentors, and automation bots.",
  },
  {
    term: "Withdrawal",
    description: "Schedule decentralized releases whenever you need out.",
  },
];

export function VipPlansPricingSection() {
  const { plans, loading, error, hasData, refresh } = useSubscriptionPlans();
  const {
    popularPlanId,
    error: popularPlanError,
  } = usePopularPlanId();
  const reduceMotion = useReducedMotion();
  const connectWallet = useWalletConnect();
  const router = useRouter();

  useEffect(() => {
    if (popularPlanError) {
      console.warn(
        "[VipPlansPricingSection] Failed to fetch popular plan content",
        popularPlanError,
      );
    }
  }, [popularPlanError]);

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

  const handleSubscribe = useCallback(
    async (plan: Plan) => {
      await connectWallet({ planId: plan.id });
      router.push(`/checkout?plan=${encodeURIComponent(plan.id)}`);
    },
    [connectWallet, router],
  );

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
            Pricing syncs shortly
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            Check back soon or ping the desk for a quick walkthrough.
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
            Go to checkout
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
      <Row gap="20" wrap s={{ direction: "column" }}>
        <Column gap="12" align="start" flex={2} minWidth={24}>
          <Tag size="s" background="brand-alpha-weak" prefixIcon="sparkles">
            VIP plans
          </Tag>
          <Heading variant="display-strong-xs" wrap="balance">
            Pick a plan that matches your pace
          </Heading>
          <Text
            variant="body-default-l"
            onBackground="neutral-weak"
            wrap="balance"
          >
            Straightforward pricing that mirrors checkout. DCT, copy trading,
            and withdrawals stay explained in plain words.
          </Text>
          <Row gap="8" wrap>
            {BILLING_HIGHLIGHTS.map((item) => (
              <Tag key={item.copy} size="s" prefixIcon={item.icon}>
                {item.copy}
              </Tag>
            ))}
          </Row>
        </Column>
        <Column
          gap="12"
          align="start"
          flex={1}
          minWidth={20}
          background="neutral-alpha-weak"
          border="neutral-alpha-medium"
          radius="l"
          padding="l"
        >
          <Heading variant="heading-strong-s">Need-to-know terms</Heading>
          <Column gap="8">
            {PLAN_EDUCATION.map((item) => (
              <Column key={item.term} gap="4">
                <Text variant="heading-strong-xs">{item.term}</Text>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {item.description}
                </Text>
              </Column>
            ))}
          </Column>
        </Column>
      </Row>

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
                      {formatPlanDuration(plan)}
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
