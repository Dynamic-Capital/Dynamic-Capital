import { Button, Column, Heading, Row, Text } from "@once-ui-system/core";

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
        Ready to activate the desk?
      </Heading>
      <Text variant="body-default-l" onBackground="brand-weak" wrap="balance">
        Move through checkout in under two minutes and gain access to the
        real-time signal desk, vault of trading systems, and live mentorship
        calendar.
      </Text>
      <Row gap="12" s={{ direction: "column" }}>
        <Button
          href="/checkout"
          size="m"
          variant="secondary"
          data-border="rounded"
          prefixIcon="rocket"
        >
          Go to secure checkout
        </Button>
        <Button
          href="#pool-trading"
          size="m"
          variant="secondary"
          data-border="rounded"
          arrowIcon
        >
          Review pool trading options
        </Button>
      </Row>
    </Column>
  );
}

export default CheckoutCallout;
