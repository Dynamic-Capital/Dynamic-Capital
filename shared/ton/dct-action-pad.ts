import {
  TON_MAINNET_DCT_TREASURY_ALIAS,
  TON_MAINNET_DCT_TREASURY_MEMO,
  TON_MAINNET_DCT_TREASURY_TONKEEPER_LINK,
  TON_MAINNET_DCT_TREASURY_TON_TRANSFER_LINK,
  TON_MAINNET_DCT_TREASURY_TONVIEWER_URL,
  TON_MAINNET_DCT_TREASURY_WALLET,
  TON_MAINNET_JETTON_MASTER,
} from "./mainnet-addresses";
import { DCT_DEX_POOLS } from "./dct-liquidity";

const buildJettonExplorerUrl = (address: string) =>
  `https://tonviewer.com/jetton/${address}`;

export type DctActionKey = "onboard" | "deposit" | "withdraw" | "utilize";

export interface DctActionLinkDefinition {
  readonly label: string;
  readonly href: string;
  readonly external?: boolean;
  readonly description?: string;
}

export interface DctActionDefinition {
  readonly key: DctActionKey;
  readonly label: string;
  readonly icon: string;
  readonly summary: string;
  readonly description: string;
  readonly highlights: readonly string[];
  readonly links: readonly DctActionLinkDefinition[];
}

export interface DctCopyFieldDefinition {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly helper?: string;
}

export interface DctActionPadDefinition {
  readonly alias: string;
  readonly memo: string;
  readonly walletAddress: string;
  readonly tonkeeperUniversalLink: string;
  readonly tonTransferLink: string;
  readonly jettonMasterAddress: string;
  readonly qrLink: string;
  readonly copyFields: readonly DctCopyFieldDefinition[];
  readonly defaultActionKey: DctActionKey;
  readonly actions: readonly DctActionDefinition[];
}

const shorten = (value: string, visible = 6) =>
  value.length <= visible * 2
    ? value
    : `${value.slice(0, visible)}…${value.slice(-visible)}`;

const STONFI_TON_POOL = DCT_DEX_POOLS.find(
  (pool) => pool.dex === "STON.fi" && pool.pair === "DCT/TON",
);
const DEDUST_TON_POOL = DCT_DEX_POOLS.find(
  (pool) => pool.dex === "DeDust" && pool.pair === "DCT/TON",
);
const DEDUST_USDT_POOL = DCT_DEX_POOLS.find(
  (pool) => pool.dex === "DeDust" && pool.pair === "DCT/USDT",
);

const utilizeLinks: DctActionLinkDefinition[] = [];

if (STONFI_TON_POOL) {
  utilizeLinks.push({
    label: "Swap on STON.fi",
    href: STONFI_TON_POOL.swapUrl,
    external: true,
  });

  if (STONFI_TON_POOL.poolExplorerUrl) {
    utilizeLinks.push({
      label: "STON.fi pool explorer",
      href: STONFI_TON_POOL.poolExplorerUrl,
      external: true,
    });
  }

  if (STONFI_TON_POOL.jettonWalletExplorerUrl) {
    utilizeLinks.push({
      label: "STON.fi jetton wallet",
      href: STONFI_TON_POOL.jettonWalletExplorerUrl,
      external: true,
    });
  }
}

if (DEDUST_TON_POOL) {
  utilizeLinks.push({
    label: "Swap on DeDust",
    href: DEDUST_TON_POOL.swapUrl,
    external: true,
  });

  if (DEDUST_TON_POOL.poolExplorerUrl) {
    utilizeLinks.push({
      label: "DeDust pool explorer",
      href: DEDUST_TON_POOL.poolExplorerUrl,
      external: true,
    });
  }

  if (DEDUST_TON_POOL.jettonWalletExplorerUrl) {
    utilizeLinks.push({
      label: "DeDust jetton wallet",
      href: DEDUST_TON_POOL.jettonWalletExplorerUrl,
      external: true,
    });
  }
}

if (DEDUST_USDT_POOL) {
  utilizeLinks.push({
    label: "Swap DCT/USDT on DeDust",
    href: DEDUST_USDT_POOL.swapUrl,
    external: true,
  });
}

utilizeLinks.push({
  label: "Tonviewer jetton master",
  href: buildJettonExplorerUrl(TON_MAINNET_JETTON_MASTER),
  external: true,
});

const UTILIZE_LINKS = Object.freeze(utilizeLinks) as readonly DctActionLinkDefinition[];

export const DCT_ACTION_PAD = Object.freeze({
  alias: TON_MAINNET_DCT_TREASURY_ALIAS,
  memo: TON_MAINNET_DCT_TREASURY_MEMO,
  walletAddress: TON_MAINNET_DCT_TREASURY_WALLET,
  tonkeeperUniversalLink: TON_MAINNET_DCT_TREASURY_TONKEEPER_LINK,
  tonTransferLink: TON_MAINNET_DCT_TREASURY_TON_TRANSFER_LINK,
  jettonMasterAddress: TON_MAINNET_JETTON_MASTER,
  qrLink: TON_MAINNET_DCT_TREASURY_TONKEEPER_LINK,
  copyFields: [
    {
      key: "alias",
      label: "TON alias",
      value: TON_MAINNET_DCT_TREASURY_ALIAS,
      helper: "Works across Tonkeeper, Wallet, DeDust, STON.fi, Tonhub, and Bitget wallets.",
    },
    {
      key: "wallet",
      label: "Treasury wallet",
      value: TON_MAINNET_DCT_TREASURY_WALLET,
      helper: `Resolves to ${shorten(TON_MAINNET_DCT_TREASURY_WALLET)} for explorer verification.`,
    },
    {
      key: "memo",
      label: "Memo",
      value: TON_MAINNET_DCT_TREASURY_MEMO,
      helper: "Include for manual DCT transfers so compliance reconciles deposits instantly.",
    },
    {
      key: "ton-uri",
      label: "ton:// URI",
      value: TON_MAINNET_DCT_TREASURY_TON_TRANSFER_LINK,
      helper: "Universal TonConnect payload for wallets that support ton:// deep links.",
    },
  ],
  defaultActionKey: "onboard",
  actions: [
    {
      key: "onboard",
      label: "Onboard",
      icon: "sparkles",
      summary: "Link TonConnect and Supabase identity",
      description:
        "Authenticate once to unlock Dynamic Capital automations, staking desks, and investor reporting.",
      highlights: [
        "Launch TonConnect inside the Telegram Mini App or web wallet hub.",
        "Supabase validates Telegram identity before storing wallet attestations.",
        "Unified desk opens staking, VIP tiers, and automation access after the handshake clears.",
      ],
      links: [
        {
          label: "Open wallet desk",
          href: "https://dynamiccapital.ai/wallet",
          external: true,
        },
        {
          label: "Review onboarding guide",
          href: "https://dynamiccapital.ai/docs/dct-onboarding",
          external: true,
        },
      ],
    },
    {
      key: "deposit",
      label: "Deposit",
      icon: "wallet",
      summary: "Send DCT to dynamiccapital.ton",
      description:
        "Use Tonkeeper, Wallet (Telegram), DeDust, STON.fi, Tonhub, MyTonWallet, or Bitget Wallet to fund the treasury via the unified alias.",
      highlights: [
        "Alias dynamiccapital.ton resolves to the DCT treasury wallet with memo pre-filled.",
        "Tonkeeper and ton:// links auto-populate jetton payloads and descriptors.",
        "Copy helpers provide manual fallbacks for institutional custody flows.",
      ],
      links: [
        {
          label: "Open Tonkeeper link",
          href: TON_MAINNET_DCT_TREASURY_TONKEEPER_LINK,
          external: true,
        },
        {
          label: "Use ton:// URI",
          href: TON_MAINNET_DCT_TREASURY_TON_TRANSFER_LINK,
          external: true,
        },
        {
          label: "View treasury on Tonviewer",
          href: TON_MAINNET_DCT_TREASURY_TONVIEWER_URL,
          external: true,
        },
        {
          label: "View jetton master",
          href: buildJettonExplorerUrl(TON_MAINNET_JETTON_MASTER),
          external: true,
        },
      ],
    },
    {
      key: "withdraw",
      label: "Withdraw",
      icon: "arrowUpRight",
      summary: "Schedule DCT releases from the desk",
      description:
        "Submit a notice so compliance clears the TonConnect payout back to the verified wallet on file.",
      highlights: [
        "Submit withdrawal tickets at least 7 days before the target release.",
        "Operations sends on-chain transfers directly to the linked TonConnect address.",
        "Concierge can escalate time-sensitive requests once compliance approves them.",
      ],
      links: [
        {
          label: "Open investor desk",
          href: "https://dynamiccapital.ai/tools/dynamic-portfolio",
          external: true,
        },
        {
          label: "Message concierge",
          href: "https://t.me/DynamicCapital_Support",
          external: true,
        },
      ],
    },
    {
      key: "utilize",
      label: "Use DCT",
      icon: "repeat",
      summary: "Access liquidity and explorers",
      description:
        "Route swaps through STON.fi or DeDust and audit jetton wallets before executing treasury moves.",
      highlights: [
        "STON.fi and DeDust pools keep DCT/TON liquidity balanced for investors and operations.",
        "Explorer links expose pool balances for reconciliation across Supabase and bots.",
        "Jetton wallet references align governance, automation scripts, and compliance checks.",
      ],
      links: UTILIZE_LINKS,
    },
  ],
} satisfies DctActionPadDefinition);
