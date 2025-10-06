import {
  Column,
  Heading,
  Icon,
  Meta,
  Row,
  Schema,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import { TonkeeperDeepLinkButtons } from "@/components/web3/TonkeeperDeepLinkButtons";
import {
  baseURL as siteBaseURL,
  tokenContent,
  tokenDescriptor,
} from "@/resources";
import { cn } from "@/utils";

const normalizeBaseURL = (value: string) =>
  value.endsWith("/") ? value.slice(0, -1) : value;

const tokenBaseURL = tokenDescriptor.externalUrl?.length
  ? tokenDescriptor.externalUrl
  : siteBaseURL;
const normalizedBaseURL = normalizeBaseURL(tokenBaseURL);
const tokenCanonicalUrl = `${normalizedBaseURL}${tokenContent.path}`;
const schemaSameAs = Array.from(
  new Set([tokenCanonicalUrl, ...tokenContent.sameAs]),
);

export function generateMetadata() {
  return Meta.generate({
    title: tokenContent.title,
    description: tokenContent.description,
    baseURL: normalizedBaseURL,
    path: tokenContent.path,
    image: tokenContent.ogImage,
    canonical: tokenCanonicalUrl,
  });
}

const formatNumber = (value: number) => value.toLocaleString("en-US");
const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export default function TokenPage() {
  return (
    <Column
      gap="40"
      paddingY="48"
      paddingX="16"
      align="center"
      horizontal="center"
      fillWidth
    >
      <Schema
        as="webPage"
        baseURL={normalizedBaseURL}
        title={tokenContent.title}
        description={tokenContent.description}
        path={tokenContent.path}
        image={tokenContent.ogImage}
        sameAs={schemaSameAs}
      />
      <Column maxWidth={32} gap="12" align="center" horizontal="center">
        <Tag size="s" background="brand-alpha-weak" prefixIcon="shield">
          Treasury utility
        </Tag>
        <Heading variant="display-strong-s" align="center">
          {tokenContent.title}
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          align="center"
        >
          {tokenContent.intro}
        </Text>
        <Row
          gap="16"
          wrap
          horizontal="center"
          className="w-full max-w-5xl"
        >
          {tokenContent.highlights.map((highlight) => {
            const linkProps = highlight.href
              ? {
                as: "a" as const,
                href: highlight.href,
                target: "_blank",
                rel: "noreferrer",
              }
              : {};

            return (
              <Column
                key={highlight.label}
                gap="12"
                padding="16"
                radius="l"
                background="surface"
                border="neutral-alpha-medium"
                className="min-w-[240px] flex-1 bg-background/70 shadow-lg shadow-primary/5"
              >
                <Row gap="8" vertical="center">
                  <Icon name={highlight.icon} onBackground="brand-medium" />
                  <Text variant="label-strong-s" onBackground="neutral-strong">
                    {highlight.label}
                  </Text>
                </Row>
                <Text
                  {...linkProps}
                  variant="heading-strong-xs"
                  onBackground="neutral-strong"
                  className={cn(
                    "font-mono",
                    highlight.href
                      ? "transition-colors hover:text-brand-medium"
                      : undefined,
                  )}
                >
                  {highlight.value}
                </Text>
                <Text
                  variant="body-default-s"
                  onBackground="neutral-weak"
                  wrap="balance"
                >
                  {highlight.description}
                </Text>
              </Column>
            );
          })}
        </Row>
        <Column
          gap="12"
          align="center"
          horizontal="center"
          className="w-full max-w-2xl"
        >
          <TonkeeperDeepLinkButtons
            address={tokenContent.treasuryWalletAddress}
            memo="Dynamic Capital Treasury"
            jettonAddress={tokenDescriptor.address}
            className="w-full"
          />
          <Text
            variant="body-default-xs"
            onBackground="neutral-weak"
            align="center"
          >
            Dynamic deep links detect Telegram and mobile contexts to open
            Tonkeeper natively, while HTTPS and ton:// fallbacks stay ready for
            desktop wallets and other clients.
          </Text>
        </Column>
        <Row gap="16" wrap horizontal="center">
          <Row
            gap="8"
            background="page"
            border="neutral-alpha-medium"
            radius="l"
            padding="12"
            vertical="center"
          >
            <Icon name="infinity" onBackground="brand-medium" />
            <Text variant="label-strong-s">
              Max supply {formatNumber(tokenDescriptor.maxSupply)}
            </Text>
          </Row>
          <Row
            gap="8"
            background="page"
            border="neutral-alpha-medium"
            radius="l"
            padding="12"
            vertical="center"
          >
            <Icon name="sparkles" onBackground="brand-medium" />
            <Text variant="label-strong-s">
              Decimals {tokenDescriptor.decimals}
            </Text>
          </Row>
          <Row
            gap="8"
            background="page"
            border="neutral-alpha-medium"
            radius="l"
            padding="12"
            vertical="center"
          >
            <Icon name="currencyDollar" onBackground="brand-medium" />
            <Text variant="label-strong-s">
              Market cap {formatCurrency(tokenContent.marketCapUsd)}
            </Text>
          </Row>
          <Row
            gap="8"
            background="page"
            border="neutral-alpha-medium"
            radius="l"
            padding="12"
            vertical="center"
          >
            <Icon name="chartPie" onBackground="brand-medium" />
            <Text variant="label-strong-s">
              Circulating supply {formatNumber(tokenContent.circulatingSupply)}
              {" "}
              {tokenDescriptor.symbol}
            </Text>
          </Row>
        </Row>
      </Column>

      <Column gap="24" maxWidth={40} fillWidth>
        <Heading variant="heading-strong-l">Utility in motion</Heading>
        <Column gap="16" as="ul">
          {tokenContent.utilities.map((utility) => (
            <Row
              key={utility}
              gap="12"
              as="li"
              background="surface"
              border="neutral-alpha-medium"
              radius="l"
              padding="16"
              vertical="center"
            >
              <Icon name="check" onBackground="brand-medium" />
              <Text variant="body-default-m" onBackground="neutral-weak">
                {utility}
              </Text>
            </Row>
          ))}
        </Column>
      </Column>

      <Column gap="24" maxWidth={40} fillWidth>
        <Heading variant="heading-strong-l">Supply allocation</Heading>
        <Column gap="16">
          {tokenContent.supplySplits.map((split) => (
            <Row
              key={split.label}
              gap="16"
              background="page"
              border="neutral-alpha-medium"
              radius="l"
              padding="20"
              s={{ direction: "column" }}
            >
              <Row gap="12" vertical="center">
                <Icon name={split.icon} onBackground="brand-medium" />
                <Heading variant="heading-strong-m">{split.label}</Heading>
                <Tag size="s" background="brand-alpha-weak">
                  {split.value}
                </Tag>
              </Row>
              <Text variant="body-default-m" onBackground="neutral-weak">
                {split.description}
              </Text>
            </Row>
          ))}
        </Column>
      </Column>

      <Column gap="24" maxWidth={40} fillWidth>
        <Heading variant="heading-strong-l">Lock tiers & multipliers</Heading>
        <Column gap="16">
          {tokenContent.lockTiers.map((tier) => (
            <Row
              key={tier.tier}
              background="surface"
              border="neutral-alpha-medium"
              radius="l"
              padding="20"
              horizontal="between"
              vertical="center"
              s={{ direction: "column", align: "start" }}
            >
              <Column gap="8">
                <Row gap="8" vertical="center">
                  <Heading variant="heading-strong-m">{tier.tier}</Heading>
                  <Tag size="s" background="neutral-alpha-weak">
                    {tier.duration}
                  </Tag>
                  <Tag size="s" background="brand-alpha-weak">
                    {tier.multiplier}
                  </Tag>
                </Row>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  {tier.description}
                </Text>
              </Column>
            </Row>
          ))}
        </Column>
      </Column>

      <Column gap="24" maxWidth={40} fillWidth>
        <Heading variant="heading-strong-l">Active DEX pools</Heading>
        <Column gap="16">
          {tokenContent.dexPools.map((pool) => (
            <Row
              key={pool.pair}
              gap="16"
              background="surface"
              border="neutral-alpha-medium"
              radius="l"
              padding="20"
              s={{ direction: "column" }}
            >
              <Column gap="12" fillWidth>
                <Row gap="12" vertical="center" wrap>
                  <Icon name="repeat" onBackground="brand-medium" />
                  <Heading variant="heading-strong-m">{pool.pair}</Heading>
                  <Tag size="s" background="brand-alpha-weak">
                    {pool.dex}
                  </Tag>
                </Row>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  {pool.description}
                </Text>
                <Column gap="8">
                  <Column gap="4">
                    <Text
                      variant="label-default-s"
                      onBackground="neutral-weak"
                    >
                      Swap URL
                    </Text>
                    <Text
                      as="a"
                      href={pool.url}
                      target="_blank"
                      rel="noreferrer"
                      variant="label-default-s"
                      onBackground="brand-medium"
                      className="break-all"
                    >
                      {pool.url}
                    </Text>
                  </Column>
                  {pool.address
                    ? (
                      <Column gap="4">
                        <Text
                          variant="label-default-s"
                          onBackground="neutral-weak"
                        >
                          Pool address
                        </Text>
                        <Text
                          variant="body-default-m"
                          onBackground="brand-medium"
                          className="font-mono break-all"
                        >
                          {pool.addressLabel ?? pool.address}
                        </Text>
                        {pool.explorerUrl
                          ? (
                            <Text
                              as="a"
                              href={pool.explorerUrl}
                              target="_blank"
                              rel="noreferrer"
                              variant="label-default-s"
                              onBackground="brand-medium"
                              className="flex items-center gap-1"
                            >
                              View on Tonviewer
                              <Icon name="arrowUpRight" />
                            </Text>
                          )
                          : null}
                      </Column>
                    )
                    : null}
                </Column>
              </Column>
            </Row>
          ))}
        </Column>
      </Column>
    </Column>
  );
}
