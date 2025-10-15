import { Button, Column, Heading, Row, Text } from "@/components/dynamic-ui-system";

interface CallToActionProps {
  onStartOnboarding: () => void;
  onRequestWalkthrough: () => void;
}

export function CallToAction({
  onStartOnboarding,
  onRequestWalkthrough,
}: CallToActionProps) {
  return (
    <Column gap="12" align="center">
      <Heading variant="heading-strong-m" align="center" wrap="balance">
        Operate from a single, focused workspace.
      </Heading>
      <Text
        variant="body-default-m"
        onBackground="neutral-weak"
        align="center"
        wrap="balance"
      >
        Benchmark models, share context with your desk, and keep guardrails in view without juggling dashboards.
      </Text>
      <Row gap="12" wrap horizontal="center">
        <Button
          size="m"
          variant="primary"
          data-border="rounded"
          prefixIcon="sparkles"
          onClick={onStartOnboarding}
        >
          Start investor onboarding
        </Button>
        <Button
          size="m"
          variant="secondary"
          data-border="rounded"
          prefixIcon="repeat"
          onClick={onRequestWalkthrough}
        >
          Book a desk walkthrough
        </Button>
      </Row>
    </Column>
  );
}
