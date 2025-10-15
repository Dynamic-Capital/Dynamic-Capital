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
          {brandName} · Dynamic Chat
        </Tag>
      </Row>
      <Heading variant="display-strong-s" align="center" wrap="balance">
        Run your investor desk inside Dynamic Chat.
      </Heading>
      <Row gap="8" wrap horizontal="center">
        {["TON actions", "AI copilots", "Signal routing"].map((label) => (
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
        variant="label-default-s"
        onBackground="neutral-medium"
        align="center"
        wrap="balance"
      >
        Coordinate due diligence, execute TON treasury actions, and broadcast insights without hopping between dashboards.
      </Text>
      <Text
        variant="label-default-s"
        onBackground="neutral-medium"
        align="center"
        wrap="balance"
      >
        Benchmark models alongside Dynamic Chat, keep mentor guardrails visible, and deliver investor-ready context in one flow.
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
