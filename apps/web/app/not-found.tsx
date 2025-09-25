import {
  Button,
  Column,
  Heading,
  Icon,
  Line,
  Row,
  SmartLink,
  Tag,
  Text,
} from "@once-ui-system/core";
import { person, social } from "@/resources";

export const dynamic = "force-dynamic";

const TELEGRAM_LINK = social.find((item) => item.name === "Telegram")?.link ||
  "https://t.me/Dynamic_VIP_BOT";

const SUPPORT_EMAIL = `mailto:${person.email}`;

export default function NotFound() {
  return (
    <Column
      as="section"
      fillWidth
      paddingY="80"
      paddingX="16"
      horizontal="center"
      align="center"
      gap="40"
    >
      <Column
        as="article"
        background="surface"
        border="neutral-alpha-medium"
        radius="xl"
        shadow="l"
        padding="xl"
        gap="24"
        maxWidth="m"
        align="center"
        horizontal="center"
      >
        <Tag size="s" background="brand-alpha-weak" prefixIcon="repeat">
          Route archive notice
        </Tag>
        <Heading variant="display-strong-s" align="center">
          This surface moved during the brand refresh.
        </Heading>
        <Text
          variant="body-default-l"
          onBackground="neutral-weak"
          align="center"
          wrap="balance"
        >
          We slimmed down the surface area so operators land on the latest
          battle-tested flows. The link you hit now points to a retired screen
          from the identity update.
        </Text>
        <Line background="neutral-alpha-weak" />
        <Column as="ul" gap="16" align="start" maxWidth="s">
          <Row as="li" gap="12" vertical="start">
            <Icon name="home" onBackground="brand-medium" />
            <Text
              as="span"
              variant="body-default-m"
              onBackground="neutral-weak"
            >
              Jump back to the <SmartLink href="/">home hub</SmartLink>{" "}
              for current playbooks, plans, and desk context.
            </Text>
          </Row>
          <Row as="li" gap="12" vertical="start">
            <Icon name="sparkles" onBackground="brand-medium" />
            <Text
              as="span"
              variant="body-default-m"
              onBackground="neutral-weak"
            >
              Browse the <SmartLink href="/work">project library</SmartLink>
              {" "}
              to track how the desk is evolving and where brand shifts started.
            </Text>
          </Row>
          <Row as="li" gap="12" vertical="start">
            <Icon name="telegram" onBackground="brand-medium" />
            <Text
              as="span"
              variant="body-default-m"
              onBackground="neutral-weak"
            >
              Need a direct pointer? Ping the mentors inside{" "}
              <SmartLink href={TELEGRAM_LINK}>Telegram</SmartLink>{" "}
              and we&apos;ll drop the refreshed link.
            </Text>
          </Row>
        </Column>
        <Row gap="12" wrap horizontal="center">
          <Button size="m" variant="primary" data-border="rounded" href="/">
            Back to home
          </Button>
          <Button
            size="m"
            variant="secondary"
            data-border="rounded"
            prefixIcon="telegram"
            href={TELEGRAM_LINK}
          >
            Message the desk
          </Button>
        </Row>
        <Text
          variant="label-default-s"
          onBackground="neutral-weak"
          align="center"
        >
          Prefer email? Drop us a note at{" "}
          <SmartLink href={SUPPORT_EMAIL}>{person.email}</SmartLink>{" "}
          and we&apos;ll reroute you.
        </Text>
      </Column>
    </Column>
  );
}
