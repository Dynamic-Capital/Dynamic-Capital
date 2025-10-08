import { z } from "zod";

import jettonMetadata from "../../../dynamic-capital-ton/contracts/jetton/metadata.json" assert {
  type: "json",
};
import { TON_MAINNET_OPERATIONS_TREASURY } from "../../../shared/ton/mainnet-addresses";
import {
  DCT_ACTION_PAD,
  type DctActionPadDefinition,
} from "../../../shared/ton/dct-action-pad";
import { DCT_DEX_POOLS } from "../../../shared/ton/dct-liquidity";
import type { IconName } from "./icons";

const TON_URL_SCHEME_PATTERN = /^ton:\/\//i;
const TON_FRIENDLY_ADDRESS_PATTERN = /^[A-Za-z0-9_-]{48}$/;
const TON_RAW_ADDRESS_PATTERN = /^[0-3]:[0-9a-fA-F]{64}$/;

const sanitizeTonAddress = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("TON address cannot be empty.");
  }

  const normalized = trimmed.replace(TON_URL_SCHEME_PATTERN, "");

  if (TON_FRIENDLY_ADDRESS_PATTERN.test(normalized)) {
    return normalized;
  }

  if (TON_RAW_ADDRESS_PATTERN.test(normalized)) {
    return normalized.toLowerCase();
  }

  throw new Error(
    "TON address must be provided in friendly (base64url) or raw hex format.",
  );
};

const normalizeTonAddress = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return sanitizeTonAddress(trimmed);
};

const uniqueStrings = (
  values: readonly (string | undefined)[],
): readonly string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (!value) {
      continue;
    }

    const key = value.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(value);
  }

  return Object.freeze(result);
};

const httpsUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => value.startsWith("https://"), {
    message: "Only https URLs are supported in token metadata.",
  });

const tonAddressSchema = z
  .string()
  .min(1, "TON address is required.")
  .transform((value, ctx) => {
    try {
      return sanitizeTonAddress(value);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof Error
          ? error.message
          : "Invalid TON address format provided.",
      });
      return z.NEVER;
    }
  });

const jettonMetadataSchema = z
  .object({
    name: z.string().trim().min(1, "Jetton metadata name is required."),
    symbol: z.string().trim().min(1, "Jetton metadata symbol is required."),
    description: z
      .string()
      .trim()
      .min(1, "Jetton metadata description is required."),
    decimals: z.number().int().nonnegative(),
    address: tonAddressSchema,
    image: httpsUrlSchema.optional(),
    external_url: httpsUrlSchema.optional(),
    sameAs: z.array(httpsUrlSchema).optional(),
    attributes: z
      .array(
        z.object({
          trait_type: z.string().trim().min(1),
          value: z.union([z.string(), z.number(), z.boolean()]),
          display_type: z.string().trim().optional(),
        }),
      )
      .optional(),
  })
  .passthrough();

const tokenMetadata = jettonMetadataSchema.parse(jettonMetadata);

const TGE_CIRCULATING_SUPPLY = 13_000_000;
const TGE_MARKET_CAP_USD = 13_000_000;
const OPERATIONS_TREASURY_WALLET = tonAddressSchema.parse(
  TON_MAINNET_OPERATIONS_TREASURY,
);
const OPERATIONS_TREASURY_EXPLORER_URL =
  `https://tonviewer.com/${OPERATIONS_TREASURY_WALLET}`;
const buildTonviewerAccountUrl = (address?: string) => {
  const normalizedAddress = normalizeTonAddress(address);
  return normalizedAddress
    ? `https://tonviewer.com/${normalizedAddress}`
    : undefined;
};
const buildJettonExplorerUrl = (address?: string) => {
  const normalizedAddress = normalizeTonAddress(address);
  return normalizedAddress
    ? `https://tonviewer.com/jetton/${normalizedAddress}`
    : undefined;
};

const buildTonscanAccountUrl = (address?: string) => {
  const normalizedAddress = normalizeTonAddress(address);
  return normalizedAddress
    ? `https://tonscan.org/address/${normalizedAddress}`
    : undefined;
};

const buildTonscanJettonUrl = (address?: string) => {
  const normalizedAddress = normalizeTonAddress(address);
  return normalizedAddress
    ? `https://tonscan.org/jetton/${normalizedAddress}`
    : undefined;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const shortenTonAddress = (value: string, visible = 6) => {
  const normalizedValue = normalizeTonAddress(value) ?? value;

  if (normalizedValue.length <= visible * 2) {
    return normalizedValue;
  }

  const head = normalizedValue.slice(0, visible);
  const tail = normalizedValue.slice(-visible);
  return `${head}…${tail}`;
};

type DexPool = {
  dex: string;
  pair: string;
  url: string;
  description: string;
  address?: string;
  addressLabel?: string;
  explorerUrl?: string;
  jettonWalletUrl?: string;
  metadataUrl?: string;
};

type SupplySplit = {
  label: string;
  value: string;
  description: string;
  icon: IconName;
};

type TokenHighlight = {
  label: string;
  value: string;
  description: string;
  icon: IconName;
  href?: string;
};

type LockTier = {
  tier: string;
  duration: string;
  multiplier: string;
  description: string;
};

type TokenContent = {
  path: string;
  title: string;
  description: string;
  intro: string;
  ogImage: string;
  utilities: readonly string[];
  supplySplits: readonly SupplySplit[];
  lockTiers: readonly LockTier[];
  dexPools: readonly DexPool[];
  highlights: readonly TokenHighlight[];
  sameAs: readonly string[];
  circulatingSupply: number;
  marketCapUsd: number;
  treasuryWalletAddress: string;
  treasuryWalletUrl: string;
  treasuryWalletTonscanUrl?: string;
  actionPad: DctActionPadDefinition;
};

type TokenDescriptor = {
  name: string;
  symbol: string;
  description: string;
  decimals: number;
  maxSupply: number;
  externalUrl?: string;
  address?: string;
  image?: string;
};

const normalizedTokenAddress = normalizeTonAddress(tokenMetadata.address);

function assertInvariant(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const tokenDescriptor = {
  name: tokenMetadata.name,
  symbol: tokenMetadata.symbol,
  description: tokenMetadata.description,
  decimals: tokenMetadata.decimals,
  maxSupply: 100_000_000,
  externalUrl: tokenMetadata.external_url,
  address: normalizedTokenAddress,
  image: tokenMetadata.image,
} satisfies TokenDescriptor;

assertInvariant(
  !tokenDescriptor.address ||
    tokenDescriptor.address === sanitizeTonAddress(tokenDescriptor.address),
  "Token descriptor address failed normalization.",
);

assertInvariant(
  TGE_CIRCULATING_SUPPLY <= tokenDescriptor.maxSupply,
  "Circulating supply cannot exceed the maximum supply.",
);

const tokenPath = "/token" as const;
const tokenJettonExplorerUrl = buildJettonExplorerUrl(tokenDescriptor.address);
const tokenTitle = `${tokenDescriptor.name} (${tokenDescriptor.symbol})`;
const tokenIntro =
  "DCT is the Dynamic Capital governance and utility jetton on TON, unlocking automation boosts, treasury voting, and membership rewards.";
const tokenOgImage = `/api/og/generate?title=${encodeURIComponent(tokenTitle)}`;

const tokenUtilities = Object.freeze([
  "Amplify automation throughput with boost credits redeemable on-chain.",
  "Stake into the auto-invest vault to share in validated strategy performance.",
  "Shape treasury allocations by voting on proposals during guarded governance windows.",
]);

assertInvariant(
  tokenUtilities.length > 0,
  "Token utilities must contain at least one entry.",
);

const tokenHighlights = Object.freeze([
  {
    label: "Token profile",
    value: `${tokenDescriptor.symbol} on TON`,
    description:
      "Governance and utility jetton for the Dynamic Capital automation ecosystem.",
    icon: "sparkles",
  },
  ...(tokenDescriptor.address
    ? [
      {
        label: "Jetton master",
        value: shortenTonAddress(tokenDescriptor.address),
        description:
          "Canonical DCT master contract anchoring supply, metadata, and mint controls on-chain.",
        icon: "openLink",
        href: tokenJettonExplorerUrl,
      } satisfies TokenHighlight,
    ]
    : []),
  {
    label: "Treasury TON wallet",
    value: shortenTonAddress(OPERATIONS_TREASURY_WALLET),
    description:
      "Operations multisig executing buybacks, burns, and community distributions.",
    icon: "wallet",
    href: OPERATIONS_TREASURY_EXPLORER_URL,
  },
  {
    label: "Market cap",
    value: formatCurrency(TGE_MARKET_CAP_USD),
    description:
      "Initial fully collateralised market capitalisation at the token generation event.",
    icon: "currencyDollar",
  },
  {
    label: "Circulating supply",
    value: `${formatNumber(TGE_CIRCULATING_SUPPLY)} ${tokenDescriptor.symbol}`,
    description:
      "Token generation event float allocated to staking, rewards, and liquidity programs.",
    icon: "chartPie",
  },
]) satisfies readonly TokenHighlight[];

const tokenSupplySplits = Object.freeze([
  {
    label: "Operations",
    value: "60%",
    description:
      "Funds ongoing desk execution, analytics, and human capital initiatives.",
    icon: "sparkles",
  },
  {
    label: "Auto-invest pool",
    value: "30%",
    description:
      "Deploys liquidity into strategies validated by the desk each epoch.",
    icon: "rocket",
  },
  {
    label: "Buyback & burn",
    value: "10%",
    description:
      "Stabilises the treasury with scheduled market operations and burns.",
    icon: "repeat",
  },
]) satisfies readonly SupplySplit[];

const tokenLockTiers = Object.freeze([
  {
    tier: "Bronze",
    duration: "3 months",
    multiplier: "1.2×",
    description:
      "Starter tier granting curated market briefs and limited automation drops.",
  },
  {
    tier: "Silver",
    duration: "6 months",
    multiplier: "1.5×",
    description:
      "Enhances reward flow with priority access to automation templates.",
  },
  {
    tier: "Gold",
    duration: "12 months",
    multiplier: "2.0×",
    description:
      "Delivers maximum utility through VIP desk access, mentor escalations, and beta slots.",
  },
]) satisfies readonly LockTier[];

const tokenDexPools = Object.freeze(
  DCT_DEX_POOLS.map((pool) => ({
    dex: pool.dex,
    pair: pool.pair,
    url: pool.swapUrl,
    description: pool.description,
    address: pool.poolAddress,
    addressLabel: shortenTonAddress(pool.poolAddress),
    explorerUrl: pool.poolExplorerUrl,
    jettonWalletUrl: pool.jettonWalletExplorerUrl,
    metadataUrl: pool.metadataUrl,
  } satisfies DexPool)),
) as readonly DexPool[];

const tokenSameAs = uniqueStrings([
  ...(tokenMetadata.sameAs ?? []),
  tokenDescriptor.externalUrl,
  ...tokenDexPools.map((pool) => pool.url),
  ...tokenDexPools.map((pool) => pool.explorerUrl),
  ...tokenDexPools.map((pool) => pool.jettonWalletUrl),
  ...tokenDexPools.map((pool) => pool.metadataUrl),
  tokenJettonExplorerUrl,
]);

const tokenContent: TokenContent = {
  path: tokenPath,
  title: tokenTitle,
  description: tokenDescriptor.description,
  intro: tokenIntro,
  ogImage: tokenOgImage,
  utilities: tokenUtilities,
  supplySplits: tokenSupplySplits,
  lockTiers: tokenLockTiers,
  dexPools: tokenDexPools,
  highlights: tokenHighlights,
  sameAs: tokenSameAs,
  circulatingSupply: TGE_CIRCULATING_SUPPLY,
  marketCapUsd: TGE_MARKET_CAP_USD,
  treasuryWalletAddress: OPERATIONS_TREASURY_WALLET,
  treasuryWalletUrl: OPERATIONS_TREASURY_EXPLORER_URL,
  treasuryWalletTonscanUrl: buildTonscanAccountUrl(OPERATIONS_TREASURY_WALLET),
  actionPad: DCT_ACTION_PAD,
};

export {
  buildJettonExplorerUrl,
  buildTonscanAccountUrl,
  buildTonscanJettonUrl,
  buildTonviewerAccountUrl,
  shortenTonAddress,
  tokenContent,
  tokenDescriptor,
};
