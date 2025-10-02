import { type CSSProperties } from "react";

import { Column, Heading, Icon, Row, Text } from "@/components/dynamic-ui-system";

import type { WorkflowStep } from "./types";

interface WorkflowTimelineProps {
  steps: WorkflowStep[];
  activeStepIndex: number;
  onSelect: (index: number) => void;
  panelStyle: CSSProperties;
  activeStep: WorkflowStep;
}

export function WorkflowTimeline({
  steps,
  activeStepIndex,
  onSelect,
  panelStyle,
  activeStep,
}: WorkflowTimelineProps) {
  return (
    <Column gap="24" fillWidth align="center">
      <Column gap="8" align="center">
        <Text variant="label-strong-s" onBackground="brand-medium">
          End-to-end journey
        </Text>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          align="center"
          wrap="balance"
        >
          Every step is orchestrated inside the Dynamic GUI. Tap a stage to see how the workspace responds in real time.
        </Text>
      </Column>

      <Row gap="12" wrap horizontal="center">
        {steps.map((step, index) => {
          const isActive = index === activeStepIndex;

          return (
            <Column
              key={step.id}
              as="button"
              type="button"
              onClick={() => onSelect(index)}
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
                  name={step.icon}
                  onBackground={isActive ? "brand-strong" : "brand-medium"}
                />
                <Column gap="4" horizontal="start">
                  <Text variant="label-strong-s" align="left">
                    {step.title}
                  </Text>
                  <Text
                    variant="label-default-s"
                    onBackground={isActive ? "neutral-strong" : "neutral-weak"}
                    align="left"
                  >
                    {step.short}
                  </Text>
                </Column>
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
          <Icon name={activeStep.icon} onBackground="brand-medium" />
          <Heading variant="heading-strong-m">{activeStep.title}</Heading>
        </Row>
        <Text variant="body-default-m" onBackground="neutral-weak">
          {activeStep.description}
        </Text>
        <Column gap="8">
          {activeStep.highlights.map((highlight) => (
            <Row key={highlight} gap="8" vertical="center">
              <Icon name="check" onBackground="brand-medium" />
              <Text variant="body-default-s" onBackground="neutral-strong">
                {highlight}
              </Text>
            </Row>
          ))}
        </Column>
        <Text variant="label-default-s" onBackground="neutral-medium">
          {activeStep.tip}
        </Text>
      </Column>
    </Column>
  );
}
