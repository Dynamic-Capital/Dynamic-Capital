"use client";

import { useCallback } from "react";

import { getOnboard } from "@/integrations/web3-onboard";

type WalletTrigger = (options?: unknown) => void;

type WalletConnectOptions = {
  planId?: string;
};

type WalletAwareWindow = typeof window & {
  tonConnectUI?: { openModal?: WalletTrigger };
  TonConnectUI?: { openModal?: WalletTrigger };
  openTonConnectModal?: WalletTrigger;
  tonconnect?: { openModal?: WalletTrigger };
};

function isFunction(value: unknown): value is WalletTrigger {
  return typeof value === "function";
}

function triggerLegacyWalletModal(
  globalWindow: WalletAwareWindow,
  options?: WalletConnectOptions,
) {
  const possibleTriggers: (WalletTrigger | undefined)[] = [
    globalWindow.tonConnectUI?.openModal,
    globalWindow.TonConnectUI?.openModal,
    globalWindow.openTonConnectModal,
    globalWindow.tonconnect?.openModal,
  ];

  for (const trigger of possibleTriggers) {
    if (isFunction(trigger)) {
      trigger(options);
      return true;
    }
  }

  return false;
}

export function useWalletConnect() {
  const openFallback = useCallback((options?: WalletConnectOptions) => {
    if (typeof window === "undefined") {
      return;
    }

    const globalWindow = window as WalletAwareWindow;
    const handled = triggerLegacyWalletModal(globalWindow, options);

    if (!handled) {
      const event = new CustomEvent("wallet-connect:open", {
        detail: options ?? {},
      });
      window.dispatchEvent(event);
    }
  }, []);

  return useCallback(
    async (options?: WalletConnectOptions) => {
      if (typeof window === "undefined") {
        return;
      }

      const onboard = await getOnboard();

      if (!onboard) {
        openFallback(options);
        return;
      }

      try {
        const wallets = await onboard.connectWallet();
        const [primaryWallet] = wallets;
        const [primaryAccount] = primaryWallet?.accounts ?? [];

        if (primaryAccount?.address) {
          console.info("[useWalletConnect] Connected wallet", {
            address: primaryAccount.address,
            planId: options?.planId,
          });
        } else if (!wallets.length) {
          console.info("[useWalletConnect] Wallet selection was dismissed");
        }
      } catch (error) {
        console.error("[useWalletConnect] Wallet connection failed", error);
        openFallback(options);
      }
    },
    [openFallback],
  );
}
