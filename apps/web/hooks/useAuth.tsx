"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type ConnectedWallet, TonConnectUI } from "@tonconnect/ui";
import { callEdgeFunction } from "@/config/supabase";

interface WalletSession {
  address: string;
  chain: string;
  walletAppName?: string;
  walletAppIcon?: string;
  raw: ConnectedWallet;
}

interface SubscriptionSnapshot {
  isActive: boolean;
  plan?: string | null;
  tonPaid?: number | null;
  txHash?: string | null;
  lockUntil?: string | null;
  stakedDct?: number | null;
  weight?: number | null;
  daysRemaining?: number | null;
}

interface AuthContextType {
  wallet: WalletSession | null;
  tonProof: string | null;
  telegramInitData: string | null;
  subscription: SubscriptionSnapshot | null;
  loading: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  isAdmin: boolean;
}

type WalletStatusResponse = {
  wallet_address?: string | null;
  plan_name?: string | null;
  is_vip?: boolean;
  next_unlock_at?: string | null;
  dct_staked?: number | null;
  stake_weight?: number | null;
  latest_tx_hash?: string | null;
  latest_ton_paid?: number | null;
  days_remaining?: number | null;
  admin_wallet?: boolean;
};

type TonConnectWindow = typeof window & {
  tonConnectUI?: TonConnectUI;
  TonConnectUI?: TonConnectUI;
  openTonConnectModal?: () => void;
  tonconnect?: TonConnectUI;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeAddress(value?: string | null): string {
  if (!value) return "";
  return value.trim().toLowerCase();
}

function parseAdminWallets(): string[] {
  if (typeof process === "undefined") {
    return [];
  }
  const raw = process.env.NEXT_PUBLIC_ADMIN_WALLETS ||
    process.env.ADMIN_WALLETS || "";
  return raw
    .split(",")
    .map((token) => normalizeAddress(token))
    .filter((token) => token.length > 0);
}

const ADMIN_WALLETS = new Set(parseAdminWallets());

function deriveManifestUrl(): string | undefined {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_TONCONNECT_MANIFEST_URL;
  }
  const explicit = process.env.NEXT_PUBLIC_TONCONNECT_MANIFEST_URL;
  if (explicit && explicit.trim().length > 0) {
    return explicit.trim();
  }
  return `${window.location.origin}/tonconnect-manifest.json`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const tonConnectRef = useRef<TonConnectUI | null>(null);
  const [wallet, setWallet] = useState<WalletSession | null>(null);
  const [tonProof, setTonProof] = useState<string | null>(null);
  const [telegramInitData, setTelegramInitData] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionSnapshot | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const fetchSubscription = useCallback(
    async (address: string) => {
      try {
        const { data, error } = await callEdgeFunction<WalletStatusResponse>(
          "SUBSCRIPTION_STATUS",
          {
            method: "POST",
            body: { wallet_address: address },
          },
        );

        if (error) {
          console.error("Failed to resolve subscription status", error.message);
          setSubscription(null);
          return;
        }

        if (!data) {
          setSubscription(null);
          return;
        }

        const snapshot: SubscriptionSnapshot = {
          isActive: Boolean(data.is_vip),
          plan: data.plan_name ?? null,
          tonPaid: data.latest_ton_paid ?? null,
          txHash: data.latest_tx_hash ?? null,
          lockUntil: data.next_unlock_at ?? null,
          stakedDct: data.dct_staked ?? null,
          weight: data.stake_weight ?? null,
          daysRemaining: data.days_remaining ?? null,
        };
        setSubscription(snapshot);
      } catch (error) {
        console.error("Subscription lookup failed", error);
        setSubscription(null);
      }
    },
    [],
  );

  const resetSession = useCallback(() => {
    setWallet(null);
    setTonProof(null);
    setSubscription(null);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const globalWindow = window as TonConnectWindow;
    if (globalWindow.Telegram?.WebApp?.initData) {
      setTelegramInitData(globalWindow.Telegram.WebApp.initData);
    }

    if (tonConnectRef.current) {
      setLoading(false);
      return;
    }

    const manifestUrl = deriveManifestUrl();
    const tonConnect = new TonConnectUI({ manifestUrl });
    tonConnectRef.current = tonConnect;

    globalWindow.tonConnectUI = tonConnect;
    globalWindow.TonConnectUI = tonConnect;
    globalWindow.tonconnect = tonConnect;
    globalWindow.openTonConnectModal = () => {
      void tonConnect.openModal();
    };

    const unsubscribe = tonConnect.onStatusChange((nextWallet) => {
      if (!nextWallet) {
        resetSession();
        setLoading(false);
        return;
      }

      const session: WalletSession = {
        address: nextWallet.account.address,
        chain: nextWallet.account.chain,
        walletAppName: nextWallet.device?.appName,
        raw: nextWallet,
      };

      setWallet(session);

      if (nextWallet.connectItems?.tonProof) {
        try {
          setTonProof(JSON.stringify(nextWallet.connectItems.tonProof));
        } catch {
          setTonProof(null);
        }
      } else {
        setTonProof(null);
      }

      void fetchSubscription(session.address);
      setLoading(false);
    });

    tonConnect.connectionRestored
      .catch((error) => {
        console.warn("TON connection restore failed", error);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      unsubscribe();
      tonConnectRef.current = null;
      delete globalWindow.tonConnectUI;
      delete globalWindow.TonConnectUI;
      delete globalWindow.openTonConnectModal;
      delete globalWindow.tonconnect;
    };
  }, [fetchSubscription, resetSession]);

  const connect = useCallback(async () => {
    const tonConnect = tonConnectRef.current;
    if (!tonConnect) {
      return;
    }
    setConnecting(true);
    try {
      await tonConnect.openModal();
    } catch (error) {
      console.error("Failed to open TON connect modal", error);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    const tonConnect = tonConnectRef.current;
    if (!tonConnect) {
      resetSession();
      return;
    }
    try {
      await tonConnect.disconnect();
    } catch (error) {
      console.error("Failed to disconnect wallet", error);
    } finally {
      resetSession();
    }
  }, [resetSession]);

  const refreshSubscription = useCallback(async () => {
    if (!wallet) {
      return;
    }
    await fetchSubscription(wallet.address);
  }, [fetchSubscription, wallet]);

  const isAdmin = useMemo(() => {
    if (!wallet) return false;
    return ADMIN_WALLETS.has(normalizeAddress(wallet.address));
  }, [wallet]);

  const value: AuthContextType = {
    wallet,
    tonProof,
    telegramInitData,
    subscription,
    loading,
    connecting,
    connect,
    disconnect,
    refreshSubscription,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
