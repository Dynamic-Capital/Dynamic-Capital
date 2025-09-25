"use client";

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
} from "@/components/dynamic-ui-system";
import type { SpacingToken } from "@/components/dynamic-ui-system";

import { formatPrice } from "@/utils";
import type { Plan } from "@/types/plan";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";

const ERROR_STATE_GAP: SpacingToken = "8";
const SECTION_GAP: SpacingToken = "32";
const SECTION_CONTENT_GAP: SpacingToken = "20";
const PLAN_CARD_GAP: SpacingToken = "20";

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
  const {
    plans,
    loading,
    error,
    hasData,
    refresh,
  } = useSubscriptionPlans();
  const router = useRouter();

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
      gap={SECTION_GAP}
      shadow="l"
      style={{ scrollMarginTop: "96px" }}
    >
      <Column gap="12" maxWidth={32}>
        <Heading variant="display-strong-xs">VIP membership packages</Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Pick the access level that fits your growth lane. All memberships
          bundle live desk signals, automation guardrails, and mentor
          accountability.
        </Text>
        {error
          ? (
            <Column gap={ERROR_STATE_GAP}>
              <Text variant="body-default-s" onBackground="brand-weak">
                {error}
              </Text>
              <Row gap={ERROR_STATE_GAP}>
                <Button
                  size="s"
                  variant="secondary"
                  data-border="rounded"
                  onClick={() => refresh(true)}
                >
                  Retry loading plans
                </Button>
              </Row>
            </Column>
          )
          : null}
      </Column>
      {loading
        ? (
          <Row fillWidth horizontal="center" paddingY="32" gap="16">
            <Spinner />
            <Text variant="body-default-m">Loading plans…</Text>
          </Row>
        )
        : !hasData
        ? (
          <Column gap="12" paddingY="24">
            <Text variant="body-default-m" onBackground="neutral-weak">
              VIP packages publish here as soon as pricing is live in Supabase.
              Check back shortly or ping the desk for a concierge walkthrough.
            </Text>
            <Row gap="12" s={{ direction: "column" }}>
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
        )
        : (
          <Column gap={SECTION_CONTENT_GAP}>
            <Row gap="16" wrap>
              {plans.map((plan) => (
                <Column
                  key={plan.id}
                  flex={1}
                  minWidth={18}
                  maxWidth={24}
                  background="page"
                  border={plan.is_lifetime
                    ? "brand-alpha-medium"
                    : "neutral-alpha-weak"}
                  radius="l"
                  padding="l"
                  gap={PLAN_CARD_GAP}
                  shadow={plan.is_lifetime ? "l" : undefined}
                >
                  <Column gap="12">
                    <Row horizontal="between" vertical="center">
                      <Text variant="heading-strong-m">{plan.name}</Text>
                      <Tag
                        size="s"
                        prefixIcon={plan.is_lifetime ? "infinity" : "calendar"}
                      >
                        {formatDuration(plan)}
                      </Tag>
                    </Row>
                    <Heading variant="display-strong-s">
                      {formatPrice(plan.price, plan.currency)}
                      {!plan.is_lifetime
                        ? (
                          <Text
                            as="span"
                            variant="body-default-m"
                            onBackground="neutral-weak"
                          >
                            /period
                          </Text>
                        )
                        : null}
                    </Heading>
                    <Text variant="body-default-m" onBackground="neutral-weak">
                      {plan.is_lifetime
                        ? "Lifetime access to every desk upgrade and live mentor cohort."
                        : "Recurring access with automation updates and weekly accountability."}
                    </Text>
                  </Column>
                  {plan.features?.length
                    ? (
                      <Column as="ul" gap="8">
                        {plan.features.slice(0, 4).map((feature, index) => (
                          <Row key={index} gap="8" vertical="center">
                            <Icon name="check" onBackground="brand-medium" />
                            <Text as="li" variant="body-default-m">
                              {feature}
                            </Text>
                          </Row>
                        ))}
                        {plan.features.length > 4
                          ? (
                            <Text
                              variant="body-default-s"
                              onBackground="neutral-weak"
                            >
                              +{plan.features.length - 4} more desk utilities
                            </Text>
                          )
                          : null}
                      </Column>
                    )
                    : null}
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
