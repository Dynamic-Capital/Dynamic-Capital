export interface TonMainnetAccountDefinition {
  readonly key: string;
  readonly label: string;
  readonly friendlyAddress: string;
  readonly description?: string;
}

export const TON_MAINNET_OPERATIONS_TREASURY =
  "EQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOPDD";

export const TON_MAINNET_INTAKE_WALLET =
  "EQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOPDD";

export const TON_MAINNET_JETTON_MASTER =
  "EQAHMNCDJmEK8yEt1IbaJP1xl2-wd21f1Gpt_57Z1uCPPzE6";

export const TON_MAINNET_STONFI_ROUTER =
  "EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt";

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
    key: "stonfiRouter",
    label: "STON.fi DCT/TON router",
    friendlyAddress: TON_MAINNET_STONFI_ROUTER,
    description: "Liquidity router used for treasury swaps and burns.",
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
