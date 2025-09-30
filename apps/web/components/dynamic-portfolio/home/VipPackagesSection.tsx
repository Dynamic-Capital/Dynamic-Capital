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
import { formatPlanDuration } from "@/utils/plan-format";
import type { Plan } from "@/types/plan";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";

const ERROR_STATE_GAP: SpacingToken = "8";
const SECTION_GAP: SpacingToken = "32";
const SECTION_CONTENT_GAP: SpacingToken = "20";
const PLAN_CARD_GAP: SpacingToken = "20";

const GETTING_STARTED_STEPS = [
  {
    title: "Choose a duration",
    description: "Daily, weekly, or monthly access depending on how you trade.",
  },
  {
    title: "Connect your platform",
    description: "Link the broker or exchange you already use.",
  },
  {
    title: "Load credits",
    description: "Top up DCT (Dynamic Capital Tokens) for chat and automations.",
  },
];

const PACKAGE_AUTOMATIONS = [
  "Packages auto-adjust from daily to monthly usage.",
  "Copy trading mirrors into linked accounts with set pricing.",
  "Promo codes and DCT recharges trigger automatically.",
];

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
          Light tiers for quick setup. Choose how long you need access and keep
          the desk topped up with DCT.
        </Text>
        <Column gap="12" padding="m" background="neutral-alpha-weak" radius="l">
          <Heading variant="heading-strong-s">Three simple steps</Heading>
          <Column gap="12">
            {GETTING_STARTED_STEPS.map((step, index) => (
              <Column key={step.title} gap="4">
                <Text variant="body-default-s" onBackground="brand-medium">
                  Step {index + 1}
                </Text>
                <Text variant="heading-strong-xs">{step.title}</Text>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {step.description}
                </Text>
              </Column>
            ))}
          </Column>
        </Column>
        <Column as="ul" gap="8">
          {PACKAGE_AUTOMATIONS.map((item) => (
            <Row key={item} gap="8" vertical="center">
              <Icon name="check" onBackground="brand-medium" />
              <Text as="li" variant="body-default-m">
                {item}
              </Text>
            </Row>
          ))}
        </Column>
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
              Packages go live once pricing syncs. Check back soon or chat with
              the desk.
            </Text>
            <Row gap="12" s={{ direction: "column" }}>
              <Button
                size="m"
                variant="secondary"
                data-border="rounded"
                prefixIcon="rocket"
                href="/checkout"
              >
                Go to checkout
              </Button>
              <Button
                size="m"
                variant="secondary"
                data-border="rounded"
                arrowIcon
                href="#pricing"
              >
                View pricing overview
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
                        {formatPlanDuration(plan)}
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
                Go to checkout
              </Button>
              <Button
                size="m"
                variant="secondary"
                data-border="rounded"
                arrowIcon
                href="#pricing"
              >
                View pricing overview
              </Button>
            </Row>
          </Column>
        )}
    </Column>
  );
}

export default VipPackagesSection;
