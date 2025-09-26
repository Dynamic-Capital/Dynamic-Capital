"use client";

import type { ThemeEntitlementsPayload } from "../../../shared/theme/entitlements.ts";

const STORAGE_PREFIX = "theme-pass";
const WALLET_STORAGE_KEY = `${STORAGE_PREFIX}:wallet`;
const ENTITLEMENTS_PREFIX = `${STORAGE_PREFIX}:entitlements`;
const CHANNEL_NAME = "theme-pass:channel";

type BroadcastMessage =
  | { type: "wallet"; wallet: string | null }
  | { type: "update"; wallet: string; payload: ThemeEntitlementsPayload }
  | { type: "invalidate"; wallet?: string | null };

function getBroadcastChannel(): BroadcastChannel | null {
  if (
    typeof window === "undefined" || typeof BroadcastChannel === "undefined"
  ) {
    return null;
  }
  return new BroadcastChannel(CHANNEL_NAME);
}

export function getStoredWallet(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(WALLET_STORAGE_KEY);
    return stored && stored.trim().length > 0 ? stored : null;
  } catch {
    return null;
  }
}

export function persistWallet(address: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (address) {
      window.localStorage.setItem(WALLET_STORAGE_KEY, address);
    } else {
      window.localStorage.removeItem(WALLET_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
  const channel = getBroadcastChannel();
  channel?.postMessage(
    { type: "wallet", wallet: address } satisfies BroadcastMessage,
  );
}

function entitlementsStorageKey(wallet: string): string {
  return `${ENTITLEMENTS_PREFIX}:${wallet}`;
}

export function readCachedEntitlements(
  wallet: string | null | undefined,
): ThemeEntitlementsPayload | null {
  if (!wallet || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(entitlementsStorageKey(wallet));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ThemeEntitlementsPayload;
    if (parsed && parsed.wallet === wallet) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function persistEntitlements(
  wallet: string,
  payload: ThemeEntitlementsPayload,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      entitlementsStorageKey(wallet),
      JSON.stringify(payload),
    );
  } catch {
    // ignore
  }
  const channel = getBroadcastChannel();
  channel?.postMessage(
    { type: "update", wallet, payload } satisfies BroadcastMessage,
  );
}

export function invalidateEntitlements(wallet?: string | null): void {
  const channel = getBroadcastChannel();
  channel?.postMessage(
    { type: "invalidate", wallet } satisfies BroadcastMessage,
  );
}

export function subscribeToBroadcast(
  handler: (message: BroadcastMessage) => void,
): () => void {
  const channel = getBroadcastChannel();
  if (!channel) {
    return () => {};
  }
  const listener = (event: MessageEvent<BroadcastMessage>) => {
    if (!event.data) return;
    handler(event.data);
  };
  channel.addEventListener("message", listener);
  return () => channel.removeEventListener("message", listener);
}

export function subscribeToStorage(
  handler: (event: StorageEvent) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export { ENTITLEMENTS_PREFIX, WALLET_STORAGE_KEY };
