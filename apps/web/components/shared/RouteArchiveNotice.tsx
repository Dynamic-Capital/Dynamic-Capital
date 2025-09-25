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

const TELEGRAM_LINK = social.find((item) => item.name === "Telegram")?.link ||
  "https://t.me/Dynamic_VIP_BOT";

const SUPPORT_EMAIL = `mailto:${person.email}`;

export function RouteArchiveNotice() {
  return (
    <Column
      as="section"
      fillWidth
      paddingY="80"
      paddingX="16"
      horizontal="center"
      align="center"
      gap="48"
    >
      <Column
        as="article"
        background="surface"
        border="neutral-alpha-medium"
        radius="xl"
        shadow="xl"
        padding="xl"
        gap="32"
        maxWidth="m"
        align="center"
        horizontal="center"
      >
        <Column gap="16" align="center">
          <Tag size="s" background="brand-alpha-weak" prefixIcon="repeat">
            Legacy route archived
          </Tag>
          <Heading variant="display-strong-s" align="center" wrap="balance">
            You&apos;ve reached a page that&apos;s been sunset.
          </Heading>
          <Text
            variant="body-default-l"
            onBackground="neutral-weak"
            align="center"
            wrap="balance"
          >
            Dynamic Capital recently streamlined navigation so the freshest
            trading workflows are front and center. The link you followed now
            points to a retired experience, but the updated destinations below
            will get you moving again.
          </Text>
        </Column>
        <Column
          background="brand-alpha-weak"
          border="brand-alpha-medium"
          radius="l"
          padding="l"
          gap="16"
          align="start"
        >
          <Text variant="label-default-s" onBackground="brand-strong">
            What&apos;s new in the hub
          </Text>
          <Text variant="body-default-m" onBackground="brand-strong">
            We merged duplicate surfaces and promoted the tools operators rely
            on daily. Here are the quickest pivots based on where most people
            land next:
          </Text>
          <Column as="ul" gap="12" align="start">
            <Row as="li" gap="12" vertical="start">
              <Icon name="home" onBackground="brand-strong" />
              <Text
                as="span"
                variant="body-default-m"
                onBackground="brand-strong"
              >
                Jump back to the <SmartLink href="/">home hub</SmartLink>{" "}
                for real-time playbooks, trading desk updates, and resource
                quick links.
              </Text>
            </Row>
            <Row as="li" gap="12" vertical="start">
              <Icon name="sparkles" onBackground="brand-strong" />
              <Text
                as="span"
                variant="body-default-m"
                onBackground="brand-strong"
              >
                Browse the <SmartLink href="/work">project library</SmartLink>
                {" "}
                to see how initiatives evolved and which blueprints replaced
                this view.
              </Text>
            </Row>
            <Row as="li" gap="12" vertical="start">
              <Icon name="telegram" onBackground="brand-strong" />
              <Text
                as="span"
                variant="body-default-m"
                onBackground="brand-strong"
              >
                Want the refreshed link? Ping the mentors inside{" "}
                <SmartLink href={TELEGRAM_LINK}>Telegram</SmartLink>{" "}
                for a personal redirect.
              </Text>
            </Row>
          </Column>
        </Column>
        <Column gap="20">
          <Text variant="label-default-s" onBackground="neutral-weak">
            Choose your next step
          </Text>
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
            <Button
              size="m"
              variant="secondary"
              data-border="rounded"
              href={SUPPORT_EMAIL}
            >
              Email support
            </Button>
          </Row>
        </Column>
        <Column
          background="neutral-alpha-weak"
          border="neutral-alpha-medium"
          radius="l"
          padding="l"
          gap="12"
          align="start"
        >
          <Text variant="label-default-s" onBackground="neutral-strong">
            Need a human handoff?
          </Text>
          <Text
            variant="body-default-m"
            onBackground="neutral-strong"
            wrap="balance"
          >
            Our support desk is staffed around the clock. Share the link you
            were expecting and we&apos;ll confirm the modern equivalent or set
            up a walkthrough.
          </Text>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Prefer email? Drop us a note at{" "}
            <SmartLink href={SUPPORT_EMAIL}>{person.email}</SmartLink>{" "}
            and we&apos;ll reroute you.
          </Text>
        </Column>
        <Line background="neutral-alpha-weak" />
        <Text
          variant="label-default-s"
          onBackground="neutral-weak"
          align="center"
          wrap="balance"
        >
          Last updated: April 2024. Bookmark the home hub for the latest
          rollouts and desk experiments.
        </Text>
      </Column>
    </Column>
  );
}

export default RouteArchiveNotice;
