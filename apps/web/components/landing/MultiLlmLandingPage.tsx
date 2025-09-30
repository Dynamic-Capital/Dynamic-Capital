"use client";

import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Button,
  Column,
  Heading,
  Icon,
  type IconName,
  RevealFx,
  Row,
  Schema,
  Skeleton,
  SpacingToken,
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

const SECTION_HEADING_IDS = {
  overview: `${HOME_NAV_SECTION_IDS.overview}-heading`,
  token: `${HOME_NAV_SECTION_IDS.token}-heading`,
  wallet: `${HOME_NAV_SECTION_IDS.wallet}-heading`,
  markets: `${HOME_NAV_SECTION_IDS.markets}-heading`,
  forecasts: `${HOME_NAV_SECTION_IDS.forecasts}-heading`,
  community: `${HOME_NAV_SECTION_IDS.community}-heading`,
  miniApp: `${HOME_NAV_SECTION_IDS.miniApp}-heading`,
  api: `${HOME_NAV_SECTION_IDS.api}-heading`,
  admin: `${HOME_NAV_SECTION_IDS.admin}-heading`,
  advantages: `${HOME_NAV_SECTION_IDS.advantages}-heading`,
} as const satisfies Record<
  keyof typeof HOME_NAV_SECTION_IDS,
  string
>;

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
    title: "Countries",
    description: "Growth, inflation, and policy paths for 150+ economies.",
  },
  {
    title: "Indicators",
    description:
      "Leading, coincident, and lagging signals that shape strategy.",
  },
  {
    title: "Commodities",
    description:
      "Energy, metals, and agricultural curves tied to supply shifts.",
  },
  {
    title: "Indexes",
    description: "Equity and volatility benchmarks synced to macro drivers.",
  },
  {
    title: "Currencies",
    description: "FX crosses modeled on rate differentials and trade balances.",
  },
  {
    title: "Crypto",
    description:
      "Digital asset trajectories bridging on-chain and macro flows.",
  },
  {
    title: "Bonds",
    description: "Sovereign and credit curves linked to inflation and growth.",
  },
] as const satisfies readonly FeatureCardItem[];

const COMMUNITY_MESSAGES = {
  dhivehi:
    "ޑައިނެމިކް ކެޕިޓަލް ކޮމިޔުނިޓީގައި އެންމެންޓްސް، ޓްރެޑިންގް ސިގްނަލްސް، ޓްރެޖަރީ ޑޭޓާ ދުވަހުގެ އިތުރަށް ދިމާދުގައި ބަލާލެއްވުން.",
  english:
    "Investors, partners, and regulators view a single source of truth for burns, rewards, and strategy updates.",
};

const COMMUNITY_LANGUAGE_CARDS = [
  {
    title: "ދިވެހި",
    description: COMMUNITY_MESSAGES.dhivehi,
  },
  {
    title: "English",
    description: COMMUNITY_MESSAGES.english,
  },
] as const satisfies readonly FeatureCardItem[];

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

interface FeatureCardItem {
  title: string;
  description: string;
  icon?: IconName;
}

interface FeatureCardGridProps<Item extends FeatureCardItem> {
  items: readonly Item[];
  className?: string;
  as?: "div" | "ul";
  titleVariant?: ComponentProps<typeof Heading>["variant"];
  textVariant?: ComponentProps<typeof Text>["variant"];
  textOnBackground?: ComponentProps<typeof Text>["onBackground"];
}

function FeatureCardGrid<Item extends FeatureCardItem>({
  items,
  className,
  as = "div",
  titleVariant = "heading-strong-xs",
  textVariant = "body-default-s",
  textOnBackground = "neutral-weak",
}: FeatureCardGridProps<Item>) {
  const Wrapper: "div" | "ul" = as;

  return (
    <Wrapper
      className={cn(
        "grid w-full gap-6 sm:grid-cols-2 xl:grid-cols-3",
        as === "ul" ? "list-none p-0" : undefined,
        className,
      )}
    >
      {items.map((item) => (
        <Column
          key={item.title}
          as={as === "ul" ? "li" : undefined}
          gap="12"
          padding="20"
          radius="l"
          background="surface"
          border="neutral-alpha-weak"
          data-border="rounded"
          className="h-full bg-background/70 shadow-lg shadow-primary/5"
        >
          {item.icon ? <Icon name={item.icon} size="m" decorative /> : null}
          <Heading variant={titleVariant}>{item.title}</Heading>
          <Text
            variant={textVariant}
            onBackground={textOnBackground}
            wrap="balance"
          >
            {item.description}
          </Text>
        </Column>
      ))}
    </Wrapper>
  );
}

interface IconBulletListProps {
  items: readonly string[];
  icon?: IconName;
  textVariant?: ComponentProps<typeof Text>["variant"];
  textOnBackground?: ComponentProps<typeof Text>["onBackground"];
  className?: string;
  as?: "ul" | "ol";
}

function IconBulletList({
  items,
  icon = "check",
  textVariant = "body-default-m",
  textOnBackground = "neutral-strong",
  className,
  as = "ul",
}: IconBulletListProps) {
  const ListTag = as;

  return (
    <Column
      as={ListTag}
      gap="8"
      className={cn(
        "w-full",
        as === "ul" ? "list-none p-0" : undefined,
        className,
      )}
    >
      {items.map((item) => (
        <Row
          key={item}
          as="li"
          gap="12"
          horizontal="start"
          className="items-start"
        >
          <span className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Icon name={icon} size="s" decorative />
          </span>
          <Text
            variant={textVariant}
            onBackground={textOnBackground}
            wrap="balance"
          >
            {item}
          </Text>
        </Row>
      ))}
    </Column>
  );
}

interface SectionHeaderProps {
  id: string;
  title: ReactNode;
  tag?: string;
  description?: ReactNode;
  note?: ReactNode;
  align?: "start" | "center";
  gap?: SpacingToken;
  titleVariant?: ComponentProps<typeof Heading>["variant"];
  descriptionVariant?: ComponentProps<typeof Text>["variant"];
  noteVariant?: ComponentProps<typeof Text>["variant"];
  descriptionOnBackground?: ComponentProps<typeof Text>["onBackground"];
  noteOnBackground?: ComponentProps<typeof Text>["onBackground"];
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  noteClassName?: string;
  tagClassName?: string;
}

function SectionHeader({
  id,
  title,
  tag,
  description,
  note,
  align = "start",
  gap = "12",
  titleVariant = "heading-strong-m",
  descriptionVariant = "body-default-m",
  noteVariant = "body-default-s",
  descriptionOnBackground = "neutral-weak",
  noteOnBackground = "neutral-weak",
  className,
  titleClassName,
  descriptionClassName,
  noteClassName,
  tagClassName,
}: SectionHeaderProps) {
  const alignmentClasses = align === "center"
    ? "items-center text-center"
    : "items-start text-left";

  return (
    <Column gap={gap} className={cn(alignmentClasses, className)}>
      {tag
        ? (
          <Tag
            variant="brand"
            size="m"
            className={cn(
              align === "center" ? "self-center" : "self-start",
              tagClassName,
            )}
          >
            {tag}
          </Tag>
        )
        : null}
      <Heading
        id={id}
        variant={titleVariant}
        className={cn("max-w-3xl text-balance", titleClassName)}
      >
        {title}
      </Heading>
      {description
        ? (
          <Text
            variant={descriptionVariant}
            onBackground={descriptionOnBackground}
            wrap="balance"
            className={cn("max-w-3xl", descriptionClassName)}
          >
            {description}
          </Text>
        )
        : null}
      {note
        ? (
          <Text
            variant={noteVariant}
            onBackground={noteOnBackground}
            wrap="balance"
            className={cn("max-w-3xl", noteClassName)}
          >
            {note}
          </Text>
        )
        : null}
    </Column>
  );
}

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
  const [isLoading, setIsLoading] = useState(true);
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
    setIsLoading(true);
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

        if (isActive) {
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isActive) {
          setError("Live chart unavailable right now");
          setIsLoading(false);
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
          className="relative h-64 w-full"
          aria-busy={isLoading}
          aria-live="polite"
        >
          {isLoading
            ? (
              <Skeleton
                shape="block"
                className="absolute inset-0 h-full w-full rounded-xl border border-border/60 bg-background/40"
              />
            )
            : null}
          <div
            id={containerId}
            ref={containerRef}
            className="h-full w-full rounded-xl border border-border/60 bg-gradient-to-br from-background/60 via-background/40 to-background/60"
            role="img"
            aria-label={`Live TradingView chart for ${title}`}
          />
        </div>
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
  children: ReactNode;
  className?: string;
  delay?: number;
  titleId?: string;
}

function Section(
  { anchor, children, className, delay, titleId }: SectionProps,
) {
  return (
    <RevealFx translateY="16" delay={delay}>
      <section
        id={anchor}
        data-section-anchor={anchor}
        aria-labelledby={titleId}
        role="region"
        className={cn(
          "w-full scroll-mt-28 sm:scroll-mt-32",
          className,
        )}
      >
        <Column
          fillWidth
          gap="24"
          paddingX="16"
          className="mx-auto max-w-6xl"
        >
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

      <Section
        anchor={HOME_NAV_SECTION_IDS.overview}
        titleId={SECTION_HEADING_IDS.overview}
      >
        <Column gap="32" paddingTop="40">
          <SectionHeader
            id={SECTION_HEADING_IDS.overview}
            title={HERO_TITLE}
            description={HERO_DESCRIPTION}
            align="center"
            gap="16"
            titleVariant="heading-strong-l"
            descriptionVariant="body-default-m"
            className="items-center text-center sm:items-start sm:text-left"
            titleClassName="max-w-3xl text-balance text-4xl sm:text-5xl"
            descriptionClassName="max-w-2xl"
          />
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
                <Icon name={badge.icon} size="s" decorative />
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

      <Section
        anchor={HOME_NAV_SECTION_IDS.token}
        titleId={SECTION_HEADING_IDS.token}
      >
        <Column gap="20">
          <SectionHeader
            id={SECTION_HEADING_IDS.token}
            tag="DCT Token economics"
            title="Burns, rewards, and radical transparency"
            description="DCT powers the Dynamic Capital treasury. Every burn, reward, and treasury movement is mirrored inside Supabase and exposed through investor dashboards."
          />
          <FeatureCardGrid items={TOKEN_FEATURES} as="ul" />
        </Column>
      </Section>

      <Section
        anchor={HOME_NAV_SECTION_IDS.wallet}
        titleId={SECTION_HEADING_IDS.wallet}
      >
        <Column gap="20">
          <SectionHeader
            id={SECTION_HEADING_IDS.wallet}
            tag="Dynamic wallet"
            title="One TonConnect handshake powers every surface"
            description="Link wallets from Telegram, store them in Supabase, and unlock staking, VIP plans, and automation without duplicating onboarding flows."
          />
          <FeatureCardGrid items={WALLET_FEATURES} as="ul" />
          <Column gap="12" className="max-w-3xl">
            <Heading variant="heading-strong-s">Guardrails baked in</Heading>
            <IconBulletList items={WALLET_GUARDRAILS} />
          </Column>
        </Column>
      </Section>

      <Section
        anchor={HOME_NAV_SECTION_IDS.markets}
        titleId={SECTION_HEADING_IDS.markets}
      >
        <Column gap="20">
          <SectionHeader
            id={SECTION_HEADING_IDS.markets}
            tag="Live markets"
            title="TradingView charts across desks"
            description="Monitor the exact markets Dynamic Capital automates. These embedded widgets sync with your TradingView alerts for gold, forex, and crypto strategies."
          />
          <div className="grid w-full gap-6 md:grid-cols-2 xl:grid-cols-3">
            {MARKET_WIDGETS.map((widget) => (
              <TradingViewWidget key={widget.symbol} {...widget} />
            ))}
          </div>
        </Column>
      </Section>

      <Section
        anchor={HOME_NAV_SECTION_IDS.forecasts}
        titleId={SECTION_HEADING_IDS.forecasts}
      >
        <Column gap="20">
          <SectionHeader
            id={SECTION_HEADING_IDS.forecasts}
            tag={FORECAST_HERO.tag}
            title={FORECAST_HERO.heading}
            description={FORECAST_HERO.description}
            note={FORECAST_HERO.updateNote}
          />
          <Column gap="12" className="max-w-3xl">
            <Heading variant="heading-strong-s">
              What sets our forecasts apart
            </Heading>
            <IconBulletList items={FORECAST_HIGHLIGHTS} />
          </Column>
          <FeatureCardGrid items={FORECAST_CATEGORIES} as="ul" />
        </Column>
      </Section>

      <Section
        anchor={HOME_NAV_SECTION_IDS.community}
        titleId={SECTION_HEADING_IDS.community}
      >
        <Column gap="20">
          <SectionHeader
            id={SECTION_HEADING_IDS.community}
            tag="Community trust"
            title="Two languages, one truth"
            description="Whether you follow the project in Malé or overseas, the same treasury and strategy data powers every update."
          />
          <FeatureCardGrid
            items={COMMUNITY_LANGUAGE_CARDS}
            as="ul"
            textVariant="body-default-m"
            textOnBackground="neutral-strong"
            className="xl:grid-cols-2"
          />
        </Column>
      </Section>

      <Section
        anchor={HOME_NAV_SECTION_IDS.miniApp}
        titleId={SECTION_HEADING_IDS.miniApp}
      >
        <Column gap="20">
          <SectionHeader
            id={SECTION_HEADING_IDS.miniApp}
            tag="Telegram Mini App"
            title="Investor dashboard inside Telegram"
            description={
              <>
                Accessible via{"  "}
                <span className="font-medium text-primary">/app</span>, the Mini
                App gives every verified investor immediate access to their
                positions and staking performance.
              </>
            }
          />
          <IconBulletList items={MINI_APP_FEATURES} className="max-w-3xl" />
        </Column>
      </Section>

      <Section
        anchor={HOME_NAV_SECTION_IDS.api}
        titleId={SECTION_HEADING_IDS.api}
      >
        <Column gap="20">
          <SectionHeader
            id={SECTION_HEADING_IDS.api}
            tag="API & backend"
            title="One infrastructure powering every surface"
            description="REST endpoints keep TradingView, Telegram, and treasury automation aligned with Supabase-authenticated data."
          />
          <Column as="ul" gap="12" className="max-w-3xl list-none p-0">
            {API_ENDPOINTS.map((endpoint) => (
              <Column
                key={endpoint.path}
                as="li"
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

      <Section
        anchor={HOME_NAV_SECTION_IDS.admin}
        titleId={SECTION_HEADING_IDS.admin}
      >
        <Column gap="20">
          <SectionHeader
            id={SECTION_HEADING_IDS.admin}
            tag="Admin desk"
            title="Control center for the trading team"
            description={
              <>
                Restricted access at{"  "}
                <span className="font-medium text-primary">/admin</span>{" "}
                keeps sensitive workflows, payments, and strategy switches
                behind MFA.
              </>
            }
          />
          <IconBulletList
            items={ADMIN_ACTIONS}
            icon="shield"
            className="max-w-3xl"
          />
        </Column>
      </Section>

      <Section
        anchor={HOME_NAV_SECTION_IDS.advantages}
        titleId={SECTION_HEADING_IDS.advantages}
      >
        <Column gap="20" paddingBottom="40">
          <SectionHeader
            id={SECTION_HEADING_IDS.advantages}
            tag="Why it matters"
            title="A single site for the entire Dynamic Capital universe"
            description="From marketing to investor operations, Dynamic Capital scales through one extensible codebase and one domain."
          />
          <IconBulletList
            items={ADVANTAGES}
            icon="sparkles"
            className="max-w-3xl"
          />
        </Column>
      </Section>
    </Column>
  );
}

export default MultiLlmLandingPage;
