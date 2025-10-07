declare module "@tonconnect/ui-react" {
  import type { ComponentType, ReactNode } from "react";

  export interface TonConnectAccount {
    address: string;
    chain?: string;
  }

  export interface TonWallet {
    account?: TonConnectAccount | null;
  }

  export interface TonConnectUIWallet {
    appName: string;
    name: string;
    imageUrl: string;
    aboutUrl: string;
    universalLink: string;
    bridgeUrl: string;
    platforms?: readonly string[];
  }

  export interface WalletsListConfiguration {
    includeWallets?: readonly TonConnectUIWallet[];
  }

  export interface TonConnectUIProviderProps {
    manifestUrl: string;
    walletsListConfiguration?: WalletsListConfiguration;
    children?: ReactNode;
  }

  export const TonConnectUIProvider: ComponentType<TonConnectUIProviderProps>;

  export const TonConnectButton: ComponentType<Record<string, unknown>>;

  export function useTonAddress(): string | null;
  export function useTonWallet(): TonWallet | null;
}
