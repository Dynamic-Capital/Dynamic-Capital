import {
  Button,
  Column,
  Heading,
  Row,
  Text,
} from "@/components/dynamic-ui-system";

export function CheckoutCallout() {
  return (
    <Column
      fillWidth
      background="brand-alpha-weak"
      border="brand-alpha-medium"
      radius="l"
      padding="xl"
      gap="20"
      horizontal="center"
      align="center"
      style={{ textAlign: "center" }}
    >
      <Heading variant="display-strong-xs" wrap="balance">
        Checkout stays quick and transparent
      </Heading>
      <Text variant="body-default-l" onBackground="brand-weak" wrap="balance">
        Apply your promo code, load Lovable Live credits, and confirm your plan
        in a couple of minutes.
      </Text>
      <Row gap="12" wrap s={{ direction: "column" }}>
        <Button
          href="/checkout"
          size="m"
          variant="secondary"
          data-border="rounded"
          prefixIcon="rocket"
        >
          Go to checkout
        </Button>
        <Button
          href="#pool-trading"
          size="m"
          variant="secondary"
          data-border="rounded"
          arrowIcon
        >
          See pool trading
        </Button>
        <Button
          href="#vip-packages"
          size="m"
          variant="secondary"
          data-border="rounded"
          prefixIcon="gift"
        >
          View packages
        </Button>
      </Row>
    </Column>
  );
}

export default CheckoutCallout;
