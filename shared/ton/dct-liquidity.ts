import {
  TON_MAINNET_DEDUST_DCT_JETTON_WALLET,
  TON_MAINNET_DEDUST_DCT_TON_POOL,
  TON_MAINNET_JETTON_MASTER,
  TON_MAINNET_STONFI_DCT_JETTON_WALLET,
  TON_MAINNET_STONFI_DCT_TON_POOL,
  TON_MAINNET_SWAPCOFFEE_DCT_JETTON_WALLET,
  TON_MAINNET_SWAPCOFFEE_DCT_TON_POOL,
} from "./mainnet-addresses.ts";

const buildTonviewerAccountUrl = (address: string) =>
  `https://tonviewer.com/${address}`;

export interface DctDexPoolDefinition {
  readonly dex: string;
  readonly pair: string;
  readonly swapUrl: string;
  readonly description: string;
  readonly poolAddress: string;
  readonly poolExplorerUrl: string;
  readonly metadataUrl?: string;
  readonly jettonWalletAddress: string;
  readonly jettonWalletExplorerUrl: string;
  readonly lpJettonExplorerUrl?: string;
  readonly dexScreenerId?: string;
  readonly dexScreenerPairUrl?: string;
  readonly geckoTerminalPoolUrl?: string;
}

export const DCT_DEX_POOLS: readonly DctDexPoolDefinition[] = Object.freeze([
  {
    dex: "STON.fi",
    pair: "DCT/TON",
    swapUrl:
      `https://app.ston.fi/swap?from=TON&to=DCT&chartVisible=true&chartInterval=24h&ft=TON&tt=${TON_MAINNET_JETTON_MASTER}`,
    description:
      "Primary TON DEX route delivering deep DCT/TON liquidity for treasury operations and member swaps.",
    poolAddress: TON_MAINNET_STONFI_DCT_TON_POOL,
    poolExplorerUrl: buildTonviewerAccountUrl(TON_MAINNET_STONFI_DCT_TON_POOL),
    metadataUrl:
      "https://meta.ston.fi/lp/v1/0:31876BC3DD431F36B176F692A5E96B0ECF1AEDEBFA76497ACD2F3661D6FBACD3.json",
    jettonWalletAddress: TON_MAINNET_STONFI_DCT_JETTON_WALLET,
    jettonWalletExplorerUrl: buildTonviewerAccountUrl(
      TON_MAINNET_STONFI_DCT_JETTON_WALLET,
    ),
    lpJettonExplorerUrl:
      "https://tonviewer.com/jetton/0:31876bc3dd431f36b176f692a5e96b0ecf1aedebfa76497acd2f3661d6fbacd3",
    dexScreenerId: "stonfi",
    dexScreenerPairUrl:
      `https://dexscreener.com/ton/${TON_MAINNET_STONFI_DCT_TON_POOL.toLowerCase()}`,
    geckoTerminalPoolUrl:
      "https://www.geckoterminal.com/ton/pools/EQAxh2vD3UMfNrF29pKl6WsOzxrt6_p2SXrNLzZh1vus0_MI",
  },
  {
    dex: "DeDust",
    pair: "DCT/TON",
    swapUrl: `https://dedust.io/swap/TON/${TON_MAINNET_JETTON_MASTER}`,
    description:
      "Secondary routing venue leveraging DeDust's TON-native liquidity network for balanced execution.",
    poolAddress: TON_MAINNET_DEDUST_DCT_TON_POOL,
    poolExplorerUrl: buildTonviewerAccountUrl(TON_MAINNET_DEDUST_DCT_TON_POOL),
    metadataUrl:
      "https://api.dedust.io/v2/pools/0:d3278947b93e817536048a8f7d50c64d0bd873950f937e803d4c7aefcab2ee98/metadata",
    jettonWalletAddress: TON_MAINNET_DEDUST_DCT_JETTON_WALLET,
    jettonWalletExplorerUrl: buildTonviewerAccountUrl(
      TON_MAINNET_DEDUST_DCT_JETTON_WALLET,
    ),
    lpJettonExplorerUrl:
      "https://tonviewer.com/jetton/0:d3278947b93e817536048a8f7d50c64d0bd873950f937e803d4c7aefcab2ee98",
    dexScreenerId: "dedust",
    dexScreenerPairUrl:
      `https://dexscreener.com/ton/${TON_MAINNET_DEDUST_DCT_TON_POOL.toLowerCase()}`,
  },
  {
    dex: "swap.coffee",
    pair: "TON/DCT",
    swapUrl: `https://swap.coffee/dex?st=${TON_MAINNET_JETTON_MASTER}`,
    description:
      "Aggregator route that blends venue quotes while exposing native TON⇄DCT liquidity for partners and bots.",
    poolAddress: TON_MAINNET_SWAPCOFFEE_DCT_TON_POOL,
    poolExplorerUrl: buildTonviewerAccountUrl(TON_MAINNET_SWAPCOFFEE_DCT_TON_POOL),
    metadataUrl:
      "https://lp.swap.coffee/0:03e561ae336bb09e406adf43c14bf4669703f95408fe2b35dade58fd8c99056a/metadata",
    jettonWalletAddress: TON_MAINNET_SWAPCOFFEE_DCT_JETTON_WALLET,
    jettonWalletExplorerUrl: buildTonviewerAccountUrl(
      TON_MAINNET_SWAPCOFFEE_DCT_JETTON_WALLET,
    ),
    lpJettonExplorerUrl:
      "https://tonviewer.com/jetton/0:03e561ae336bb09e406adf43c14bf4669703f95408fe2b35dade58fd8c99056a",
  },
]);
