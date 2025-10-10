import type {
  UIWallet,
  WalletsListConfiguration,
} from "@tonconnect/ui-react";

const BRIDGE_OVERRIDE_ENV_KEYS = [
  "NEXT_PUBLIC_TONCONNECT_BRIDGE_URL",
  "TONCONNECT_BRIDGE_URL",
  "NEXT_PUBLIC_TON_BRIDGE_URL",
  "TON_BRIDGE_URL",
];

function normalizeBridgeUrl(candidate: string): string | null {
  const trimmed = candidate.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    return url.toString();
  } catch {
    return trimmed;
  }
}

const CUSTOM_TONCONNECT_BRIDGE_URL = (() => {
  if (typeof process === "undefined" || !process.env) {
    return null;
  }

  for (const key of BRIDGE_OVERRIDE_ENV_KEYS) {
    const raw = process.env[key];
    if (typeof raw === "string") {
      const normalized = normalizeBridgeUrl(raw);
      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
})();

const BRIDGE_OVERRIDE_ALLOWLIST = new Set<
  TonConnectWalletMetadata["appName"]
>([
  "telegram-wallet",
  "tonkeeper",
  "dedust",
  "stonfi",
  "mytonwallet",
]);

function resolveBridgeUrl(
  appName: TonConnectWalletMetadata["appName"],
  fallback: string,
): string {
  if (!CUSTOM_TONCONNECT_BRIDGE_URL) {
    return fallback;
  }

  return BRIDGE_OVERRIDE_ALLOWLIST.has(appName)
    ? CUSTOM_TONCONNECT_BRIDGE_URL
    : fallback;
}

type WalletPlatform = NonNullable<UIWallet["platforms"]>[number];

export type TonConnectWalletMetadata = {
  appName: string;
  name: string;
  imageUrl: string;
  aboutUrl: string;
  universalLink: string;
  bridgeUrl: string;
  deepLink?: string;
  jsBridgeKey?: string;
  platforms: ReadonlyArray<WalletPlatform>;
};

export type TonConnectWalletListEntry = UIWallet & {
  platforms: WalletPlatform[];
  deepLink?: TonConnectWalletMetadata["deepLink"];
  jsBridgeKey?: TonConnectWalletMetadata["jsBridgeKey"];
};

export type TonConnectWalletsListConfiguration = WalletsListConfiguration;

export const TONCONNECT_RECOMMENDED_WALLETS = [
  {
    appName: "telegram-wallet",
    name: "Wallet",
    imageUrl: "https://wallet.tg/images/logo-288.png",
    aboutUrl: "https://wallet.tg/",
    universalLink: "https://t.me/wallet?attach=wallet",
    bridgeUrl: resolveBridgeUrl(
      "telegram-wallet",
      "https://walletbot.me/tonconnect-bridge/bridge",
    ),
    platforms: ["ios", "android", "macos", "windows", "linux"] as const,
  },
  {
    appName: "tonkeeper",
    name: "Tonkeeper",
    imageUrl: "https://tonkeeper.com/assets/tonconnect-icon.png",
    aboutUrl: "https://tonkeeper.com",
    universalLink: "https://app.tonkeeper.com/ton-connect",
    bridgeUrl: resolveBridgeUrl(
      "tonkeeper",
      "https://bridge.tonapi.io/bridge",
    ),
    deepLink: "tonkeeper-tc://",
    jsBridgeKey: "tonkeeper",
    platforms: [
      "ios",
      "android",
      "chrome",
      "firefox",
      "macos",
      "windows",
      "linux",
    ] as const,
  },
  {
    appName: "dedust",
    name: "DeDust Wallet",
    imageUrl: "https://dedust.io/icons/favicons/ton-connect.png",
    aboutUrl: "https://dedust.io",
    universalLink: "https://app.dedust.io/ton-connect",
    bridgeUrl: resolveBridgeUrl(
      "dedust",
      "https://bridge.tonapi.io/bridge",
    ),
    platforms: ["chrome", "safari", "firefox"] as const,
  },
  {
    appName: "stonfi",
    name: "STON.fi Wallet",
    imageUrl: "https://static.ston.fi/logo/external-logo.jpg",
    aboutUrl: "https://ston.fi",
    universalLink: "https://app.ston.fi/ton-connect",
    bridgeUrl: resolveBridgeUrl(
      "stonfi",
      "https://bridge.tonapi.io/bridge",
    ),
    platforms: ["chrome", "safari", "firefox"] as const,
  },
  {
    appName: "tonhub",
    name: "Tonhub",
    imageUrl: "https://tonhub.com/tonconnect_logo.png",
    aboutUrl: "https://tonhub.com",
    universalLink: "https://tonhub.com/ton-connect",
    bridgeUrl: "https://connect.tonhubapi.com/tonconnect",
    jsBridgeKey: "tonhub",
    platforms: ["ios", "android"] as const,
  },
  {
    appName: "mytonwallet",
    name: "MyTonWallet",
    imageUrl: "https://static.mytonwallet.io/icon-256.png",
    aboutUrl: "https://mytonwallet.io",
    universalLink: "https://connect.mytonwallet.org",
    bridgeUrl: resolveBridgeUrl(
      "mytonwallet",
      "https://tonconnectbridge.mytonwallet.org/bridge/",
    ),
    deepLink: "mytonwallet-tc://",
    jsBridgeKey: "mytonwallet",
    platforms: [
      "chrome",
      "windows",
      "macos",
      "linux",
      "ios",
      "android",
      "firefox",
    ] as const,
  },
] satisfies readonly TonConnectWalletMetadata[];

export function toTonConnectWalletListEntry(
  wallet: TonConnectWalletMetadata,
): TonConnectWalletListEntry {
  const entry: TonConnectWalletListEntry = {
    appName: wallet.appName,
    name: wallet.name,
    imageUrl: wallet.imageUrl,
    aboutUrl: wallet.aboutUrl,
    universalLink: wallet.universalLink,
    bridgeUrl: wallet.bridgeUrl,
    platforms: [...wallet.platforms] as WalletPlatform[],
  };

  if (wallet.deepLink) {
    entry.deepLink = wallet.deepLink;
  }

  if (wallet.jsBridgeKey) {
    entry.jsBridgeKey = wallet.jsBridgeKey;
  }

  return entry;
}

const DEFAULT_TONCONNECT_WALLET_LIST_ENTRIES =
  TONCONNECT_RECOMMENDED_WALLETS.map((wallet) =>
    toTonConnectWalletListEntry(wallet)
  ) as ReadonlyArray<TonConnectWalletListEntry>;

const DEFAULT_TONCONNECT_WALLETS_LIST_CONFIGURATION = {
  includeWallets: [...DEFAULT_TONCONNECT_WALLET_LIST_ENTRIES],
} as const satisfies TonConnectWalletsListConfiguration;

export const TONCONNECT_WALLETS_LIST_CONFIGURATION =
  DEFAULT_TONCONNECT_WALLETS_LIST_CONFIGURATION;

export function createTonConnectWalletsListConfiguration(
  wallets: readonly TonConnectWalletMetadata[] = TONCONNECT_RECOMMENDED_WALLETS,
): TonConnectWalletsListConfiguration {
  if (wallets === TONCONNECT_RECOMMENDED_WALLETS) {
    return TONCONNECT_WALLETS_LIST_CONFIGURATION;
  }

  return {
    includeWallets: wallets.map((wallet) => toTonConnectWalletListEntry(wallet)),
  } as const satisfies TonConnectWalletsListConfiguration;
}
