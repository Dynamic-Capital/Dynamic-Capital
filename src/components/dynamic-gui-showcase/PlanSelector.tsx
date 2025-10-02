import { type CSSProperties } from "react";

import { Column, Heading, Icon, Row, Tag, Text } from "@/components/dynamic-ui-system";

import type { PlanPreset } from "./types";

interface PlanSelectorProps {
  plans: PlanPreset[];
  activePlanId: string;
  onSelect: (planId: string) => void;
  panelStyle: CSSProperties;
  selectedPlan: PlanPreset;
}

export function PlanSelector({
  plans,
  activePlanId,
  onSelect,
  panelStyle,
  selectedPlan,
}: PlanSelectorProps) {
  return (
    <Column gap="24" fillWidth align="center">
      <Column gap="8" align="center">
        <Text variant="label-strong-s" onBackground="brand-medium">
          Choose a deposit lane
        </Text>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          align="center"
          wrap="balance"
        >
          Toggle between preset desk experiences to see how the Dynamic GUI adapts pricing, guardrails, and automation overlays.
        </Text>
      </Column>

      <Row gap="12" wrap horizontal="center">
        {plans.map((plan) => {
          const isActive = plan.id === activePlanId;

          return (
            <Column
              key={plan.id}
              as="button"
              type="button"
              onClick={() => onSelect(plan.id)}
              gap="12"
              background={isActive ? "brand-alpha-strong" : "neutral-alpha-weak"}
              border={isActive ? "brand-medium" : "neutral-alpha-weak"}
              radius="l"
              paddingX="20"
              paddingY="16"
              minWidth={18}
              fillWidth
              horizontal="start"
              data-active={isActive ? "true" : "false"}
              aria-pressed={isActive}
            >
              <Row gap="8" vertical="center">
                <Icon
                  name={plan.icon}
                  onBackground={isActive ? "brand-strong" : "brand-medium"}
                />
                <Column gap="4" horizontal="start">
                  <Text variant="label-strong-s" align="left">
                    {plan.name}
                  </Text>
                  <Text
                    variant="label-default-s"
                    onBackground={isActive ? "neutral-strong" : "neutral-weak"}
                    align="left"
                  >
                    {plan.focus}
                  </Text>
                </Column>
              </Row>
              <Row gap="8" wrap vertical="center" horizontal="start">
                <Tag size="s" background="neutral-alpha-weak">
                  {plan.price}
                </Tag>
                <Tag size="s" background="neutral-alpha-weak">
                  {plan.turnaround}
                </Tag>
                {plan.badge ? (
                  <Tag size="s" background="brand-alpha-weak">
                    {plan.badge}
                  </Tag>
                ) : null}
              </Row>
            </Column>
          );
        })}
      </Row>

      <Column
        background="surface"
        border="transparent"
        radius="xl"
        padding="l"
        gap="16"
        fillWidth
        style={panelStyle}
      >
        <Row gap="12" vertical="center">
          <Icon name={selectedPlan.icon} onBackground="brand-medium" />
          <Heading variant="heading-strong-m">{selectedPlan.name}</Heading>
        </Row>
        <Text variant="body-default-m" onBackground="neutral-weak">
          {selectedPlan.summary}
        </Text>
        <Column gap="8">
          {selectedPlan.benefits.map((benefit) => (
            <Row key={benefit} gap="8" vertical="center">
              <Icon name="check" onBackground="brand-medium" />
              <Text variant="body-default-s" onBackground="neutral-strong">
                {benefit}
              </Text>
            </Row>
          ))}
        </Column>
      </Column>
    </Column>
  );
}
