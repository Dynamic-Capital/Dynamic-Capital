declare module "@tonconnect/ui-react" {
  import type { ComponentType, ReactNode } from "react";

  export interface TonConnectAccount {
    address: string;
    chain?: string;
  }

  export interface TonWallet {
    account?: TonConnectAccount | null;
  }

  export interface TonConnectUIProviderProps {
    manifestUrl: string;
    children?: ReactNode;
  }

  export const TonConnectUIProvider: ComponentType<TonConnectUIProviderProps>;

  export const TonConnectButton: ComponentType<Record<string, unknown>>;

  export function useTonAddress(): string | null;
  export function useTonWallet(): TonWallet | null;
}
