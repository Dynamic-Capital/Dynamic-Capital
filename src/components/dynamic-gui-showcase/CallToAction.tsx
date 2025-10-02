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
        Ready to orchestrate your own Dynamic GUI?
      </Heading>
      <Text
        variant="body-default-m"
        onBackground="neutral-weak"
        align="center"
        wrap="balance"
      >
        Connect your preferred payment rails and let the workspace handle playbook routing, receipts, and compliance snapshots.
      </Text>
      <Row gap="12" wrap horizontal="center">
        <Button
          size="m"
          variant="primary"
          data-border="rounded"
          prefixIcon="sparkles"
          onClick={onStartOnboarding}
        >
          Start onboarding
        </Button>
        <Button
          size="m"
          variant="secondary"
          data-border="rounded"
          prefixIcon="repeat"
          onClick={onRequestWalkthrough}
        >
          Request a live walkthrough
        </Button>
      </Row>
    </Column>
  );
}
