"use client";

import type { ReactNode } from "react";
import { TonConnectUIProvider } from "@tonconnect/ui-react";

import { TON_CONFIG } from "@/config/ton";
import { TONCONNECT_WALLETS_LIST_CONFIGURATION } from "../../../shared/ton/tonconnect-wallets";

interface TonConnectProviderProps {
  children: ReactNode;
}

export function TonConnectProvider({ children }: TonConnectProviderProps) {
  return (
    <TonConnectUIProvider
      manifestUrl={TON_CONFIG.manifestUrl}
      walletsListConfiguration={TONCONNECT_WALLETS_LIST_CONFIGURATION}
    >
      {children}
    </TonConnectUIProvider>
  );
}
