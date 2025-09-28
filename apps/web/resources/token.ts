import jettonMetadata from "../../../dynamic-capital-ton/contracts/jetton/metadata.json" assert {
  type: "json",
};
import type { IconName } from "./icons";

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
  sameAs: readonly string[];
};

type TokenDescriptor = {
  name: string;
  symbol: string;
  description: string;
  decimals: number;
  maxSupply: number;
  externalUrl?: string;
};

const tokenDescriptor: TokenDescriptor = {
  name: jettonMetadata.name,
  symbol: jettonMetadata.symbol,
  description: jettonMetadata.description,
  decimals: jettonMetadata.decimals,
  maxSupply: 100_000_000,
  externalUrl: jettonMetadata.external_url,
};

const tokenPath = "/token" as const;
const tokenTitle = `${tokenDescriptor.name} (${tokenDescriptor.symbol})`;
const tokenIntro =
  "The membership currency that powers Dynamic Capital automations, treasury governance, and community rewards.";
const tokenOgImage = `/api/og/generate?title=${encodeURIComponent(tokenTitle)}`;

const tokenUtilities = [
  "Redeem on-chain for VIP membership credits and automation boosts.",
  "Stake into the auto-invest pool to participate in weekly performance.",
  "Vote on treasury moves through the 48-hour guarded governance window.",
] as const;

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

const tokenSameAs = tokenDexPools.map((pool) => pool.url) as readonly string[];

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
  sameAs: tokenSameAs,
};

export { tokenContent, tokenDescriptor };
