"use client";

import { useCallback, useEffect } from "react";

type WalletTrigger = (options?: unknown) => void;

type WalletConnectOptions = {
  planId?: string;
};

const CONNECTED_EVENT = "wallet-connect:connected";
const DISCONNECTED_EVENT = "wallet-connect:disconnected";
const STATUS_INTERVAL_MS = 1000;

type TonConnectController = {
  account?: { address?: string | null } | null;
  wallet?: { account?: { address?: string | null } | null } | null;
  onStatusChange?: (handler: (state: unknown) => void) => unknown;
  offStatusChange?: (handler: (state: unknown) => void) => void;
};

function resolveAddressFromStatus(state: unknown): string | null {
  if (!state || typeof state !== "object") return null;
  const candidate = state as TonConnectController & { address?: string | null };
  if (typeof candidate.address === "string" && candidate.address.length > 0) {
    return candidate.address;
  }
  const account = candidate.account ?? candidate.wallet?.account ?? null;
  if (
    account && typeof account.address === "string" && account.address.length > 0
  ) {
    return account.address;
  }
  return null;
}

function isFunction(value: unknown): value is WalletTrigger {
  return typeof value === "function";
}

export function useWalletConnect() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const globalWindow = window as typeof window & {
      tonConnectUI?: TonConnectController;
      TonConnectUI?: TonConnectController;
      tonconnect?: TonConnectController;
    };

    let lastAddress: string | null = null;

    const emitIfChanged = (address: string | null) => {
      if (address === lastAddress) {
        return;
      }
      const previous = lastAddress;
      lastAddress = address;
      if (address) {
        window.dispatchEvent(
          new CustomEvent(CONNECTED_EVENT, {
            detail: { address },
          }),
        );
      } else {
        window.dispatchEvent(
          new CustomEvent(DISCONNECTED_EVENT, {
            detail: { address: null, previousAddress: previous },
          }),
        );
      }
    };

    const resolveControllers = () =>
      [
        globalWindow.tonConnectUI,
        globalWindow.TonConnectUI,
        globalWindow.tonconnect,
      ] as (TonConnectController | undefined)[];

    let unsubscribe: (() => void) | undefined;

    for (const controller of resolveControllers()) {
      if (!controller || typeof controller !== "object") continue;
      const candidate = controller as TonConnectController;
      if (typeof candidate.onStatusChange === "function") {
        const handler = (state: unknown) => {
          const address = resolveAddressFromStatus(state);
          if (address != null) {
            emitIfChanged(address);
          } else {
            const fallback = resolveAddressFromStatus(candidate);
            emitIfChanged(fallback);
          }
        };
        const maybeUnsubscribe = candidate.onStatusChange(handler);
        if (typeof maybeUnsubscribe === "function") {
          unsubscribe = () => {
            try {
              (maybeUnsubscribe as () => void)();
            } catch {
              /* ignore */
            }
          };
        } else if (typeof candidate.offStatusChange === "function") {
          unsubscribe = () => candidate.offStatusChange?.(handler);
        }
        break;
      }
    }

    const readAddress = () => {
      for (const controller of resolveControllers()) {
        const resolved = resolveAddressFromStatus(controller ?? null);
        if (resolved) {
          return resolved;
        }
      }
      return null;
    };

    emitIfChanged(readAddress());

    const interval = window.setInterval(() => {
      emitIfChanged(readAddress());
    }, STATUS_INTERVAL_MS);

    return () => {
      if (typeof unsubscribe === "function") {
        try {
          unsubscribe();
        } catch {
          /* ignore */
        }
      }
      window.clearInterval(interval);
    };
  }, []);

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
