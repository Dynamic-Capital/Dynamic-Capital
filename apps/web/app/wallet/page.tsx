import Link from "next/link";

import {
  Column,
  Heading,
  Icon,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import {
  LAYERZERO_CONFIG,
  type LayerZeroEndpoint,
  type LayerZeroEnvironment,
} from "@/config/layerzero";
import { UnifiedWalletConnect } from "@/components/web3/UnifiedWalletConnect";
import { TonWalletCatalogue } from "@/components/web3/TonWalletCatalogue";
import { TonkeeperDeepLinkButtons } from "@/components/web3/TonkeeperDeepLinkButtons";
import { tokenContent, tokenDescriptor } from "@/resources";
import { TON_MAINNET_DCT_TREASURY_WALLET } from "@shared/ton/mainnet-addresses";

const HERO_HIGHLIGHTS = [
  {
    icon: "sparkles" as const,
    text:
      "TonConnect handshake completes in under 30 seconds across supported wallets.",
  },
  {
    icon: "repeat" as const,
    text:
      "Supabase keeps linked wallet records in sync with investor permissions.",
  },
  {
    icon: "shield" as const,
    text:
      "RLS policies and admin tooling guard treasury operations around the clock.",
  },
  {
    icon: "sparkles" as const,
    text:
      "DCT is the default treasury currency, so deposits, withdrawals, and burns stay auditable on-chain.",
  },
] as const;

const ONBOARDING_STEPS = [
  {
    icon: "sparkles" as const,
    title: "Launch TonConnect inside Telegram",
    description:
      "Investors tap the Mini App link and authenticate with Wallet (Telegram), Tonkeeper, DeDust Wallet, STON.fi Wallet, MyTonWallet, Tonhub, or Bitget Wallet without leaving Telegram.",
  },
  {
    icon: "check" as const,
    title: "Verify the handshake with Supabase",
    description:
      "The link-wallet edge function validates Telegram identity, ensures the address is unique, and stores the public key.",
  },
  {
    icon: "rocket" as const,
    title: "Unlock the Dynamic Capital desk",
    description:
      "Once linked, investors gain access to staking, VIP plans, and automation triggers that respond to their wallet state.",
  },
] as const;

const SECURITY_FEATURES = [
  {
    icon: "shield" as const,
    title: "Role-based policies",
    description:
      "Wallet updates require Supabase auth tokens tied to verified Telegram IDs, and every admin override is logged.",
  },
  {
    icon: "repeat" as const,
    title: "On-chain reconciliation",
    description:
      "Background jobs compare deposits against expected wallets before releasing auto-invest units or VIP credits.",
  },
  {
    icon: "sparkles" as const,
    title: "Session hygiene",
    description:
      "Stale handshakes are rotated automatically so the trading desk always acts on fresh wallet attestations.",
  },
] as const;

const AUTOMATION_EVENTS = [
  "Auto-invest subscriptions store expected wallet addresses before any TON transfer is accepted.",
  "Process-subscription functions compare incoming payments to the registered wallet before crediting staking units.",
  "Link-wallet flows reject duplicate addresses so every investor maintains a single, auditable entry in Supabase.",
  "Treasury monitoring jobs mirror intake and operations wallets to keep capital allocations accountable.",
] as const;

const WITHDRAWAL_POINTS = [
  "Submit a withdrawal notice at least 7 days ahead so the desk rebalances staked DCT.",
  "Operations execute on-chain releases straight back to your linked TonConnect address.",
  "Telegram concierge can coordinate expedited withdrawals once compliance clears the ticket.",
] as const;

const SUPPORTED_WALLETS = [
  "Wallet (Telegram)",
  "Tonkeeper",
  "STON.fi Wallet",
  "DeDust Wallet",
  "Tonhub",
  "MyTonWallet",
  "Bitget Wallet",
] as const;

const DCT_TREASURY_ADDRESS = TON_MAINNET_DCT_TREASURY_WALLET;
const DCT_TREASURY_URL = `https://tonviewer.com/${DCT_TREASURY_ADDRESS}`;
const DCT_JETTON_ADDRESS = tokenDescriptor.address ?? null;
const DCT_JETTON_URL = DCT_JETTON_ADDRESS
  ? `https://tonviewer.com/jetton/${DCT_JETTON_ADDRESS}`
  : null;

const STONFI_POOL = tokenContent.dexPools.find((pool) =>
  pool.dex === "STON.fi"
);
const DEDUST_POOL = tokenContent.dexPools.find((pool) => pool.dex === "DeDust");

const STONFI_SWAP_URL = STONFI_POOL?.url ??
  "https://app.ston.fi/swap?from=TON&to=DCT";
const DEDUST_SWAP_URL = DEDUST_POOL?.url ?? "https://dedust.io/swap/TON-DCT";
const STONFI_EXPLORER_URL = STONFI_POOL?.explorerUrl ?? null;
const DEDUST_EXPLORER_URL = DEDUST_POOL?.explorerUrl ?? null;

function shortenTonAddress(address: string, visible = 6): string {
  if (!address) {
    return "";
  }

  const trimmed = address.trim();
  if (trimmed.length <= visible * 2) {
    return trimmed;
  }

  return `${trimmed.slice(0, visible)}…${trimmed.slice(-visible)}`;
}

type LayerZeroFeature = {
  icon: "sparkles" | "shield" | "repeat";
  title: string;
  description: string;
};

function createLayerZeroFeatures(
  environment: LayerZeroEnvironment,
): LayerZeroFeature[] {
  return [
    {
      icon: "sparkles",
      title: "Omnichain execution fabric",
      description:
        `LayerZero v2 keeps VIP triggers mirrored across the ${environment} endpoints we operate so routing stays deterministic.`,
    },
    {
      icon: "shield",
      title: "Security stack transparency",
      description:
        "DVN guardrails and executor health probes surface every anomaly before cross-chain capital leaves the desk.",
    },
    {
      icon: "repeat",
      title: "Composable settlement windows",
      description:
        "Bridged messages settle with predictable finality so treasury, auto-invest, and staking ledgers stay in sync.",
    },
  ];
}

function formatChainIdLabel(chainId?: number): string | null {
  if (typeof chainId !== "number" || !Number.isFinite(chainId)) {
    return null;
  }
  return chainId.toString(10);
}

function extractRpcHost(url?: string): string | null {
  if (!url) {
    return null;
  }

  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function describeEndpoint(
  endpoint: LayerZeroEndpoint,
  environment: LayerZeroEnvironment,
): string {
  return `Endpoint ${endpoint.eid} keeps ${endpoint.name} wired into Dynamic Capital's ${environment} LayerZero mesh so cross-chain receipts land instantly.`;
}

export const metadata = {
  title: "Dynamic Capital Wallet",
  description:
    "Link TON wallets to Dynamic Capital in seconds with TonConnect, Supabase guardrails, and automation-ready ledgers.",
};

export default function WalletPage() {
  const layerZeroEnvironment = LAYERZERO_CONFIG.environment;
  const layerZeroEndpoints = LAYERZERO_CONFIG.endpoints;
  const layerZeroFeatures = createLayerZeroFeatures(layerZeroEnvironment);
  const dctTreasuryLabel = shortenTonAddress(DCT_TREASURY_ADDRESS);
  const dctJettonLabel = DCT_JETTON_ADDRESS
    ? shortenTonAddress(DCT_JETTON_ADDRESS)
    : null;

  return (
    <Column
      gap="40"
      paddingY="48"
      paddingX="16"
      align="center"
      horizontal="center"
      fillWidth
    >
      <Column maxWidth={32} gap="12" align="center" horizontal="center">
        <Tag size="s" background="brand-alpha-weak" prefixIcon="sparkles">
          DCT-first wallet
        </Tag>
        <Heading variant="display-strong-s" align="center">
          Dynamic Capital Wallet
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          align="center"
        >
          A TonConnect-powered experience anchored in DCT so deposits,
          withdrawals, and swaps stay synchronized with treasury operations,
          auto-invest subscriptions, and VIP access for every investor.
        </Text>
        <Row gap="16" wrap horizontal="center">
          {HERO_HIGHLIGHTS.map((highlight) => (
            <Row
              key={highlight.text}
              gap="8"
              background="page"
              border="neutral-alpha-medium"
              radius="l"
              padding="12"
              vertical="center"
            >
              <Icon name={highlight.icon} onBackground="brand-medium" />
              <Text variant="label-strong-s">{highlight.text}</Text>
            </Row>
          ))}
        </Row>
      </Column>

      <Column gap="24" maxWidth={40} fillWidth>
        <Heading variant="heading-strong-l">Unified wallet connect</Heading>
        <Text variant="body-default-m" onBackground="neutral-weak">
          Link TON and EVM wallets—including Bitget Wallet—in one step to move
          DCT across staking, LayerZero routing, and automation triggers that
          follow your balances.
        </Text>
        <div className="w-full">
          <UnifiedWalletConnect />
        </div>
        <Row gap="8" wrap horizontal="center">
          {SUPPORTED_WALLETS.map((wallet) => (
            <Tag
              key={wallet}
              size="s"
              background="neutral-alpha-medium"
              onBackground="neutral-strong"
            >
              {wallet}
            </Tag>
          ))}
        </Row>
      </Column>

      <Column gap="24" maxWidth={40} fillWidth>
        <Heading variant="heading-strong-l">DCT treasury actions</Heading>
        <Text variant="body-default-m" onBackground="neutral-weak">
          DCT is the primary settlement currency across Dynamic Capital. Use the
          actions below to deposit into the treasury, schedule on-chain
          withdrawals, and route swaps through liquid TON venues.
        </Text>
        <Column gap="16">
          <Column
            gap="16"
            background="surface"
            border="neutral-alpha-medium"
            radius="l"
            padding="20"
            className="shadow-lg shadow-primary/5"
          >
            <Row gap="12" vertical="center" wrap>
              <Icon name="wallet" onBackground="brand-medium" />
              <Heading variant="heading-strong-m">Deposit DCT</Heading>
              <Tag size="s" background="brand-alpha-weak">
                TonConnect
              </Tag>
            </Row>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Move DCT into the treasury from Wallet (Telegram), Tonkeeper,
              STON.fi Wallet, DeDust Wallet, MyTonWallet, Tonhub, or Bitget
              Wallet.
            </Text>
            <TonkeeperDeepLinkButtons
              address={DCT_TREASURY_ADDRESS}
              jettonAddress={DCT_JETTON_ADDRESS ?? undefined}
              memo="Dynamic Capital DCT deposit"
              className="w-full"
            />
            <Column gap="8">
              <Row gap="8" vertical="center" wrap>
                <Icon name="shield" size="s" onBackground="brand-medium" />
                <Text variant="label-default-s" onBackground="neutral-weak">
                  Treasury wallet
                </Text>
                <Text
                  variant="body-default-m"
                  onBackground="neutral-strong"
                  className="font-mono"
                >
                  {dctTreasuryLabel}
                </Text>
              </Row>
              <div className="flex flex-wrap gap-3">
                <a
                  href={DCT_TREASURY_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  View treasury
                  <Icon name="arrowUpRight" size="xs" />
                </a>
                {DCT_JETTON_URL
                  ? (
                    <a
                      href={DCT_JETTON_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                    >
                      View jetton master
                      <Icon name="arrowUpRight" size="xs" />
                    </a>
                  )
                  : null}
              </div>
            </Column>
          </Column>

          <Column
            gap="16"
            background="surface"
            border="neutral-alpha-medium"
            radius="l"
            padding="20"
            className="shadow-lg shadow-primary/5"
          >
            <Row gap="12" vertical="center" wrap>
              <Icon name="arrowUpRight" onBackground="brand-medium" />
              <Heading variant="heading-strong-m">Withdraw DCT</Heading>
              <Tag size="s" background="neutral-alpha-medium">
                7-day notice
              </Tag>
            </Row>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Once your TonConnect wallet is linked, request DCT withdrawals
              from the investor desk or concierge. Releases land back in the
              same verified address after compliance clears the ticket.
            </Text>
            <Row gap="12" wrap>
              <Link
                href="/tools/dynamic-portfolio"
                className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                Open investor desk
                <Icon name="arrowUpRight" size="xs" />
              </Link>
              <a
                href="https://t.me/DynamicCapital_Support"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                Message concierge
                <Icon name="arrowUpRight" size="xs" />
              </a>
            </Row>
            <Column gap="12" as="ul">
              {WITHDRAWAL_POINTS.map((point) => (
                <Row
                  key={point}
                  gap="12"
                  as="li"
                  horizontal="start"
                  className="items-start"
                >
                  <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Icon name="check" size="s" />
                  </span>
                  <Text variant="body-default-m" onBackground="neutral-weak">
                    {point}
                  </Text>
                </Row>
              ))}
            </Column>
          </Column>

          <Column
            gap="16"
            background="surface"
            border="neutral-alpha-medium"
            radius="l"
            padding="20"
            className="shadow-lg shadow-primary/5"
          >
            <Row gap="12" vertical="center" wrap>
              <Icon name="repeat" onBackground="brand-medium" />
              <Heading variant="heading-strong-m">Swap DCT</Heading>
              <Tag size="s" background="brand-alpha-weak">
                STON.fi
              </Tag>
              <Tag size="s" background="brand-alpha-weak">
                DeDust
              </Tag>
            </Row>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Access deep DCT/TON liquidity for treasury balancing and member
              swaps through STON.fi and DeDust pools.
            </Text>
            <div className="flex flex-wrap gap-3">
              <a
                href={STONFI_SWAP_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary hover:bg-primary/20"
              >
                STON.fi swap
              </a>
              <a
                href={DEDUST_SWAP_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary hover:bg-primary/20"
              >
                DeDust swap
              </a>
            </div>
            <div className="flex flex-wrap gap-3">
              {STONFI_EXPLORER_URL
                ? (
                  <a
                    href={STONFI_EXPLORER_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    STON.fi pool explorer
                    <Icon name="arrowUpRight" size="xs" />
                  </a>
                )
                : null}
              {DEDUST_EXPLORER_URL
                ? (
                  <a
                    href={DEDUST_EXPLORER_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    DeDust pool explorer
                    <Icon name="arrowUpRight" size="xs" />
                  </a>
                )
                : null}
            </div>
          </Column>
        </Column>
      </Column>

      <Column gap="24" maxWidth={40} fillWidth>
        <Heading variant="heading-strong-l">Frictionless onboarding</Heading>
        <Column gap="16">
          {ONBOARDING_STEPS.map((step) => (
            <Row
              key={step.title}
              gap="16"
              background="surface"
              border="neutral-alpha-medium"
              radius="l"
              padding="16"
              horizontal="start"
              className="items-start"
            >
              <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Icon name={step.icon} size="s" />
              </span>
              <Column gap="4">
                <Heading variant="heading-strong-xs">{step.title}</Heading>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {step.description}
                </Text>
              </Column>
            </Row>
          ))}
        </Column>
      </Column>

      <Column gap="24" maxWidth={40} fillWidth>
        <Heading variant="heading-strong-l">Security guardrails</Heading>
        <Row gap="16" wrap className="gap-6">
          {SECURITY_FEATURES.map((feature) => (
            <Column
              key={feature.title}
              gap="12"
              padding="20"
              radius="l"
              background="surface"
              border="neutral-alpha-medium"
              data-border="rounded"
              className="flex-1 min-w-[240px] bg-background/70 shadow-lg shadow-primary/5"
            >
              <Icon name={feature.icon} size="m" />
              <Heading variant="heading-strong-xs">{feature.title}</Heading>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {feature.description}
              </Text>
            </Column>
          ))}
        </Row>
      </Column>

      <Column gap="24" maxWidth={40} fillWidth>
        <Heading variant="heading-strong-l">Automation-ready ledger</Heading>
        <Column gap="12" as="ul">
          {AUTOMATION_EVENTS.map((event) => (
            <Row
              key={event}
              gap="12"
              as="li"
              horizontal="start"
              className="items-start"
            >
              <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Icon name="check" size="s" />
              </span>
              <Text variant="body-default-m" onBackground="neutral-strong">
                {event}
              </Text>
            </Row>
          ))}
        </Column>
      </Column>

      <Column gap="24" maxWidth={40} fillWidth>
        <Heading variant="heading-strong-l">
          Wallets your community already trusts
        </Heading>
        <TonWalletCatalogue />
      </Column>

      <Column gap="24" maxWidth={40} fillWidth>
        <Heading variant="heading-strong-l">
          LayerZero v2 bridge support
        </Heading>
        <Text variant="body-default-m" onBackground="neutral-weak">
          {`Dynamic Capital operates LayerZero v2 on the ${layerZeroEnvironment} mesh, so cross-chain automations stay aligned with the desk regardless of where investors originate.`}
        </Text>
        <Column gap="16">
          {layerZeroFeatures.map((feature) => (
            <Row
              key={feature.title}
              gap="16"
              background="surface"
              border="neutral-alpha-medium"
              radius="l"
              padding="16"
              className="items-start"
            >
              <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Icon name={feature.icon} size="s" />
              </span>
              <Column gap="4">
                <Heading variant="heading-strong-xs">{feature.title}</Heading>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {feature.description}
                </Text>
              </Column>
            </Row>
          ))}
        </Column>
      </Column>

      <Column gap="24" maxWidth={40} fillWidth>
        <Heading variant="heading-strong-l">Connected endpoints</Heading>
        <Text variant="body-default-m" onBackground="neutral-weak">
          {`Endpoint IDs and RPC providers are ready out-of-the-box so wallets can bridge into Dynamic Capital without manual configuration.`}
        </Text>
        <Column gap="16">
          {layerZeroEndpoints.map((endpoint) => {
            const chainIdLabel = formatChainIdLabel(endpoint.chainId);
            const rpcHost = extractRpcHost(endpoint.rpcUrl);
            const description = describeEndpoint(
              endpoint,
              layerZeroEnvironment,
            );

            return (
              <Column
                key={endpoint.key}
                gap="12"
                padding="20"
                radius="l"
                background="surface"
                border="neutral-alpha-medium"
                data-border="rounded"
                className="shadow-lg shadow-primary/5"
              >
                <Heading variant="heading-strong-xs">{endpoint.name}</Heading>
                <Row gap="8" wrap>
                  <Tag size="s" background="brand-alpha-weak">
                    Endpoint {endpoint.eid}
                  </Tag>
                  <Tag size="s" background="neutral-alpha-medium">
                    {layerZeroEnvironment}
                  </Tag>
                  {chainIdLabel && (
                    <Tag size="s" background="neutral-alpha-medium">
                      Chain ID {chainIdLabel}
                    </Tag>
                  )}
                  {rpcHost && (
                    <Tag size="s" background="neutral-alpha-medium">
                      RPC {rpcHost}
                    </Tag>
                  )}
                </Row>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {description}
                </Text>
                {endpoint.rpcUrl && (
                  <Text variant="label-default-s" onBackground="brand-medium">
                    {endpoint.rpcUrl}
                  </Text>
                )}
                {endpoint.explorerUrl && (
                  <Text variant="label-default-s" onBackground="brand-medium">
                    {endpoint.explorerUrl}
                  </Text>
                )}
              </Column>
            );
          })}
        </Column>
      </Column>
    </Column>
  );
}
