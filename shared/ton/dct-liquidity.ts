import {
  TON_MAINNET_DEDUST_DCT_JETTON_WALLET,
  TON_MAINNET_DEDUST_DCT_TON_POOL,
  TON_MAINNET_STONFI_DCT_JETTON_WALLET,
  TON_MAINNET_STONFI_ROUTER,
} from "./mainnet-addresses";

const buildTonviewerAccountUrl = (address: string) =>
  `https://tonviewer.com/${address}`;

export interface DctDexPoolDefinition {
  readonly dex: string;
  readonly pair: string;
  readonly swapUrl: string;
  readonly description: string;
  readonly poolAddress?: string;
  readonly poolExplorerUrl?: string;
  readonly jettonWalletAddress?: string;
  readonly jettonWalletExplorerUrl?: string;
}

export const DCT_DEX_POOLS: readonly DctDexPoolDefinition[] = Object.freeze([
  {
    dex: "STON.fi",
    pair: "DCT/TON",
    swapUrl: "https://app.ston.fi/swap?from=TON&to=DCT",
    description:
      "Primary TON DEX route delivering deep DCT/TON liquidity for treasury operations and member swaps.",
    poolAddress: TON_MAINNET_STONFI_ROUTER,
    poolExplorerUrl: buildTonviewerAccountUrl(TON_MAINNET_STONFI_ROUTER),
    jettonWalletAddress: TON_MAINNET_STONFI_DCT_JETTON_WALLET,
    jettonWalletExplorerUrl: buildTonviewerAccountUrl(
      TON_MAINNET_STONFI_DCT_JETTON_WALLET,
    ),
  },
  {
    dex: "DeDust",
    pair: "DCT/USDT",
    swapUrl: "https://dedust.io/swap/USDT-DCT",
    description:
      "Stablecoin routing venue pairing DCT with USDT for treasury hedging and settlement flows across TON and bridged assets.",
  },
  {
    dex: "DeDust",
    pair: "DCT/TON",
    swapUrl: "https://dedust.io/swap/TON-DCT",
    description:
      "Secondary routing venue leveraging DeDust's TON-native liquidity network for balanced execution.",
    poolAddress: TON_MAINNET_DEDUST_DCT_TON_POOL,
    poolExplorerUrl: buildTonviewerAccountUrl(TON_MAINNET_DEDUST_DCT_TON_POOL),
    jettonWalletAddress: TON_MAINNET_DEDUST_DCT_JETTON_WALLET,
    jettonWalletExplorerUrl: buildTonviewerAccountUrl(
      TON_MAINNET_DEDUST_DCT_JETTON_WALLET,
    ),
  },
]);
