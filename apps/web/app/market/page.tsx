import {
  Column,
  Heading,
  Icon,
  Line,
  Row,
  Schema,
  Tag,
  Text,
} from "@once-ui-system/core";
import type { Colors } from "@once-ui-system/core";

import { baseURL, market, person, toAbsoluteUrl } from "@/resources";

type TagBackground = Colors | "page" | "surface" | "overlay" | "transparent";

type ForexHighlight = {
  label: string;
  detail: string;
  background: TagBackground;
  icon: string;
};

type ForexSection = {
  title: string;
  badge?: {
    label: string;
    icon: string;
    background: TagBackground;
  };
  description: string;
  highlights: ForexHighlight[];
  bullets: string[];
  footer?: string;
};

const FOREX_SECTIONS: ForexSection[] = [
  {
    title: "Market Snapshot",
    badge: {
      label: "London session focus",
      icon: "clock",
      background: "brand-alpha-weak",
    },
    description:
      "Live majors feed pulled from FXCM paints a constructive tone with the dollar easing as European data beats expectations.",
    highlights: [
      {
        label: "EUR/USD",
        detail: "1.0852 · +0.32%",
        background: "brand-alpha-weak",
        icon: "sparkles",
      },
      {
        label: "USD/JPY",
        detail: "147.20 · −0.45%",
        background: "danger-alpha-weak",
        icon: "repeat",
      },
      {
        label: "GBP/USD",
        detail: "1.2760 · −0.18%",
        background: "neutral-alpha-weak",
        icon: "globe",
      },
    ],
    bullets: [
      "Desk is leaning into euro strength while soft US PMI numbers keep rate expectations capped below 4.20% on the 10Y.",
      "Automation trims USD/JPY shorts into 147.00 liquidity but reloads if price fails to reclaim the 147.80 supply shelf.",
      "Sterling stays on the sell radar; macro team wants daily closes beneath 1.2800 to maintain the broader short bias.",
    ],
    footer:
      "Execution remains nimble with partial profit alerts staged just ahead of the New York overlap where volatility typically spikes.",
  },
  {
    title: "Currency Strength",
    badge: {
      label: "FXCM strength index",
      icon: "sparkles",
      background: "neutral-alpha-weak",
    },
    description:
      "Normalized momentum scores highlight where capital is rotating. Strength prints under −1 warn of fading demand while readings above +1 confirm sustained inflows.",
    highlights: [
      {
        label: "USD",
        detail: "−1.6 · Weak",
        background: "danger-alpha-weak",
        icon: "repeat",
      },
      {
        label: "EUR",
        detail: "+1.9 · Strong",
        background: "brand-alpha-weak",
        icon: "sparkles",
      },
      {
        label: "JPY",
        detail: "+0.7 · Building",
        background: "brand-alpha-weak",
        icon: "check",
      },
    ],
    bullets: [
      "Dollar softness aligns with falling US yields; we prioritise risk-on rotations into EUR crosses while USD stays below the zero-line.",
      "Euro strength is driven by better services PMIs and hawkish commentary out of the ECB, warranting continued dip-buying posture.",
      "Yen momentum is improving but not yet extreme—carry desks keep sizing lighter while watching for a confirmed break higher.",
    ],
    footer:
      "Strength dashboard updates every 15 minutes and feeds directly into the position-sizing matrix traders see inside the VIP workspace.",
  },
  {
    title: "Currency Heat Map",
    badge: {
      label: "24h cross performance",
      icon: "globe",
      background: "brand-alpha-weak",
    },
    description:
      "Pairwise returns help identify where relative value is accelerating. Green cells mark opportunities to compound trend trades, while red cells flag exhaustion or reversal risk.",
    highlights: [
      {
        label: "EUR strength",
        detail: "Broad gains vs USD, GBP, CAD",
        background: "brand-alpha-weak",
        icon: "sparkles",
      },
      {
        label: "USD lagging",
        detail: "Negative vs majors except CHF",
        background: "danger-alpha-weak",
        icon: "repeat",
      },
      {
        label: "AUD rotation",
        detail: "Recovering alongside metals",
        background: "neutral-alpha-weak",
        icon: "check",
      },
    ],
    bullets: [
      "Cross heat confirms EUR outperformance; we scale into EUR/AUD continuation while the matrix stays predominantly green.",
      "USD weakness remains broad-based—only CHF offers a modest offset, keeping defensive hedges pointed at safe-haven flows.",
      "Commodity bloc heat map tiles turning positive signal a re-entry window for AUD longs alongside the metals desk.",
    ],
    footer:
      "Heat map snapshots are archived hourly so analysts can review regime shifts and annotate playbooks for mentoring sessions.",
  },
  {
    title: "Currency Volatility",
    badge: {
      label: "ATR vs 30-day baseline",
      icon: "repeat",
      background: "neutral-alpha-weak",
    },
    description:
      "We track rolling ATR multiples to calibrate stops and profit targets. Elevated multiples trigger automatic tightening on new entries to guard against whipsaws.",
    highlights: [
      {
        label: "GBP/USD",
        detail: "1.3× · Elevated",
        background: "danger-alpha-weak",
        icon: "repeat",
      },
      {
        label: "USD/JPY",
        detail: "0.9× · Cooling",
        background: "neutral-alpha-weak",
        icon: "globe",
      },
      {
        label: "EUR/USD",
        detail: "1.1× · Steady",
        background: "brand-alpha-weak",
        icon: "sparkles",
      },
    ],
    bullets: [
      "Sterling volatility remains above trend; trade sizing stays half normal with alerts ready to re-engage once ATR mean reverts.",
      "USD/JPY calm allows for slightly wider scaling grid, but automation still respects BoJ commentary risk headlines.",
      "Euro volatility is balanced, giving us confidence to run the standard risk template on EUR-centric strategies.",
    ],
    footer:
      "Volatility monitor feeds into the Telegram bot so members receive instant nudges when conditions demand updated risk rules.",
  },
  {
    title: "Market Movers",
    badge: {
      label: "Desk priority tape",
      icon: "sparkles",
      background: "brand-alpha-weak",
    },
    description:
      "Macro catalysts that triggered flow adjustments in the last trading day. Each entry captures the read-through for positioning and the action we took inside the trading room.",
    highlights: [
      {
        label: "US PMI miss",
        detail: "Services 52.0 vs 53.4 exp",
        background: "danger-alpha-weak",
        icon: "repeat",
      },
      {
        label: "ECB speakers",
        detail: "Hawkish tone reinforced",
        background: "brand-alpha-weak",
        icon: "sparkles",
      },
      {
        label: "BOJ comments",
        detail: "Officials comfortable with yen gains",
        background: "neutral-alpha-weak",
        icon: "check",
      },
    ],
    bullets: [
      "US PMI miss kept the dollar ask-heavy; we cycled into more EUR/USD exposure and unwound late-session USD/CAD longs.",
      "ECB commentary leaned hawkish, giving room to extend EUR strength themes while keeping stops disciplined under key swing lows.",
      "BoJ officials signalled tolerance for yen appreciation, prompting us to leave protective USD/JPY calls in place for another session.",
    ],
    footer:
      "Every mover is archived with execution notes so VIP members can replay the tape and understand why the desk shifted bias.",
  },
];

export const metadata = {
  title: market.title,
  description: market.description,
};

export default function MarketPage() {
  return (
    <Column gap="40" paddingY="40" horizontal="center" align="center" fillWidth>
      <Schema
        as="webPage"
        baseURL={baseURL}
        path={market.path}
        title={market.title}
        description={market.description}
        image={market.image}
        author={{
          name: person.name,
          url: `${baseURL}${market.path}`,
          image: toAbsoluteUrl(baseURL, person.avatar),
        }}
      />
      <Column gap="16" align="center" horizontal="center" maxWidth={36}>
        <Tag size="s" background="brand-alpha-weak" prefixIcon="globe">
          Forex coverage
        </Tag>
        <Heading variant="display-strong-s" align="center">
          Market intelligence hub
        </Heading>
        <Row gap="8" wrap horizontal="center" align="center">
          <Tag size="s" background="neutral-alpha-weak" prefixIcon="document">
            Source: FXCM institutional feed
          </Tag>
          <Tag size="s" background="neutral-alpha-weak" prefixIcon="repeat">
            Updated every 15 minutes
          </Tag>
        </Row>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          align="center"
        >
          Our analysts synthesise FXCM data into actionable plans so members
          always know where liquidity, momentum, and risk are evolving across
          the major currency pairs.
        </Text>
      </Column>
      <Column gap="24" maxWidth="m" fillWidth>
        {FOREX_SECTIONS.map((section, index) => (
          <Column
            key={section.title}
            background="surface"
            border="neutral-alpha-medium"
            radius="l"
            padding="xl"
            gap="24"
            shadow="l"
          >
            <Column gap="12">
              <Row horizontal="between" wrap gap="12" align="start">
                <Heading variant="heading-strong-l">{section.title}</Heading>
                {section.badge
                  ? (
                    <Tag
                      size="s"
                      background={section.badge.background}
                      prefixIcon={section.badge.icon}
                    >
                      {section.badge.label}
                    </Tag>
                  )
                  : null}
              </Row>
              <Text variant="body-default-m" onBackground="neutral-weak">
                {section.description}
              </Text>
            </Column>
            {section.highlights.length > 0
              ? (
                <Row gap="8" wrap>
                  {section.highlights.map((highlight) => (
                    <Tag
                      key={`${section.title}-${highlight.label}`}
                      size="s"
                      background={highlight.background}
                      prefixIcon={highlight.icon}
                    >
                      {highlight.label}: {highlight.detail}
                    </Tag>
                  ))}
                </Row>
              )
              : null}
            <Column as="ul" gap="12">
              {section.bullets.map((bullet, bulletIndex) => (
                <Row
                  key={`${section.title}-bullet-${bulletIndex}`}
                  gap="8"
                  vertical="start"
                >
                  <Icon name="sparkles" onBackground="brand-medium" />
                  <Text as="li" variant="body-default-m">
                    {bullet}
                  </Text>
                </Row>
              ))}
            </Column>
            {section.footer
              ? (
                <Row
                  background="brand-alpha-weak"
                  border="brand-alpha-medium"
                  radius="l"
                  padding="16"
                  gap="12"
                  vertical="start"
                >
                  <Icon name="document" onBackground="brand-strong" />
                  <Text variant="body-default-s">{section.footer}</Text>
                </Row>
              )
              : null}
            {index < FOREX_SECTIONS.length - 1
              ? <Line background="neutral-alpha-weak" />
              : null}
          </Column>
        ))}
      </Column>
    </Column>
  );
}
