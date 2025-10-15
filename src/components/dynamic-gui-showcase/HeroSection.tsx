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
          {brandName} · Investor desk
        </Tag>
      </Row>
      <Heading variant="display-strong-s" align="center" wrap="balance">
        Start with Dynamic Chat.
      </Heading>
      <Row gap="8" wrap horizontal="center">
        {["TON", "AI", "Signals"].map((label) => (
          <Tag key={label} size="s" background="neutral-alpha-weak">
            {label}
          </Tag>
        ))}
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
        variant="body-default-m"
        onBackground="neutral-weak"
        align="center"
        wrap="balance"
      >
        Operate from a single, focused workspace.
      </Text>
      <Text
        variant="label-default-s"
        onBackground="neutral-medium"
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
          onClick={onLaunchCheckout}
        >
          Launch Dynamic Chat
        </Button>
        <Button
          size="m"
          variant="secondary"
          data-border="rounded"
          prefixIcon="calendar"
          onClick={onPreviewVip}
        >
          Preview VIP plans
        </Button>
      </Row>
    </Column>
  );
}
