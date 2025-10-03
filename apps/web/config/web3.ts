import { optionalEnvVar } from "@/utils/env";

export type Web3ChainConfig = {
  id: string;
  token: string;
  label: string;
  rpcUrl: string;
  icon?: string;
};

export type Web3RecommendedWallet = {
  name: string;
  url: string;
};

export type Web3AppMetadata = {
  name: string;
  description: string;
  icon: string;
  recommendedInjectedWallets: Web3RecommendedWallet[];
};

export type Web3OnboardConfig = {
  chains: Web3ChainConfig[];
  metadata: Web3AppMetadata;
};

const DEFAULT_CHAINS: Web3ChainConfig[] = [
  {
    id: "0x1",
    token: "ETH",
    label: "Ethereum Mainnet",
    rpcUrl: "https://rpc.ankr.com/eth",
  },
  {
    id: "0xa4b1",
    token: "ETH",
    label: "Arbitrum One",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
  },
  {
    id: "0xa",
    token: "ETH",
    label: "Optimism",
    rpcUrl: "https://mainnet.optimism.io",
  },
  {
    id: "0x2105",
    token: "ETH",
    label: "Base",
    rpcUrl: "https://mainnet.base.org",
  },
  {
    id: "0x89",
    token: "MATIC",
    label: "Polygon PoS",
    rpcUrl: "https://polygon-rpc.com",
  },
  {
    id: "0x38",
    token: "BNB",
    label: "BNB Smart Chain",
    rpcUrl: "https://bsc-dataseed.binance.org",
  },
  {
    id: "0xa86a",
    token: "AVAX",
    label: "Avalanche C-Chain",
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
  },
];

const DEFAULT_METADATA: Web3AppMetadata = {
  name: "Dynamic Capital",
  description:
    "Dynamic Capital trading desk, LayerZero v2 bridge routing, and portfolio tools",
  icon: "/icon-mark.svg",
  recommendedInjectedWallets: [
    { name: "Bitget Wallet", url: "https://bitkeep.com" },
    { name: "MetaMask", url: "https://metamask.io" },
  ],
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseJson(value: string | undefined): unknown {
  if (!isNonEmptyString(value)) {
    return undefined;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn("[web3-config] Failed to parse JSON", error);
    return undefined;
  }
}

function coerceUrl(value: unknown): string | undefined {
  if (!isNonEmptyString(value)) {
    return undefined;
  }
  try {
    return new URL(value).toString();
  } catch {
    return undefined;
  }
}

function normaliseChain(value: unknown): Web3ChainConfig | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const id = isNonEmptyString(candidate.id) ? candidate.id.trim() : undefined;
  const token = isNonEmptyString(candidate.token)
    ? candidate.token.trim().toUpperCase()
    : undefined;
  const label = isNonEmptyString(candidate.label)
    ? candidate.label.trim()
    : undefined;
  const rpcUrl = coerceUrl(candidate.rpcUrl);
  const icon = coerceUrl(candidate.icon);

  if (!id || !token || !label || !rpcUrl) {
    return null;
  }

  return { id, token, label, rpcUrl, icon };
}

function parseChains(): Web3ChainConfig[] {
  const rawChains = optionalEnvVar("NEXT_PUBLIC_WEB3_CHAINS");
  const parsed = parseJson(rawChains);

  if (Array.isArray(parsed)) {
    const chains = parsed
      .map(normaliseChain)
      .filter((chain): chain is Web3ChainConfig => chain !== null);

    if (chains.length > 0) {
      return chains;
    }

    console.warn(
      "[web3-config] NEXT_PUBLIC_WEB3_CHAINS did not contain any valid entries; falling back to defaults",
    );
  } else if (parsed !== undefined) {
    console.warn(
      "[web3-config] NEXT_PUBLIC_WEB3_CHAINS must be a JSON array; falling back to defaults",
    );
  }

  return DEFAULT_CHAINS;
}

function normaliseWallet(value: unknown): Web3RecommendedWallet | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const name = isNonEmptyString(candidate.name)
    ? candidate.name.trim()
    : undefined;
  const url = coerceUrl(candidate.url);

  if (!name || !url) {
    return null;
  }

  return { name, url };
}

function parseRecommendedWallets(): Web3RecommendedWallet[] {
  const rawWallets = optionalEnvVar("NEXT_PUBLIC_WEB3_RECOMMENDED_WALLETS");
  const parsed = parseJson(rawWallets);

  if (Array.isArray(parsed)) {
    const wallets = parsed
      .map(normaliseWallet)
      .filter((wallet): wallet is Web3RecommendedWallet => wallet !== null);

    if (wallets.length > 0) {
      return wallets;
    }

    console.warn(
      "[web3-config] NEXT_PUBLIC_WEB3_RECOMMENDED_WALLETS did not contain any valid entries; using defaults",
    );
  } else if (parsed !== undefined) {
    console.warn(
      "[web3-config] NEXT_PUBLIC_WEB3_RECOMMENDED_WALLETS must be a JSON array; using defaults",
    );
  }

  return DEFAULT_METADATA.recommendedInjectedWallets;
}

function resolveMetadata(): Web3AppMetadata {
  const name = optionalEnvVar("NEXT_PUBLIC_WEB3_APP_NAME")?.trim();
  const description = optionalEnvVar("NEXT_PUBLIC_WEB3_APP_DESCRIPTION")
    ?.trim();
  const icon = coerceUrl(optionalEnvVar("NEXT_PUBLIC_WEB3_APP_ICON")) ??
    DEFAULT_METADATA.icon;
  const recommendedInjectedWallets = parseRecommendedWallets();

  return {
    name: name && name.length > 0 ? name : DEFAULT_METADATA.name,
    description: description && description.length > 0
      ? description
      : DEFAULT_METADATA.description,
    icon,
    recommendedInjectedWallets,
  };
}

const chains = parseChains();
const metadata = resolveMetadata();

export const WEB3_CONFIG: Web3OnboardConfig = Object.freeze({
  chains,
  metadata,
});

export const DEFAULT_WEB3_CHAINS = DEFAULT_CHAINS;
export const DEFAULT_WEB3_METADATA = DEFAULT_METADATA;
