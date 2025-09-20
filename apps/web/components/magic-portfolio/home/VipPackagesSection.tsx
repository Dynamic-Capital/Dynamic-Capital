"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Column,
  Heading,
  Icon,
  Line,
  Row,
  Spinner,
  Tag,
  Text,
} from "@once-ui-system/core";

import { callEdgeFunction } from "@/config/supabase";
import { formatPrice } from "@/utils";
import type { Plan } from "@/types/plan";

interface PlansResponse {
  plans: Plan[];
}

const FALLBACK_PLANS: Plan[] = [
  {
    id: "vip-monthly",
    name: "VIP Monthly",
    price: 49,
    currency: "USD",
    duration_months: 1,
    is_lifetime: false,
    features: [
      "24/7 signal desk coverage",
      "Live trade recaps",
      "Priority mentor Q&A",
    ],
  },
  {
    id: "vip-quarterly",
    name: "VIP Quarterly",
    price: 129,
    currency: "USD",
    duration_months: 3,
    is_lifetime: false,
    features: [
      "Everything in VIP Monthly",
      "Quarterly strategy audit",
      "Automation checklist upgrades",
    ],
  },
  {
    id: "vip-lifetime",
    name: "VIP Lifetime",
    price: 990,
    currency: "USD",
    duration_months: 0,
    is_lifetime: true,
    features: [
      "Lifetime signal desk access",
      "Priority desk hotline",
      "Founders circle workshops",
    ],
  },
];

const formatDuration = (plan: Plan) => {
  if (plan.is_lifetime) {
    return "Lifetime access";
  }
  if (plan.duration_months === 1) {
    return "Monthly";
  }
  if (plan.duration_months % 12 === 0) {
    const years = plan.duration_months / 12;
    return `${years} year${years > 1 ? "s" : ""}`;
  }
  return `${plan.duration_months} months`;
};

export function VipPackagesSection() {
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const fetchPlans = async () => {
      try {
        const { data, error } = await callEdgeFunction<PlansResponse>("PLANS");
        if (!mounted) {
          return;
        }
        if (!error && data?.plans && data.plans.length > 0) {
          setPlans(data.plans);
          setUsingFallback(false);
        }
      } catch (err) {
        console.warn("Failed to load live plans, falling back to defaults", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void fetchPlans();

    return () => {
      mounted = false;
    };
  }, []);

  const handleCheckout = (planId: string) => {
    router.push(`/checkout?plan=${encodeURIComponent(planId)}`);
  };

  return (
    <Column
      id="vip-packages"
      fillWidth
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      gap="32"
      shadow="l"
    >
      <Column gap="12" maxWidth={32}>
        <Heading variant="display-strong-xs">VIP membership packages</Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Choose the desk access that matches your trading cadence. Every package includes live signals, trade accountability, and automation templates.
        </Text>
        {usingFallback ? (
          <Text variant="body-default-s" onBackground="brand-weak">
            Live pricing will refresh once the Supabase connection is available. Showing reference packages in the meantime.
          </Text>
        ) : null}
      </Column>
      {loading ? (
        <Row fillWidth horizontal="center" paddingY="32" gap="16">
          <Spinner />
          <Text variant="body-default-m">Loading plans…</Text>
        </Row>
      ) : (
        <Column gap="20">
          <Row gap="16" wrap>
            {plans.map((plan) => (
              <Column
                key={plan.id}
                flex={1}
                minWidth={18}
                maxWidth={24}
                background="page"
                border={plan.is_lifetime ? "brand-alpha-medium" : "neutral-alpha-weak"}
                radius="l"
                padding="l"
                gap="20"
                shadow={plan.is_lifetime ? "l" : undefined}
              >
                <Column gap="12">
                  <Row horizontal="between" vertical="center">
                    <Text variant="heading-strong-m">{plan.name}</Text>
                    <Tag size="s" prefixIcon={plan.is_lifetime ? "infinity" : "calendar"}>
                      {formatDuration(plan)}
                    </Tag>
                  </Row>
                  <Heading variant="display-strong-s">
                    {formatPrice(plan.price, plan.currency)}
                    {!plan.is_lifetime ? <Text as="span" variant="body-default-m" onBackground="neutral-weak">/period</Text> : null}
                  </Heading>
                  <Text variant="body-default-m" onBackground="neutral-weak">
                    {plan.is_lifetime
                      ? "Lifetime access to every desk upgrade and live mentor cohort."
                      : "Recurring access with automation updates and weekly accountability."
                    }
                  </Text>
                </Column>
                {plan.features?.length ? (
                  <Column as="ul" gap="8">
                    {plan.features.slice(0, 4).map((feature, index) => (
                      <Row key={index} gap="8" vertical="center">
                        <Icon name="check" onBackground="brand-medium" />
                        <Text as="li" variant="body-default-m">
                          {feature}
                        </Text>
                      </Row>
                    ))}
                    {plan.features.length > 4 ? (
                      <Text variant="body-default-s" onBackground="neutral-weak">
                        +{plan.features.length - 4} more desk utilities
                      </Text>
                    ) : null}
                  </Column>
                ) : null}
                <Row gap="12" s={{ direction: "column" }}>
                  <Button
                    size="m"
                    variant="secondary"
                    data-border="rounded"
                    onClick={() => handleCheckout(plan.id)}
                    prefixIcon="sparkles"
                  >
                    Continue to checkout
                  </Button>
                  <Button
                    size="m"
                    variant="secondary"
                    data-border="rounded"
                    href={`/checkout?plan=${encodeURIComponent(plan.id)}`}
                    arrowIcon
                  >
                    Preview payment options
                  </Button>
                </Row>
              </Column>
            ))}
          </Row>
          <Line background="neutral-alpha-weak" />
          <Row gap="16" s={{ direction: "column" }}>
            <Button
              size="m"
              variant="secondary"
              data-border="rounded"
              prefixIcon="rocket"
              href="/checkout"
            >
              Open secure checkout
            </Button>
            <Button
              size="m"
              variant="secondary"
              data-border="rounded"
              arrowIcon
              href="#mentorship-programs"
            >
              Compare mentorship support
            </Button>
          </Row>
        </Column>
      )}
    </Column>
  );
}

export default VipPackagesSection;
