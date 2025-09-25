"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Button,
  Column,
  Heading,
  Icon,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import { formatPrice } from "@/utils";
import { useWalletConnect } from "@/hooks/useWalletConnect";

import styles from "./VipPlansPricingSection.module.scss";

type BillingInterval = "monthly" | "yearly";

type PlanDefinition = {
  id: "bronze" | "silver" | "gold";
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  badge?: string;
  features: string[];
  icon: string;
};

type BillingOption = {
  id: BillingInterval;
  label: string;
  description: string;
};

const BILLING_OPTIONS: BillingOption[] = [
  {
    id: "monthly",
    label: "Monthly",
    description: "Cancel anytime",
  },
  {
    id: "yearly",
    label: "Yearly",
    description: "2 months free",
  },
];

const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    id: "bronze",
    name: "Bronze",
    description:
      "Kickstart your desk with automation primers and curated market prep.",
    monthlyPrice: 149,
    yearlyPrice: 1490,
    features: [
      "Daily market posture briefs",
      "Foundational automation recipes",
      "Weekly mentor Q&A circles",
      "Performance journaling templates",
    ],
    icon: "sparkles",
  },
  {
    id: "silver",
    name: "Silver",
    description:
      "Most popular for active operators who want real-time oversight and desk accountability.",
    monthlyPrice: 279,
    yearlyPrice: 2790,
    badge: "Most Popular",
    features: [
      "Live trade desk with escalation paths",
      "Mentor-led readiness reviews every week",
      "Automation guardrails tuned to your risk profile",
      "Desk analytics with funding readiness score",
    ],
    icon: "crown",
  },
  {
    id: "gold",
    name: "Gold",
    description:
      "Institutional concierge with bespoke automations, capital routing, and portfolio support.",
    monthlyPrice: 499,
    yearlyPrice: 4990,
    features: [
      "Dedicated mentor pod + direct escalation",
      "Custom automation builds & liquidity routing",
      "Bi-weekly performance strategy sessions",
      "Capital deployment with risk oversight",
    ],
    icon: "shield",
  },
];

export function VipPlansPricingSection() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(
    "monthly",
  );
  const connectWallet = useWalletConnect();
  const reduceMotion = useReducedMotion();

  const pricingCopy = useMemo(() => {
    return billingInterval === "monthly" ? "per month" : "per year";
  }, [billingInterval]);

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
          Toggle between monthly and yearly billing to see how much runway you
          gain by locking in annual access.
        </Text>
      </Column>

      <div
        className={styles.toggleGroup}
        role="group"
        aria-label="Billing interval"
      >
        {BILLING_OPTIONS.map((option) => {
          const isActive = option.id === billingInterval;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setBillingInterval(option.id)}
              className={styles.toggleButton}
              aria-pressed={isActive}
            >
              {isActive && (
                <motion.span
                  layoutId="billing-pill"
                  className={styles.toggleHighlight}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                />
              )}
              <span className={styles.toggleLabel}>{option.label}</span>
              <span className={styles.toggleDescription}>
                {option.description}
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.planGrid}>
        {PLAN_DEFINITIONS.map((plan, index) => {
          const isPopular = plan.id === "silver";
          const price = billingInterval === "monthly"
            ? plan.monthlyPrice
            : plan.yearlyPrice;
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
                      {plan.badge}
                    </span>
                  )}
                  <Column gap="12" align="start">
                    <Row gap="12" vertical="center">
                      <Icon name={plan.icon} onBackground="brand-medium" />
                      <Heading variant="heading-strong-m">{plan.name}</Heading>
                    </Row>
                    <Text
                      variant="body-default-m"
                      onBackground="neutral-weak"
                      wrap="balance"
                    >
                      {plan.description}
                    </Text>
                  </Column>
                  <div className={styles.priceWrap}>
                    <span className={styles.priceLabel}>Investment</span>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={`${plan.id}-${billingInterval}`}
                        className={styles.priceValue}
                        initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
                        transition={{ duration: reduceMotion ? 0 : 0.25 }}
                      >
                        {formatPrice(price)}
                        <span className={styles.priceSuffix}>
                          /{pricingCopy}
                        </span>
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <ul className={styles.featureList}>
                    {plan.features.map((feature) => (
                      <li key={feature} className={styles.featureItem}>
                        <Icon name="check" className={styles.featureIcon} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className={styles.footer}>
                    <Button
                      size="m"
                      variant={isPopular ? "primary" : "secondary"}
                      data-border="rounded"
                      onClick={() => connectWallet({ planId: plan.id })}
                      prefixIcon="sparkles"
                    >
                      Subscribe Now
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
