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
    deepLink?: string;
    jsBridgeKey?: string;
    platforms?: readonly string[];
  }

  export type UIWallet = TonConnectUIWallet;

  export interface TonConnectUI {
    openModal: (options?: unknown) => void;
    closeModal: () => void;
    onStatusChange: (
      callback: (wallet: TonWallet | null) => void,
    ) => void | (() => void) | Promise<void | (() => void)>;
    setConnectRequestParameters?: (params: unknown) => void;
  }

  export type ReturnStrategy = "back" | "none" | `${string}://${string}`;

  export interface ActionConfiguration {
    modals?: ("before" | "success" | "error")[] | "all";
    notifications?: ("before" | "success" | "error")[] | "all";
    returnStrategy?: ReturnStrategy;
    twaReturnUrl?: `${string}://${string}`;
    skipRedirectToWallet?: "ios" | "always" | "never";
  }

  export interface WalletsListConfiguration {
    includeWallets?: readonly UIWallet[];
  }

  export interface TonConnectUIProviderProps {
    manifestUrl: string;
    walletsListConfiguration?: WalletsListConfiguration;
    actionsConfiguration?: ActionConfiguration;
    children?: ReactNode;
  }

  export const TonConnectUIProvider: ComponentType<TonConnectUIProviderProps>;

  export const TonConnectButton: ComponentType<Record<string, unknown>>;

  export function useTonAddress(): string | null;
  export function useTonWallet(): TonWallet | null;
  export function useTonConnectUI(): [TonConnectUI | null, unknown?];
}
