"use client";

import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { TON_CONFIG } from '@/config/ton';

interface TonConnectProviderProps {
  children: React.ReactNode;
}

export function TonConnectProvider({ children }: TonConnectProviderProps) {
  return (
    <TonConnectUIProvider manifestUrl={TON_CONFIG.manifestUrl}>
      {children}
    </TonConnectUIProvider>
  );
}
