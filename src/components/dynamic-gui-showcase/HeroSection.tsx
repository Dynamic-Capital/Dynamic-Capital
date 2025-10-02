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
          {brandName} · Dynamic GUI
        </Tag>
      </Row>
      <Heading variant="display-strong-s" align="center" wrap="balance">
        Compose deposit flows without touching a single spreadsheet.
      </Heading>
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
        Orchestrate onboarding, route payments, and verify proofs from one responsive workspace. Built for high-velocity desks that juggle bank, crypto, and prop channels.
      </Text>
      <Row gap="12" wrap horizontal="center">
        <Button
          size="m"
          variant="primary"
          data-border="rounded"
          prefixIcon="sparkles"
          onClick={onLaunchCheckout}
        >
          Launch checkout
        </Button>
        <Button
          size="m"
          variant="secondary"
          data-border="rounded"
          prefixIcon="calendar"
          onClick={onPreviewVip}
        >
          Preview VIP flow
        </Button>
      </Row>
    </Column>
  );
}
