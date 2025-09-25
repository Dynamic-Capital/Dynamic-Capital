"use client";

import { useCallback } from "react";

type WalletTrigger = (options?: unknown) => void;

type WalletConnectOptions = {
  planId?: string;
};

function isFunction(value: unknown): value is WalletTrigger {
  return typeof value === "function";
}

export function useWalletConnect() {
  return useCallback((options?: WalletConnectOptions) => {
    if (typeof window === "undefined") {
      return;
    }

    const globalWindow = window as typeof window & {
      tonConnectUI?: { openModal?: WalletTrigger };
      TonConnectUI?: { openModal?: WalletTrigger };
      openTonConnectModal?: WalletTrigger;
      tonconnect?: { openModal?: WalletTrigger };
    };

    const possibleTriggers: (WalletTrigger | undefined)[] = [
      globalWindow.tonConnectUI?.openModal,
      globalWindow.TonConnectUI?.openModal,
      globalWindow.openTonConnectModal,
      globalWindow.tonconnect?.openModal,
    ];

    for (const trigger of possibleTriggers) {
      if (isFunction(trigger)) {
        trigger(options);
        return;
      }
    }

    const event = new CustomEvent("wallet-connect:open", {
      detail: options ?? {},
    });
    window.dispatchEvent(event);
  }, []);
}
