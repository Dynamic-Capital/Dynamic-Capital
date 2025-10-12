export interface TonMainnetAccountDefinition {
  readonly key: string;
  readonly label: string;
  readonly friendlyAddress: string;
  readonly nonBounceableAddress?: string;
  readonly description?: string;
  readonly tonDns?: string;
  readonly explorerUrl?: string;
}

export const TON_MAINNET_PRIMARY_MULTISIG =
  "UQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOK0G";

export const TON_MAINNET_OPERATIONS_TREASURY =
  TON_MAINNET_PRIMARY_MULTISIG;

export const TON_MAINNET_DAO_MULTISIG =
  "EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y";

export const TON_MAINNET_DAO_MULTISIG_NON_BOUNCEABLE =
  "UQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx6N3";

export const TON_MAINNET_INTAKE_WALLET = TON_MAINNET_PRIMARY_MULTISIG;

export const TON_MAINNET_JETTON_MASTER =
  "EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y";

export const TON_MAINNET_DAO_MULTISIG_EXPLORER_URL =
  "https://explorer.toncoin.org/account?account=EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y";

export const TON_MAINNET_DCT_TREASURY_ALIAS = "dynamiccapital.ton";
export const TON_MAINNET_DCT_TREASURY_WALLET =
  "EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq";
export const TON_MAINNET_DCT_TREASURY_WALLET_NON_BOUNCEABLE =
  "UQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdnidWv";

const DCT_TREASURY_TRANSFER_MEMO = "Dynamic Capital DCT deposit";

export const TON_MAINNET_DCT_TREASURY_TONVIEWER_URL =
  `https://tonviewer.com/${TON_MAINNET_DCT_TREASURY_WALLET}`;

export const TON_MAINNET_DCT_TREASURY_TONKEEPER_LINK =
  `https://app.tonkeeper.com/transfer/${TON_MAINNET_DCT_TREASURY_ALIAS}` +
  `?jetton=${TON_MAINNET_JETTON_MASTER}` +
  `&text=${encodeURIComponent(DCT_TREASURY_TRANSFER_MEMO)}`;

export const TON_MAINNET_DCT_TREASURY_TON_TRANSFER_LINK =
  `ton://transfer/${TON_MAINNET_DCT_TREASURY_ALIAS}` +
  `?jetton=${TON_MAINNET_JETTON_MASTER}` +
  `&text=${encodeURIComponent(DCT_TREASURY_TRANSFER_MEMO)}`;

export const TON_MAINNET_DCT_TREASURY_MEMO = DCT_TREASURY_TRANSFER_MEMO;

export const TON_MAINNET_STONFI_ROUTER =
  "EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt";

export const TON_MAINNET_STONFI_DCT_TON_POOL =
  "EQAxh2vD3UMfNrF29pKl6WsOzxrt6_p2SXrNLzZh1vus0_MI";

export const TON_MAINNET_DCT_WALLET_V5R1 =
  "EQDTJ4lHuT6BdTYEio99UMZNC9hzlQ-TfoA9THrvyrLumEFm";

export const TON_MAINNET_STONFI_DCT_JETTON_WALLET =
  "EQAtgX_AkOJEEDxYICWRlS9HtNFMrujgruQJLanYHJURCxB3";

export const TON_MAINNET_DEDUST_DCT_JETTON_WALLET =
  "EQC_W1HQhQhf3XyyNd-FW-K6lWFfSbDi5L2GqbJ7Px2eZzVz";

export const TON_MAINNET_DEDUST_DCT_TON_POOL =
  "EQDTJ4lHuT6BdTYEio99UMZNC9hzlQ-TfoA9THrvyrLumEFm";

export const TON_MAINNET_SWAPCOFFEE_DCT_TON_POOL =
  "EQAD5WGuM2uwnkBq30PBS_RmlwP5VAj-KzXa3lj9jJkFaj-D";

export const TON_MAINNET_SWAPCOFFEE_DCT_JETTON_WALLET =
  "EQAT363NPdduFnHRL3cP96cbxhbtMZ7vJCiuH7lt7tcwjH9l";

export const TON_MAINNET_ACCOUNT_DEFINITIONS = [
  {
    key: "operationsTreasury",
    label: "Operations treasury multisig",
    friendlyAddress: TON_MAINNET_OPERATIONS_TREASURY,
    description:
      "Primary multisig tracked in Supabase dct_app_config.operations_wallet.",
  },
  {
    key: "daoMultisig",
    label: "DAO governance multisig",
    friendlyAddress: TON_MAINNET_DAO_MULTISIG,
    nonBounceableAddress: TON_MAINNET_DAO_MULTISIG_NON_BOUNCEABLE,
    description:
      "Dedicated DAO executor responsible for governance proposals and resolver updates.",
    explorerUrl: TON_MAINNET_DAO_MULTISIG_EXPLORER_URL,
  },
  {
    key: "intakeWallet",
    label: "Subscription intake wallet",
    friendlyAddress: TON_MAINNET_INTAKE_WALLET,
    description:
      "Deposit wallet for subscription inflows (defaults to the operations treasury).",
  },
  {
    key: "jettonMaster",
    label: "DCT jetton master",
    friendlyAddress: TON_MAINNET_JETTON_MASTER,
    description:
      "Jetton master contract recorded in Supabase and Tonstarter attestations.",
  },
  {
    key: "dctTreasuryWallet",
    label: "DCT jetton treasury wallet",
    friendlyAddress: TON_MAINNET_DCT_TREASURY_WALLET,
    description:
      "Primary treasury wallet holding circulating DCT for emissions and burns.",
    tonDns: TON_MAINNET_DCT_TREASURY_ALIAS,
    explorerUrl: TON_MAINNET_DCT_TREASURY_TONVIEWER_URL,
  },
  {
    key: "stonfiRouter",
    label: "STON.fi DCT/TON router",
    friendlyAddress: TON_MAINNET_STONFI_ROUTER,
    description: "Liquidity router used for treasury swaps and burns.",
  },
  {
    key: "stonfiDctTonPool",
    label: "STON.fi DCT/TON pool",
    friendlyAddress: TON_MAINNET_STONFI_DCT_TON_POOL,
    description:
      "Primary STON.fi liquidity pool pairing Proxy TON with the Dynamic Capital Token.",
  },
  {
    key: "stonfiDctJettonWallet",
    label: "STON.fi DCT jetton wallet",
    friendlyAddress: TON_MAINNET_STONFI_DCT_JETTON_WALLET,
    description:
      "Jetton wallet derived from the STON.fi router for DCT liquidity ops.",
  },
  {
    key: "walletV5r1",
    label: "DCT wallet (Wallet v5r1)",
    friendlyAddress: TON_MAINNET_DCT_WALLET_V5R1,
    description: "Jetton wallet contract deployed with wallet_v5r1 code.",
  },
  {
    key: "dedustDctTonPool",
    label: "DeDust DCT/TON pool",
    friendlyAddress: TON_MAINNET_DEDUST_DCT_TON_POOL,
    description:
      "Canonical DeDust pool exposing DCT/TON liquidity for cross-venue routing.",
  },
  {
    key: "dedustDctJettonWallet",
    label: "DeDust DCT jetton wallet",
    friendlyAddress: TON_MAINNET_DEDUST_DCT_JETTON_WALLET,
    description:
      "Jetton wallet bound to the DeDust TON/DCT pool for accounting checks.",
  },
  {
    key: "swapcoffeeDctTonPool",
    label: "swap.coffee DCT/TON pool",
    friendlyAddress: TON_MAINNET_SWAPCOFFEE_DCT_TON_POOL,
    description:
      "Aggregator pool exposing TON⇄DCT liquidity through the swap.coffee routing network.",
  },
  {
    key: "swapcoffeeDctJettonWallet",
    label: "swap.coffee DCT jetton wallet",
    friendlyAddress: TON_MAINNET_SWAPCOFFEE_DCT_JETTON_WALLET,
    description:
      "Derived jetton wallet for the swap.coffee pool used in treasury reconciliation routines.",
  },
] as const satisfies readonly TonMainnetAccountDefinition[];

export type TonMainnetAccountKey =
  (typeof TON_MAINNET_ACCOUNT_DEFINITIONS)[number]["key"];

export const TON_MAINNET_ACCOUNT_LOOKUP = Object.freeze(
  TON_MAINNET_ACCOUNT_DEFINITIONS.reduce<
    Record<TonMainnetAccountKey, TonMainnetAccountDefinition>
  >((accumulator, account) => {
    accumulator[account.key] = account;
    return accumulator;
  }, {} as Record<TonMainnetAccountKey, TonMainnetAccountDefinition>),
);
