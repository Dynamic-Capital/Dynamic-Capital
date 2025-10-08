export interface DctOmnichainLinkDefinition {
  readonly label: string;
  readonly href: string;
}

export type DctOmnichainStatus = "enabled" | "monitoring" | "beta";

export interface DctOmnichainRouteDefinition {
  readonly key: string;
  readonly label: string;
  readonly provider: string;
  readonly networks: readonly string[];
  readonly status: DctOmnichainStatus;
  readonly description: string;
  readonly links: readonly DctOmnichainLinkDefinition[];
}

export const DCT_OMNICHAIN_ROUTES: readonly DctOmnichainRouteDefinition[] =
  Object.freeze([
    {
      key: "dedust-usdt",
      label: "DeDust DCT/USDT routing",
      provider: "DeDust",
      networks: ["TON", "USDT (TRC-20)"],
      status: "enabled",
      description:
        "Treasury-curated DeDust liquidity links DCT to USDT so desks can settle subscriptions, hedge inventory, and balance cross-chain inflows without leaving TON.",
      links: Object.freeze([
        {
          label: "Swap on DeDust",
          href: "https://dedust.io/swap/USDT-DCT",
        },
        {
          label: "Liquidity SOP",
          href: "https://dynamiccapital.ai/docs/tonstarter/liquidity-sop",
        },
      ]),
    },
    {
      key: "layerzero-ethereum",
      label: "LayerZero Ethereum endpoint",
      provider: "LayerZero v2",
      networks: ["TON", "Ethereum"],
      status: "enabled",
      description:
        "LayerZero v2 messaging keeps DCT mirrored on Ethereum, enabling withdrawals and treasury sync with mainnet DeFi venues.",
      links: Object.freeze([
        {
          label: "LayerZeroScan (Ethereum)",
          href: "https://layerzeroscan.com/?network=mainnet&chain=ethereum",
        },
        {
          label: "Developer docs",
          href: "https://docs.layerzero.network/v2/developers/evm/mainnet/ethereum",
        },
      ]),
    },
    {
      key: "layerzero-bnb",
      label: "LayerZero BNB endpoint",
      provider: "LayerZero v2",
      networks: ["TON", "BNB Smart Chain"],
      status: "enabled",
      description:
        "BNB Chain connectivity mirrors the Ethereum route so DCT can traverse LayerZero's mesh for Asia-Pacific market makers and custodians.",
      links: Object.freeze([
        {
          label: "LayerZeroScan (BNB Chain)",
          href: "https://layerzeroscan.com/?network=mainnet&chain=bsc",
        },
        {
          label: "Developer docs",
          href: "https://docs.layerzero.network/v2/developers/evm/mainnet/bnb-chain",
        },
      ]),
    },
  ]);
