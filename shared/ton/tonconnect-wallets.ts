export type TonConnectWalletMetadata = {
  appName: string;
  name: string;
  imageUrl: string;
  aboutUrl: string;
  universalLink: string;
  bridgeUrl: string;
  platforms: readonly string[];
};

export type TonConnectWalletListEntry = {
  appName: string;
  name: string;
  imageUrl: string;
  aboutUrl: string;
  universalLink: string;
  bridgeUrl: string;
  platforms: readonly string[];
};

export type TonConnectWalletsListConfiguration = {
  includeWallets: readonly TonConnectWalletListEntry[];
};

export const TONCONNECT_RECOMMENDED_WALLETS = [
  {
    appName: "telegram-wallet",
    name: "Wallet",
    imageUrl: "https://config.ton.org/assets/telegram_wallet.png",
    aboutUrl: "https://wallet.tg/",
    universalLink: "https://t.me/wallet?attach=wallet",
    bridgeUrl: "https://walletbot.me/tonconnect-bridge/bridge",
    platforms: ["ios", "android", "macos", "windows", "linux"] as const,
  },
  {
    appName: "tonkeeper",
    name: "Tonkeeper",
    imageUrl: "https://tonkeeper.com/assets/tonconnect-icon.png",
    aboutUrl: "https://tonkeeper.com",
    universalLink: "https://app.tonkeeper.com/ton-connect",
    bridgeUrl: "https://bridge.tonapi.io/bridge",
    platforms: ["ios", "android", "chrome", "firefox", "macos"] as const,
  },
  {
    appName: "dedust",
    name: "DeDust Wallet",
    imageUrl: "https://dedust.io/icons/favicons/ton-connect.png",
    aboutUrl: "https://dedust.io",
    universalLink: "https://app.dedust.io/ton-connect",
    bridgeUrl: "https://bridge.tonapi.io/bridge",
    platforms: ["chrome", "safari", "firefox"] as const,
  },
  {
    appName: "stonfi",
    name: "STON.fi Wallet",
    imageUrl: "https://static.ston.fi/logo/external-logo.jpg",
    aboutUrl: "https://ston.fi",
    universalLink: "https://app.ston.fi/ton-connect",
    bridgeUrl: "https://bridge.tonapi.io/bridge",
    platforms: ["chrome", "safari", "firefox"] as const,
  },
  {
    appName: "tonhub",
    name: "Tonhub",
    imageUrl: "https://tonhub.com/tonconnect_logo.png",
    aboutUrl: "https://tonhub.com",
    universalLink: "https://tonhub.com/ton-connect",
    bridgeUrl: "https://connect.tonhubapi.com/tonconnect",
    platforms: ["ios", "android"] as const,
  },
  {
    appName: "mytonwallet",
    name: "MyTonWallet",
    imageUrl: "https://mytonwallet.io/icon-256.png",
    aboutUrl: "https://mytonwallet.io",
    universalLink: "https://connect.mytonwallet.org",
    bridgeUrl: "https://tonconnectbridge.mytonwallet.org/bridge/",
    platforms: ["chrome", "windows", "macos", "linux"] as const,
  },
] satisfies readonly TonConnectWalletMetadata[];

export function toTonConnectWalletListEntry(
  wallet: TonConnectWalletMetadata,
): TonConnectWalletListEntry {
  return {
    appName: wallet.appName,
    name: wallet.name,
    imageUrl: wallet.imageUrl,
    aboutUrl: wallet.aboutUrl,
    universalLink: wallet.universalLink,
    bridgeUrl: wallet.bridgeUrl,
    platforms: wallet.platforms,
  };
}

const DEFAULT_TONCONNECT_WALLET_LIST_ENTRIES =
  TONCONNECT_RECOMMENDED_WALLETS.map((wallet) =>
    toTonConnectWalletListEntry(wallet)
  );

const DEFAULT_TONCONNECT_WALLETS_LIST_CONFIGURATION = {
  includeWallets: DEFAULT_TONCONNECT_WALLET_LIST_ENTRIES,
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
  };
}
