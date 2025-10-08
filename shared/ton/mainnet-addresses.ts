export interface TonMainnetAccountDefinition {
  readonly key: string;
  readonly label: string;
  readonly friendlyAddress: string;
  readonly description?: string;
  readonly tonDns?: string;
  readonly explorerUrl?: string;
}

export const TON_MAINNET_OPERATIONS_TREASURY =
  "EQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOPDD";

export const TON_MAINNET_INTAKE_WALLET =
  "EQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOPDD";

export const TON_MAINNET_JETTON_MASTER =
  "EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y";

export const TON_MAINNET_DCT_TREASURY_ALIAS = "dynamiccapital.ton";
export const TON_MAINNET_DCT_TREASURY_WALLET =
  "EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq";

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

export const TON_MAINNET_DCT_WALLET_V5R1 =
  "EQDTJ4lHuT6BdTYEio99UMZNC9hzlQ-TfoA9THrvyrLumEFm";

export const TON_MAINNET_DEDUST_DCT_TON_POOL =
  "EQAxh2vD3UMfNrF29pKl6WsOzxrt6_p2SXrNLzZh1vus0_MI";

export const TON_MAINNET_ACCOUNT_DEFINITIONS = [
  {
    key: "operationsTreasury",
    label: "Operations treasury multisig",
    friendlyAddress: TON_MAINNET_OPERATIONS_TREASURY,
    description:
      "Primary multisig tracked in Supabase dct_app_config.operations_wallet.",
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
      "Primary DeDust pool holding Dynamic Capital TON-side liquidity reserves.",
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
