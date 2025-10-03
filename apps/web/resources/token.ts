import { z } from "zod";

import jettonMetadata from "../../../dynamic-capital-ton/contracts/jetton/metadata.json" assert {
  type: "json",
};
import type { IconName } from "./icons";

const normalizeTonAddress = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.replace(/^ton:\/\//i, "");
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

const jettonMetadataSchema = z
  .object({
    name: z.string().trim().min(1, "Jetton metadata name is required."),
    symbol: z.string().trim().min(1, "Jetton metadata symbol is required."),
    description: z
      .string()
      .trim()
      .min(1, "Jetton metadata description is required."),
    decimals: z.number().int().nonnegative(),
    address: z.string().trim().min(1, "Jetton metadata address is required."),
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
const OPERATIONS_TREASURY_WALLET =
  "EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq";
const OPERATIONS_TREASURY_EXPLORER_URL =
  `https://tonviewer.com/${OPERATIONS_TREASURY_WALLET}`;
const buildJettonExplorerUrl = (address?: string) => {
  const normalizedAddress = normalizeTonAddress(address);
  return normalizedAddress
    ? `https://tonviewer.com/jetton/${normalizedAddress}`
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

const tokenPath = "/token" as const;
const tokenJettonExplorerUrl = buildJettonExplorerUrl(tokenDescriptor.address);
const tokenTitle = `${tokenDescriptor.name} (${tokenDescriptor.symbol})`;
const tokenIntro =
  "The membership currency that powers Dynamic Capital automations, treasury governance, and community rewards.";
const tokenOgImage = `/api/og/generate?title=${encodeURIComponent(tokenTitle)}`;

const tokenUtilities = [
  "Redeem on-chain for VIP membership credits and automation boosts.",
  "Stake into the auto-invest pool to participate in weekly performance.",
  "Vote on treasury moves through the 48-hour guarded governance window.",
] as const;

const tokenHighlights = [
  {
    label: "Dynamic Capital Token",
    value: `${tokenDescriptor.symbol} on TON`,
    description: "Utility and governance jetton anchored to desk performance.",
    icon: "sparkles",
  },
  ...(tokenDescriptor.address
    ? [
      {
        label: "Jetton master",
        value: shortenTonAddress(tokenDescriptor.address),
        description:
          "Canonical DCT master contract securing supply, metadata, and mint controls.",
        icon: "openLink",
        href: tokenJettonExplorerUrl,
      } satisfies TokenHighlight,
    ]
    : []),
  {
    label: "Treasury TON wallet",
    value: shortenTonAddress(OPERATIONS_TREASURY_WALLET),
    description:
      "Operations multisig safeguarding buybacks, burns, and rewards.",
    icon: "wallet",
    href: OPERATIONS_TREASURY_EXPLORER_URL,
  },
  {
    label: "Market cap",
    value: formatCurrency(TGE_MARKET_CAP_USD),
    description:
      "Fully collateralised by Dynamic Capital desk assets at launch.",
    icon: "currencyDollar",
  },
  {
    label: "Circulating supply",
    value: `${formatNumber(TGE_CIRCULATING_SUPPLY)} ${tokenDescriptor.symbol}`,
    description:
      "TGE float powering staking, rewards, and liquidity programmes.",
    icon: "chartPie",
  },
] satisfies readonly TokenHighlight[];

const tokenSupplySplits = [
  {
    label: "Operations",
    value: "60%",
    description:
      "Fuel day-to-day desk execution, analytics, and mentor coverage.",
    icon: "sparkles",
  },
  {
    label: "Auto-invest pool",
    value: "30%",
    description:
      "Deploy liquidity into strategies the desk validates each epoch.",
    icon: "rocket",
  },
  {
    label: "Buyback & burn",
    value: "10%",
    description:
      "Stabilize the treasury with scheduled market operations and burns.",
    icon: "repeat",
  },
] as const satisfies readonly SupplySplit[];

const tokenLockTiers = [
  {
    tier: "Bronze",
    duration: "3 months",
    multiplier: "1.2×",
    description:
      "Starter tier that unlocks curated market briefs and limited drops.",
  },
  {
    tier: "Silver",
    duration: "6 months",
    multiplier: "1.5×",
    description:
      "Enhance reward flow with priority access to automation templates.",
  },
  {
    tier: "Gold",
    duration: "12 months",
    multiplier: "2.0×",
    description:
      "Max utility with VIP desk passes, mentor escalations, and beta slots.",
  },
] as const satisfies readonly LockTier[];

const tokenDexPools = [
  {
    dex: "STON.fi",
    pair: "DCT/USDT",
    url: "https://app.ston.fi/swap?from=USDT&to=DCT",
    description:
      "Anchor the treasury's USD peg with a stablecoin pool that supports fiat settlements and OTC conversions.",
  },
  {
    dex: "DeDust",
    pair: "DCT/TON",
    url: "https://dedust.io/swap/TON-DCT",
    description:
      "Route native TON liquidity for buybacks, burns, and member swaps directly against the treasury's base asset.",
  },
] as const satisfies readonly DexPool[];

const tokenSameAs = uniqueStrings([
  ...(tokenMetadata.sameAs ?? []),
  tokenDescriptor.externalUrl,
  ...tokenDexPools.map((pool) => pool.url),
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
};

export { tokenContent, tokenDescriptor };
