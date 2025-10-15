import { Button, Column, Heading, Pulse, Row, Tag, Text } from "@/components/dynamic-ui-system";

interface HeroSectionProps {
  brandName: string;
  brandTagline: string;
  onLaunchCheckout: () => void;
  onPreviewVip: () => void;
}

export function HeroSection({
  brandName,
  brandTagline,
  onLaunchCheckout,
  onPreviewVip,
}: HeroSectionProps) {
  return (
    <Column gap="16" align="center">
      <Row gap="12" vertical="center" horizontal="center">
        <Pulse size="s" variant="brand" aria-hidden="true" />
        <Tag size="s" background="brand-alpha-weak" prefixIcon="sparkles">
          {brandName} · Dynamic Chat desk
        </Tag>
      </Row>
      <Heading variant="display-strong-s" align="center" wrap="balance">
        Operate your investor desk without leaving Dynamic Chat.
      </Heading>
      <Row gap="8" wrap horizontal="center">
        {["Investor onboarding", "TON automations", "Mentor guardrails"].map(
          (label) => (
            <Tag key={label} size="s" background="neutral-alpha-weak">
              {label}
            </Tag>
          ),
        )}
      </Row>
      <Text
        variant="body-default-m"
        onBackground="neutral-weak"
        align="center"
        wrap="balance"
      >
        {brandTagline}
      </Text>
      <Text
        variant="label-default-s"
        onBackground="neutral-medium"
        align="center"
        wrap="balance"
      >
        Coordinate diligence, treasury actions, and signal reviews from a single workspace.
      </Text>
      <Row gap="12" wrap horizontal="center">
        <Button
          size="m"
          variant="primary"
          data-border="rounded"
          prefixIcon="sparkles"
          onClick={onLaunchCheckout}
        >
          Get started
        </Button>
        <Button
          size="m"
          variant="secondary"
          data-border="rounded"
          prefixIcon="calendar"
          onClick={onPreviewVip}
        >
          Explore VIP plans
        </Button>
      </Row>
    </Column>
  );
}
