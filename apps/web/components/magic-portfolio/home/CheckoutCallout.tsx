import { Button, Column, Heading, Row, Text } from "@/components/dynamic-ui-system";

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
        Activate your Dynamic desk in minutes
      </Heading>
      <Text variant="body-default-l" onBackground="brand-weak" wrap="balance">
        Finish checkout in under two minutes and step into live signals,
        automation recipes, and the mentor calendar.
      </Text>
      <Row gap="12" s={{ direction: "column" }}>
        <Button
          href="/checkout"
          size="m"
          variant="secondary"
          data-border="rounded"
          prefixIcon="rocket"
        >
          Complete secure checkout
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
