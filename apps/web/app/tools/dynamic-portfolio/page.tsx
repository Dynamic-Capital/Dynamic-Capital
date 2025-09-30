import type { ComponentProps, ReactNode } from "react";

import {
  Button,
  Column,
  Heading,
  Icon,
  Row,
  Schema,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";

import { VipPlansPricingSection } from "@/components/dynamic-portfolio/home/VipPlansPricingSection";
import { VipPackagesSection } from "@/components/dynamic-portfolio/home/VipPackagesSection";
import { CheckoutCallout } from "@/components/dynamic-portfolio/home/CheckoutCallout";
import { about, baseURL, person, toAbsoluteUrl } from "@/resources";
import styles from "@/components/dynamic-portfolio/DynamicCapitalLandingPage.module.scss";
import { cn } from "@/utils";

const pageTitle = "Investor desk – Dynamic Capital";
const pageDescription =
  "Simple investor desk overview with copy trading, decentralized withdrawal, and quick-start guidance.";
const pagePath = "/tools/dynamic-portfolio";

const HIGHLIGHTS = [
  {
    icon: "sparkles" as const,
    title: "Copy trades instantly",
    body: "Link your broker once and mirror mentor trades in a click.",
  },
  {
    icon: "shield" as const,
    title: "Withdraw on-chain",
    body: "Plan exits with decentralized releases you control.",
  },
  {
    icon: "refresh" as const,
    title: "Credits that recharge",
    body: "Top up DCT (Dynamic Capital Tokens) anytime for chat and automations.",
  },
];

const QUICK_STEPS = [
  {
    step: "1",
    title: "Load credits",
    description: "Activate checkout, apply the auto promo code, and load DCT.",
  },
  {
    step: "2",
    title: "Connect accounts",
    description:
      "Sync the trading app you use so signals flow in automatically.",
  },
  {
    step: "3",
    title: "Copy or learn",
    description:
      "Follow the pool, copy trades, or study the plays at your pace.",
  },
];

type ColumnBackground = ComponentProps<typeof Column>["background"];
type ColumnBorder = ComponentProps<typeof Column>["border"];

interface SectionProps {
  children: ReactNode;
  background?: ColumnBackground;
  border?: ColumnBorder;
  anchor?: string;
}

function Section({ children, background, border, anchor }: SectionProps) {
  return (
    <Column
      as="section"
      id={anchor}
      data-section-anchor={anchor}
      fillWidth
      background={background}
      border={border}
      radius="l"
      padding="xl"
      gap="24"
      className={cn(styles.section, styles.sectionCompact)}
    >
      {children}
    </Column>
  );
}

function HighlightCard({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <Column
      gap="12"
      background="brand-alpha-weak"
      border="brand-alpha-medium"
      radius="l"
      padding="l"
      minWidth={18}
      flex={1}
    >
      <Icon name={icon} onBackground="brand-medium" />
      <Heading variant="heading-strong-s">{title}</Heading>
      <Text variant="body-default-m" onBackground="brand-weak">
        {body}
      </Text>
    </Column>
  );
}

export const metadata = {
  title: pageTitle,
  description: pageDescription,
};

export default function InvestorDeskPage() {
  return (
    <Column
      as="main"
      fillWidth
      gap="xl"
      horizontal="center"
      className={styles.page}
    >
      <Schema
        as="webPage"
        baseURL={baseURL}
        path={pagePath}
        title={pageTitle}
        description={pageDescription}
        image={`/api/og/generate?title=${encodeURIComponent(pageTitle)}`}
        author={{
          name: person.name,
          url: `${baseURL}${about.path}`,
          image: toAbsoluteUrl(baseURL, person.avatar),
        }}
      />

      <Section anchor="hero">
        <Column gap="16" align="start">
          <Tag size="s" prefixIcon="users">
            Investor desk
          </Tag>
          <Heading variant="display-strong-s" wrap="balance">
            Simple copy trading for investors and beginners
          </Heading>
          <Text
            variant="body-default-l"
            onBackground="neutral-weak"
            wrap="balance"
          >
            Learn the desk in minutes, copy trades when ready, and withdraw on
            your own schedule.
          </Text>
          <Row gap="12" s={{ direction: "column" }}>
            <Button
              size="m"
              variant="secondary"
              data-border="rounded"
              prefixIcon="rocket"
              href="/checkout"
            >
              Start in checkout
            </Button>
            <Button
              size="m"
              variant="secondary"
              data-border="rounded"
              arrowIcon
              href="#pricing"
            >
              View plans
            </Button>
          </Row>
        </Column>
        <Row gap="16" wrap>
          {HIGHLIGHTS.map((item) => (
            <HighlightCard
              key={item.title}
              {...item}
            />
          ))}
        </Row>
      </Section>

      <Section
        anchor="steps"
        background="surface"
        border="neutral-alpha-medium"
      >
        <Column gap="12">
          <Heading variant="heading-strong-l">Three quick steps</Heading>
          <Text
            variant="body-default-m"
            onBackground="neutral-weak"
            wrap="balance"
          >
            A short path keeps traders, investors, and learners aligned.
          </Text>
        </Column>
        <Row gap="16" wrap>
          {QUICK_STEPS.map((item) => (
            <Column
              key={item.title}
              gap="8"
              flex={1}
              minWidth={18}
              background="neutral-alpha-weak"
              border="neutral-alpha-medium"
              radius="l"
              padding="l"
            >
              <Text variant="body-default-s" onBackground="brand-medium">
                Step {item.step}
              </Text>
              <Heading variant="heading-strong-s">{item.title}</Heading>
              <Text variant="body-default-m" onBackground="neutral-weak">
                {item.description}
              </Text>
            </Column>
          ))}
        </Row>
      </Section>

      <Section
        anchor="pricing"
        background="surface"
        border="neutral-alpha-medium"
      >
        <Column gap="12">
          <Heading variant="heading-strong-l">Pricing & packages</Heading>
          <Text
            variant="body-default-m"
            onBackground="neutral-weak"
            wrap="balance"
          >
            Plans adapt to the algorithms you follow. Recharge DCT whenever you
            need more chat or automation time.
          </Text>
        </Column>
        <VipPlansPricingSection />
        <VipPackagesSection />
        <CheckoutCallout />
      </Section>
    </Column>
  );
}
