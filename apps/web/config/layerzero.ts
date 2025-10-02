import { optionalEnvVar } from "@/utils/env";

type LayerZeroEnvironment = "mainnet" | "testnet";

type LayerZeroEndpoint = {
  key: string;
  name: string;
  eid: number;
  network: LayerZeroEnvironment;
  chainId?: number;
  rpcUrl?: string;
  explorerUrl?: string;
};

type LayerZeroConfig = {
  environment: LayerZeroEnvironment;
  endpoints: LayerZeroEndpoint[];
};

const DEFAULT_LAYERZERO_ENVIRONMENT: LayerZeroEnvironment = "mainnet";

const DEFAULT_LAYERZERO_ENDPOINTS: LayerZeroEndpoint[] = [
  {
    key: "ethereum-mainnet",
    name: "Ethereum Mainnet",
    eid: 30101,
    network: "mainnet",
    chainId: 1,
    rpcUrl: "https://rpc.ankr.com/eth",
    explorerUrl: "https://layerzeroscan.com/?network=mainnet&chain=ethereum",
  },
  {
    key: "bnb-chain",
    name: "BNB Smart Chain",
    eid: 30102,
    network: "mainnet",
    chainId: 56,
    rpcUrl: "https://rpc.ankr.com/bsc",
    explorerUrl: "https://layerzeroscan.com/?network=mainnet&chain=bsc",
  },
  {
    key: "avalanche",
    name: "Avalanche C-Chain",
    eid: 30106,
    network: "mainnet",
    chainId: 43114,
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
    explorerUrl: "https://layerzeroscan.com/?network=mainnet&chain=avalanche",
  },
  {
    key: "polygon",
    name: "Polygon PoS",
    eid: 30109,
    network: "mainnet",
    chainId: 137,
    rpcUrl: "https://polygon-rpc.com",
    explorerUrl: "https://layerzeroscan.com/?network=mainnet&chain=polygon",
  },
  {
    key: "arbitrum-one",
    name: "Arbitrum One",
    eid: 30110,
    network: "mainnet",
    chainId: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://layerzeroscan.com/?network=mainnet&chain=arbitrum",
  },
  {
    key: "optimism",
    name: "Optimism",
    eid: 30111,
    network: "mainnet",
    chainId: 10,
    rpcUrl: "https://mainnet.optimism.io",
    explorerUrl: "https://layerzeroscan.com/?network=mainnet&chain=optimism",
  },
  {
    key: "base",
    name: "Base",
    eid: 30184,
    network: "mainnet",
    chainId: 8453,
    rpcUrl: "https://mainnet.base.org",
    explorerUrl: "https://layerzeroscan.com/?network=mainnet&chain=base",
  },
] as const;

function coerceUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  try {
    return new URL(value).toString();
  } catch {
    return undefined;
  }
}

function normaliseEnvironment(value: unknown): LayerZeroEnvironment {
  if (typeof value !== "string") {
    return DEFAULT_LAYERZERO_ENVIRONMENT;
  }

  const normalised = value.trim().toLowerCase();
  if (normalised === "testnet") {
    return "testnet";
  }

  if (normalised !== "mainnet") {
    console.warn(
      `"${value}" is not a recognised LayerZero environment. Falling back to ${DEFAULT_LAYERZERO_ENVIRONMENT}.`,
    );
  }

  return DEFAULT_LAYERZERO_ENVIRONMENT;
}

function deriveKey(name: string, key: string | undefined, eid: number) {
  if (typeof key === "string" && key.trim().length > 0) {
    return key.trim();
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (slug.length > 0) {
    return slug;
  }

  return `endpoint-${eid}`;
}

function normaliseEndpoint(value: unknown): LayerZeroEndpoint | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  const eid = Number(candidate.eid);
  if (!Number.isFinite(eid) || eid <= 0) {
    return null;
  }

  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  if (!name) {
    return null;
  }

  const network = normaliseEnvironment(candidate.network);

  const chainIdRaw = candidate.chainId;
  const chainId = typeof chainIdRaw === "number"
    ? Math.trunc(chainIdRaw)
    : typeof chainIdRaw === "string"
    ? Number.parseInt(chainIdRaw, 10)
    : undefined;

  const resolvedChainId =
    typeof chainId === "number" && Number.isFinite(chainId)
      ? chainId
      : undefined;

  const rpcUrl = coerceUrl(candidate.rpcUrl);
  const explorerUrl = coerceUrl(candidate.explorerUrl);

  const key = deriveKey(name, candidate.key as string | undefined, eid);

  return {
    key,
    name,
    eid,
    network,
    chainId: resolvedChainId,
    rpcUrl,
    explorerUrl,
  } satisfies LayerZeroEndpoint;
}

function parseEndpoints(): LayerZeroEndpoint[] {
  const raw = optionalEnvVar("NEXT_PUBLIC_LAYERZERO_ENDPOINTS");
  if (!raw) {
    return [...DEFAULT_LAYERZERO_ENDPOINTS];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(
        "[layerzero-config] NEXT_PUBLIC_LAYERZERO_ENDPOINTS must be a JSON array; using defaults",
      );
      return [...DEFAULT_LAYERZERO_ENDPOINTS];
    }

    const endpoints = parsed
      .map((value) => normaliseEndpoint(value))
      .filter((endpoint): endpoint is LayerZeroEndpoint => endpoint !== null);

    if (endpoints.length === 0) {
      console.warn(
        "[layerzero-config] NEXT_PUBLIC_LAYERZERO_ENDPOINTS did not contain valid entries; using defaults",
      );
      return [...DEFAULT_LAYERZERO_ENDPOINTS];
    }

    return endpoints;
  } catch (error) {
    console.warn(
      "[layerzero-config] Failed to parse NEXT_PUBLIC_LAYERZERO_ENDPOINTS; using defaults",
      error,
    );
    return [...DEFAULT_LAYERZERO_ENDPOINTS];
  }
}

function parseEnvironment(): LayerZeroEnvironment {
  const raw = optionalEnvVar("NEXT_PUBLIC_LAYERZERO_ENV");
  if (!raw) {
    return DEFAULT_LAYERZERO_ENVIRONMENT;
  }
  return normaliseEnvironment(raw);
}

const environment = parseEnvironment();
const endpoints = parseEndpoints();

export const LAYERZERO_CONFIG: LayerZeroConfig = Object.freeze({
  environment,
  endpoints,
});

export type { LayerZeroConfig, LayerZeroEndpoint, LayerZeroEnvironment };
export { DEFAULT_LAYERZERO_ENDPOINTS, DEFAULT_LAYERZERO_ENVIRONMENT };
