"use client";

import { useEffect, useState } from "react";
import {
  getStoredWallet,
  persistWallet,
  subscribeToBroadcast,
  subscribeToStorage,
  WALLET_STORAGE_KEY,
} from "@/theme/themePassCache";

type WalletEventDetail = {
  address?: string | null;
};

function extractAddress(detail: unknown): string | null {
  if (!detail || typeof detail !== "object") return null;
  const candidate = detail as WalletEventDetail;
  if (
    typeof candidate.address === "string" && candidate.address.trim().length > 0
  ) {
    return candidate.address.trim();
  }
  return null;
}

export function useConnectedWallet(): string | null {
  const [wallet, setWallet] = useState<string | null>(() => getStoredWallet());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleConnected = (event: Event) => {
      const address = extractAddress(
        (event as CustomEvent<WalletEventDetail>).detail,
      );
      if (address && address !== wallet) {
        persistWallet(address);
        setWallet(address);
      }
    };

    const handleDisconnected = () => {
      if (wallet !== null) {
        persistWallet(null);
        setWallet(null);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === undefined) return;
      if (event.key === WALLET_STORAGE_KEY) {
        const next = event.newValue && event.newValue.trim().length > 0
          ? event.newValue
          : null;
        setWallet((current) => (current === next ? current : next));
      }
    };

    const unsubscribeBroadcast = subscribeToBroadcast((message) => {
      if (message.type === "wallet") {
        setWallet((
          current,
        ) => (current === message.wallet ? current : message.wallet));
      }
    });

    const unsubscribeStorage = subscribeToStorage(handleStorage);

    window.addEventListener(
      "wallet-connect:connected",
      handleConnected as EventListener,
    );
    window.addEventListener(
      "wallet-connect:disconnected",
      handleDisconnected as EventListener,
    );

    return () => {
      window.removeEventListener(
        "wallet-connect:connected",
        handleConnected as EventListener,
      );
      window.removeEventListener(
        "wallet-connect:disconnected",
        handleDisconnected as EventListener,
      );
      unsubscribeBroadcast();
      unsubscribeStorage();
    };
  }, [wallet]);

  return wallet;
}
