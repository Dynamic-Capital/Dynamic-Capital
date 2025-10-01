"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  Button,
  Column,
  Heading,
  Icon,
  RevealFx,
  Row,
  Schema,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import { HOME_NAV_SECTION_IDS } from "@/components/landing/home-navigation-config";
import { cn } from "@/utils";
import { baseURL, person } from "@/resources";

const HERO_BADGES = [
  { icon: "sparkles" as const, label: "AI-managed strategies" },
  { icon: "globe" as const, label: "Dhivehi + English updates" },
  { icon: "shield" as const, label: "Supabase transparency" },
];

const CTA_LINKS = {
  telegram: "https://t.me/dynamiccapital", // replace with production invite when ready
  invest: "https://dynamic-capital.ondigitalocean.app/app",
  learn: "#academy",
};

const TOKEN_FEATURES = [
  {
    title: "Automated token burns",
    description:
      "Scheduled burn events tied to strategy performance keep supply scarce and align incentives with long-term holders.",
    icon: "flame" as const,
  },
  {
    title: "Rewards that mirror desk profits",
    description:
      "Portfolio gains recycle into staking rewards so active investors and community contributors share the upside.",
    icon: "coins" as const,
  },
  {
    title: "On-chain and Supabase reporting",
    description:
      "Live treasury snapshots and Supabase-backed audit trails make every burn, reward, and transfer traceable.",
    icon: "file-check" as const,
  },
];

const WALLET_FEATURES = [
  {
    title: "TonConnect onboarding",
    description:
      "Investors connect Tonkeeper, MyTonWallet, or Tonhub in seconds through the Mini App without leaving Telegram.",
    icon: "sparkles" as const,
  },
  {
    title: "Supabase-synced ledger",
    description:
      "Linked addresses flow into Supabase so staking rewards, VIP access, and automation triggers stay consistent across surfaces.",
    icon: "repeat" as const,
  },
  {
    title: "Automation ready",
    description:
      "Auto-invest pools and subscription webhooks read the wallet table directly to approve desk allocations in real time.",
    icon: "rocket" as const,
  },
] as const;

const WALLET_GUARDRAILS = [
  "Row Level Security ensures only verified Telegram IDs can read or update wallet entries.",
  "Background reconciliation catches deposits that land in the wrong address before credits are issued.",
  "Admins can revoke or rotate wallets from the desk console with a complete audit trail.",
] as const;

const MARKET_WIDGETS = [
  {
    symbol: "OANDA:XAUUSD",
    title: "Gold desk (XAU/USD)",
    description:
      "Monitor macro-driven hedges and metal-backed positions alongside AI signals.",
  },
  {
    symbol: "OANDA:EURUSD",
    title: "Forex momentum (EUR/USD)",
    description:
      "See currency desk moves, spreads, and short-term volatility in real time.",
  },
  {
    symbol: "BINANCE:BTCUSDT",
    title: "Crypto rotations (BTC/USDT)",
    description:
      "Track treasury hedges and spot-to-derivative rotations across major pairs.",
  },
];

const FORECAST_HERO = {
  tag: "Global forecasts",
  heading: "Forecast coverage for 30,000 markets",
  description:
    "Access forecasts for 30,000 financial markets and 4,000+ key economic indicators covering the next four quarters or the next three years.",
  updateNote:
    "Our proprietary macroeconomic model fuses analyst insight, cross-country correlations, and logical indicator relationships, refreshing forecasts as soon as new data prints.",
} as const;

const FORECAST_HIGHLIGHTS = [
  "Quarterly and three-year outlooks across global asset classes.",
  "4,000+ macro indicators linked through cross-country correlations.",
  "Continuously updated whenever new economic data is released.",
] as const;

const FORECAST_CATEGORIES = [
  {
    label: "Countries",
    description: "Growth, inflation, and policy paths for 150+ economies.",
  },
  {
    label: "Indicators",
    description:
      "Leading, coincident, and lagging signals that shape strategy.",
  },
  {
    label: "Commodities",
    description:
      "Energy, metals, and agricultural curves tied to supply shifts.",
  },
  {
    label: "Indexes",
    description: "Equity and volatility benchmarks synced to macro drivers.",
  },
  {
    label: "Currencies",
    description: "FX crosses modeled on rate differentials and trade balances.",
  },
  {
    label: "Crypto",
    description:
      "Digital asset trajectories bridging on-chain and macro flows.",
  },
  {
    label: "Bonds",
    description: "Sovereign and credit curves linked to inflation and growth.",
  },
] as const;

const COMMUNITY_MESSAGES = {
  dhivehi:
    "ޑައިނެމިކް ކެޕިޓަލް ކޮމިޔުނިޓީގައި އެންމެންޓްސް، ޓްރެޑިންގް ސިގްނަލްސް، ޓްރެޖަރީ ޑޭޓާ ދުވަހުގެ އިތުރަށް ދިމާދުގައި ބަލާލެއްވުން.",
  english:
    "Investors, partners, and regulators view a single source of truth for burns, rewards, and strategy updates.",
};

const MINI_APP_FEATURES = [
  "Real-time P&L with profit, loss, and cash balance summaries.",
  "Latest AI-generated trade signals with execution context.",
  "Stake DCT, review vesting, and inspect treasury inflows/outflows.",
  "Instant language toggle between Dhivehi and English.",
];

const API_ENDPOINTS = [
  {
    path: "/api/tradingview/webhook",
    description:
      "Ingest TradingView alerts directly into the orchestration layer.",
  },
  {
    path: "/api/telegram/webhook",
    description:
      "Keep Telegram bot conversations and Mini App actions in sync.",
  },
  {
    path: "/api/treasury",
    description: "Expose live token burns, rewards, and staking analytics.",
  },
  {
    path: "/api/user/:id",
    description:
      "Serve Supabase-backed investor profiles and portfolio data securely.",
  },
];

const ADMIN_ACTIONS = [
  "Launch or pause trading strategies with granular guardrails.",
  "Approve local MVR ⇄ USDT settlements without leaving the console.",
  "Review user KYC, staking commitments, and community roles.",
];

const ADVANTAGES = [
  "One SSL-secured domain houses marketing, Mini App, and APIs.",
  "SEO-friendly landing page while investor tooling stays private inside Telegram.",
  "Supabase backend synchronises every surface so the community sees the same ledger as the desk.",
  "Modular architecture makes it easy to add Academy, Governance, or Events sections when you are ready.",
];

const HERO_TITLE = "Maldives’ First AI-Powered Trading Ecosystem";
const HERO_DESCRIPTION =
  "Dynamic Capital unifies public storytelling, investor dashboards, and trading infrastructure on a single secure domain.";

const SCHEMA_TITLE =
  "Dynamic Capital — Maldives’ First AI-Powered Trading Ecosystem";
const SCHEMA_DESCRIPTION =
  "Discover the Dynamic Capital platform: AI-powered trading strategies, DCT token transparency, Telegram Mini App, and APIs.";

const TRADING_VIEW_SCRIPT_SRC = "https://s3.tradingview.com/tv.js";

let tradingViewScriptPromise: Promise<void> | null = null;

function loadTradingViewScript() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.TradingView) {
    return Promise.resolve();
  }

  if (!tradingViewScriptPromise) {
    tradingViewScriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = TRADING_VIEW_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Failed to load TradingView charts"));
      document.body.appendChild(script);
    }).catch((error) => {
      tradingViewScriptPromise = null;
      throw error;
    });
  }

  return tradingViewScriptPromise;
}

declare global {
  interface Window {
    TradingView?: {
      widget: (config: TradingViewWidgetConfig) => void;
    };
  }
}

interface TradingViewWidgetConfig {
  container_id: string;
  symbol: string;
  interval?: string;
  timezone?: string;
  theme?: "light" | "dark";
  style?: string;
  locale?: string;
  enable_publishing?: boolean;
  hide_legend?: boolean;
  hide_side_toolbar?: boolean;
  hide_top_toolbar?: boolean;
  allow_symbol_change?: boolean;
  autosize?: boolean;
  studies?: string[];
}

interface TradingViewWidgetProps {
  symbol: string;
  title: string;
  description: string;
  interval?: string;
}

function TradingViewWidget(
  { symbol, title, description, interval = "60" }: TradingViewWidgetProps,
) {
  const slug = useMemo(
    () => symbol.replace(/[^a-z0-9]/gi, "-").toLowerCase(),
    [symbol],
  );
  const reactId = useId();
  const containerId = useMemo(
    () => `tradingview-${slug}-${reactId.replace(/[:]/g, "-")}`,
    [reactId, slug],
  );
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isActive = true;
    const containerElement = containerRef.current;

    if (typeof window === "undefined") {
      return () => {
        isActive = false;
      };
    }

    setError(null);
    loadTradingViewScript()
      .then(() => {
        if (!isActive || !window.TradingView) {
          return;
        }

        window.TradingView.widget({
          container_id: containerId,
          symbol,
          interval,
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          enable_publishing: false,
          hide_legend: false,
          hide_top_toolbar: false,
          hide_side_toolbar: true,
          allow_symbol_change: false,
          autosize: true,
        });
      })
      .catch(() => {
        if (isActive) {
          setError("Live chart unavailable right now");
        }
      });

    return () => {
      isActive = false;
      if (containerElement) {
        containerElement.innerHTML = "";
      }
    };
  }, [containerId, interval, symbol]);

  return (
    <Column
      padding="20"
      gap="16"
      radius="l"
      background="surface"
      border="neutral-alpha-weak"
      data-border="rounded"
      className="flex-1 min-w-[260px] bg-background/70 shadow-lg shadow-primary/5"
    >
      <Column gap="8">
        <Text
          variant="label-default-s"
          onBackground="brand-medium"
          className="uppercase tracking-[0.18em]"
        >
          Live market feed
        </Text>
        <Heading variant="heading-strong-s">{title}</Heading>
        <Text
          variant="body-default-s"
          onBackground="neutral-weak"
          wrap="balance"
        >
          {description}
        </Text>
      </Column>
      <div className="tradingview-widget-container w-full">
        <div
          id={containerId}
          ref={containerRef}
          className="h-64 w-full rounded-xl border border-border/60 bg-gradient-to-br from-background/60 via-background/40 to-background/60"
        />
      </div>
      {error
        ? (
          <Text variant="body-default-xs" onBackground="neutral-weak">
            {error}
          </Text>
        )
        : null}
    </Column>
  );
}

interface SectionProps {
  anchor: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

function Section({ anchor, children, className, delay }: SectionProps) {
  return (
    <RevealFx translateY="16" delay={delay}>
      <section
        id={anchor}
        data-section-anchor={anchor}
        className={cn("w-full", className)}
      >
        <Column fillWidth gap="24" paddingX="16" className="mx-auto max-w-6xl">
          {children}
        </Column>
      </section>
    </RevealFx>
  );
}

export function MultiLlmLandingPage() {
  return (
    <Column
      as="main"
      fillWidth
      gap="64"
      align="start"
      horizontal="center"
      className="mx-auto w-full"
    >
      <Schema
        as="webPage"
        baseURL={baseURL}
        path="/"
        title={SCHEMA_TITLE}
        description={SCHEMA_DESCRIPTION}
        image={`/api/og/generate?title=${encodeURIComponent(SCHEMA_TITLE)}`}
        author={{
          name: person.name,
          url: `${baseURL}/about`,
          image: person.avatar,
        }}
      />

      <Section anchor={HOME_NAV_SECTION_IDS.overview}>
        <Column gap="32" paddingTop="40" className="text-center sm:text-left">
          <Column gap="16" horizontal="center" className="text-center">
            <Heading
              variant="heading-strong-l"
              className="max-w-3xl text-balance text-4xl sm:text-5xl"
            >
              {HERO_TITLE}
            </Heading>
            <Text
              variant="body-default-m"
              onBackground="neutral-weak"
              wrap="balance"
              className="max-w-2xl"
            >
              {HERO_DESCRIPTION}
            </Text>
          </Column>
          <Row
            gap="12"
            wrap
            horizontal="center"
            className="justify-center gap-3"
          >
            {HERO_BADGES.map((badge) => (
              <Row
                key={badge.label}
                gap="8"
                paddingX="12"
                paddingY="8"
                radius="l"
                border="brand-alpha-weak"
                background="surface"
                horizontal="center"
                vertical="center"
                data-border="rounded"
                className="shadow-md shadow-brand/10"
              >
                <Icon name={badge.icon} size="s" />
                <Text variant="body-default-s" onBackground="neutral-strong">
                  {badge.label}
                </Text>
              </Row>
            ))}
          </Row>
          <Row gap="16" wrap horizontal="center" className="gap-4">
            <Button
              size="m"
              href={CTA_LINKS.telegram}
              target="_blank"
              rel="noreferrer"
              variant="primary"
              data-border="rounded"
              arrowIcon
            >
              Join Telegram
            </Button>
            <Button
              size="m"
              href={CTA_LINKS.invest}
              variant="secondary"
              data-border="rounded"
            >
              Invest now
            </Button>
            <Button
              size="m"
              href={CTA_LINKS.learn}
              variant="tertiary"
              data-border="rounded"
            >
              Learn more
            </Button>
          </Row>
        </Column>
      </Section>

      <Section anchor={HOME_NAV_SECTION_IDS.token}>
        <Column gap="20">
          <Column gap="12">
            <Tag variant="brand" size="m">
              DCT Token economics
            </Tag>
            <Heading variant="heading-strong-m">
              Burns, rewards, and radical transparency
            </Heading>
            <Text
              variant="body-default-m"
              onBackground="neutral-weak"
              wrap="balance"
              className="max-w-3xl"
            >
              DCT powers the Dynamic Capital treasury. Every burn, reward, and
              treasury movement is mirrored inside Supabase and exposed through
              investor dashboards.
            </Text>
          </Column>
          <Row gap="16" wrap className="gap-6">
            {TOKEN_FEATURES.map((feature) => (
              <Column
                key={feature.title}
                gap="12"
                padding="20"
                radius="l"
                background="surface"
                border="neutral-alpha-weak"
                data-border="rounded"
                className="flex-1 min-w-[240px] bg-background/70 shadow-lg shadow-primary/5"
              >
                <Icon name={feature.icon} size="m" />
                <Heading variant="heading-strong-xs">{feature.title}</Heading>
                <Text
                  variant="body-default-s"
                  onBackground="neutral-weak"
                  wrap="balance"
                >
                  {feature.description}
                </Text>
              </Column>
            ))}
          </Row>
        </Column>
      </Section>

      <Section anchor={HOME_NAV_SECTION_IDS.wallet}>
        <Column gap="20">
          <Column gap="12">
            <Tag variant="brand" size="m">
              Dynamic wallet
            </Tag>
            <Heading variant="heading-strong-m">
              One TonConnect handshake powers every surface
            </Heading>
            <Text
              variant="body-default-m"
              onBackground="neutral-weak"
              wrap="balance"
              className="max-w-3xl"
            >
              Link wallets from Telegram, store them in Supabase, and unlock
              staking, VIP plans, and automation without duplicating onboarding
              flows.
            </Text>
          </Column>
          <Row gap="16" wrap className="gap-6">
            {WALLET_FEATURES.map((feature) => (
              <Column
                key={feature.title}
                gap="12"
                padding="20"
                radius="l"
                background="surface"
                border="neutral-alpha-weak"
                data-border="rounded"
                className="flex-1 min-w-[240px] bg-background/70 shadow-lg shadow-primary/5"
              >
                <Icon name={feature.icon} size="m" />
                <Heading variant="heading-strong-xs">{feature.title}</Heading>
                <Text
                  variant="body-default-s"
                  onBackground="neutral-weak"
                  wrap="balance"
                >
                  {feature.description}
                </Text>
              </Column>
            ))}
          </Row>
          <Column gap="12" className="max-w-3xl">
            <Heading variant="heading-strong-s">Guardrails baked in</Heading>
            <Column gap="8" as="ul">
              {WALLET_GUARDRAILS.map((guardrail) => (
                <Row
                  key={guardrail}
                  gap="12"
                  as="li"
                  horizontal="start"
                  className="items-start"
                >
                  <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Icon name="check" size="s" />
                  </span>
                  <Text
                    variant="body-default-m"
                    onBackground="neutral-strong"
                    wrap="balance"
                  >
                    {guardrail}
                  </Text>
                </Row>
              ))}
            </Column>
          </Column>
        </Column>
      </Section>

      <Section anchor={HOME_NAV_SECTION_IDS.markets}>
        <Column gap="20">
          <Column gap="12">
            <Tag variant="brand" size="m">
              Live markets
            </Tag>
            <Heading variant="heading-strong-m">
              TradingView charts across desks
            </Heading>
            <Text
              variant="body-default-m"
              onBackground="neutral-weak"
              wrap="balance"
              className="max-w-3xl"
            >
              Monitor the exact markets Dynamic Capital automates. These
              embedded widgets sync with your TradingView alerts for gold,
              forex, and crypto strategies.
            </Text>
          </Column>
          <Row gap="16" wrap className="gap-6">
            {MARKET_WIDGETS.map((widget) => (
              <TradingViewWidget key={widget.symbol} {...widget} />
            ))}
          </Row>
        </Column>
      </Section>

      <Section anchor={HOME_NAV_SECTION_IDS.forecasts}>
        <Column gap="20">
          <Column gap="12">
            <Tag variant="brand" size="m">
              {FORECAST_HERO.tag}
            </Tag>
            <Heading variant="heading-strong-m">
              {FORECAST_HERO.heading}
            </Heading>
            <Text
              variant="body-default-m"
              onBackground="neutral-weak"
              wrap="balance"
              className="max-w-3xl"
            >
              {FORECAST_HERO.description}
            </Text>
            <Text
              variant="body-default-s"
              onBackground="neutral-weak"
              wrap="balance"
              className="max-w-3xl"
            >
              {FORECAST_HERO.updateNote}
            </Text>
          </Column>
          <Column gap="12" className="max-w-3xl">
            <Heading variant="heading-strong-s">
              What sets our forecasts apart
            </Heading>
            <Column gap="8" as="ul">
              {FORECAST_HIGHLIGHTS.map((highlight) => (
                <Row
                  key={highlight}
                  gap="12"
                  as="li"
                  horizontal="start"
                  className="items-start"
                >
                  <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Icon name="check" size="s" />
                  </span>
                  <Text
                    variant="body-default-m"
                    onBackground="neutral-strong"
                    wrap="balance"
                  >
                    {highlight}
                  </Text>
                </Row>
              ))}
            </Column>
          </Column>
          <Row gap="16" wrap className="gap-6">
            {FORECAST_CATEGORIES.map((category) => (
              <Column
                key={category.label}
                gap="12"
                padding="20"
                radius="l"
                background="surface"
                border="neutral-alpha-weak"
                data-border="rounded"
                className="flex-1 min-w-[220px] bg-background/70 shadow-lg shadow-primary/5"
              >
                <Heading variant="heading-strong-xs">
                  {category.label}
                </Heading>
                <Text
                  variant="body-default-s"
                  onBackground="neutral-weak"
                  wrap="balance"
                >
                  {category.description}
                </Text>
              </Column>
            ))}
          </Row>
        </Column>
      </Section>

      <Section anchor={HOME_NAV_SECTION_IDS.community}>
        <Column gap="20">
          <Column gap="12">
            <Tag variant="brand" size="m">
              Community trust
            </Tag>
            <Heading variant="heading-strong-m">
              Two languages, one truth
            </Heading>
            <Text
              variant="body-default-m"
              onBackground="neutral-weak"
              wrap="balance"
              className="max-w-3xl"
            >
              Whether you follow the project in Malé or overseas, the same
              treasury and strategy data powers every update.
            </Text>
          </Column>
          <Row gap="16" wrap className="gap-6">
            <Column
              gap="12"
              padding="20"
              radius="l"
              background="surface"
              border="neutral-alpha-weak"
              data-border="rounded"
              className="flex-1 min-w-[260px] bg-background/70 shadow-lg shadow-primary/5"
            >
              <Heading variant="heading-strong-xs">ދިވެހި</Heading>
              <Text
                variant="body-default-m"
                onBackground="neutral-strong"
                wrap="balance"
              >
                {COMMUNITY_MESSAGES.dhivehi}
              </Text>
            </Column>
            <Column
              gap="12"
              padding="20"
              radius="l"
              background="surface"
              border="neutral-alpha-weak"
              data-border="rounded"
              className="flex-1 min-w-[260px] bg-background/70 shadow-lg shadow-primary/5"
            >
              <Heading variant="heading-strong-xs">English</Heading>
              <Text
                variant="body-default-m"
                onBackground="neutral-strong"
                wrap="balance"
              >
                {COMMUNITY_MESSAGES.english}
              </Text>
            </Column>
          </Row>
        </Column>
      </Section>

      <Section anchor={HOME_NAV_SECTION_IDS.miniApp}>
        <Column gap="20">
          <Column gap="12">
            <Tag variant="brand" size="m">
              Telegram Mini App
            </Tag>
            <Heading variant="heading-strong-m">
              Investor dashboard inside Telegram
            </Heading>
            <Text
              variant="body-default-m"
              onBackground="neutral-weak"
              wrap="balance"
              className="max-w-3xl"
            >
              Accessible via{" "}
              <Text
                as="span"
                variant="body-default-m"
                onBackground="brand-medium"
              >
                /app
              </Text>, the Mini App gives every verified investor immediate
              access to their positions and staking performance.
            </Text>
          </Column>
          <Column gap="12" className="max-w-3xl">
            {MINI_APP_FEATURES.map((feature) => (
              <Row
                key={feature}
                gap="12"
                horizontal="start"
                className="items-start"
              >
                <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Icon name="check" size="s" />
                </span>
                <Text
                  variant="body-default-m"
                  onBackground="neutral-strong"
                  wrap="balance"
                >
                  {feature}
                </Text>
              </Row>
            ))}
          </Column>
        </Column>
      </Section>

      <Section anchor={HOME_NAV_SECTION_IDS.api}>
        <Column gap="20">
          <Column gap="12">
            <Tag variant="brand" size="m">
              API & backend
            </Tag>
            <Heading variant="heading-strong-m">
              One infrastructure powering every surface
            </Heading>
            <Text
              variant="body-default-m"
              onBackground="neutral-weak"
              wrap="balance"
              className="max-w-3xl"
            >
              REST endpoints keep TradingView, Telegram, and treasury automation
              aligned with Supabase-authenticated data.
            </Text>
          </Column>
          <Column gap="12" className="max-w-3xl">
            {API_ENDPOINTS.map((endpoint) => (
              <Column
                key={endpoint.path}
                gap="8"
                padding="16"
                radius="m"
                background="surface"
                border="neutral-alpha-weak"
                data-border="rounded"
                className="bg-background/70"
              >
                <Text variant="code-default-m" onBackground="brand-medium">
                  {endpoint.path}
                </Text>
                <Text
                  variant="body-default-s"
                  onBackground="neutral-weak"
                  wrap="balance"
                >
                  {endpoint.description}
                </Text>
              </Column>
            ))}
          </Column>
        </Column>
      </Section>

      <Section anchor={HOME_NAV_SECTION_IDS.admin}>
        <Column gap="20">
          <Column gap="12">
            <Tag variant="brand" size="m">
              Admin desk
            </Tag>
            <Heading variant="heading-strong-m">
              Control center for the trading team
            </Heading>
            <Text
              variant="body-default-m"
              onBackground="neutral-weak"
              wrap="balance"
              className="max-w-3xl"
            >
              Restricted access at{" "}
              <Text
                as="span"
                variant="body-default-m"
                onBackground="brand-medium"
              >
                /admin
              </Text>{" "}
              keeps sensitive workflows, payments, and strategy switches behind
              MFA.
            </Text>
          </Column>
          <Column gap="12" className="max-w-3xl">
            {ADMIN_ACTIONS.map((action) => (
              <Row
                key={action}
                gap="12"
                horizontal="start"
                className="items-start"
              >
                <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Icon name="shield" size="s" />
                </span>
                <Text
                  variant="body-default-m"
                  onBackground="neutral-strong"
                  wrap="balance"
                >
                  {action}
                </Text>
              </Row>
            ))}
          </Column>
        </Column>
      </Section>

      <Section anchor={HOME_NAV_SECTION_IDS.advantages}>
        <Column gap="20" paddingBottom="40">
          <Column gap="12">
            <Tag variant="brand" size="m">
              Why it matters
            </Tag>
            <Heading variant="heading-strong-m">
              A single site for the entire Dynamic Capital universe
            </Heading>
            <Text
              variant="body-default-m"
              onBackground="neutral-weak"
              wrap="balance"
              className="max-w-3xl"
            >
              From marketing to investor operations, Dynamic Capital scales
              through one extensible codebase and one domain.
            </Text>
          </Column>
          <Column gap="12" className="max-w-3xl">
            {ADVANTAGES.map((advantage) => (
              <Row
                key={advantage}
                gap="12"
                horizontal="start"
                className="items-start"
              >
                <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Icon name="sparkles" size="s" />
                </span>
                <Text
                  variant="body-default-m"
                  onBackground="neutral-strong"
                  wrap="balance"
                >
                  {advantage}
                </Text>
              </Row>
            ))}
          </Column>
        </Column>
      </Section>
    </Column>
  );
}

export default MultiLlmLandingPage;
