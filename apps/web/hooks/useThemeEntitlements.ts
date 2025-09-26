"use client";

import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callEdgeFunction } from "@/config/supabase";
import { useConnectedWallet } from "@/hooks/useConnectedWallet";
import {
  ENTITLEMENTS_PREFIX,
  invalidateEntitlements,
  persistEntitlements,
  readCachedEntitlements,
  subscribeToBroadcast,
  subscribeToStorage,
  WALLET_STORAGE_KEY,
} from "@/theme/themePassCache";
import type {
  ThemeEntitlementsPayload,
  ThemeEntitlementSummary,
} from "../../../shared/theme/entitlements.ts";
import { supabase } from "@/integrations/supabase/client";

type UseThemeEntitlementsResult = {
  wallet: string | null;
  entitlements: ThemeEntitlementSummary[];
  dctBalance: number | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
};

async function fetchEntitlements(
  wallet: string,
): Promise<ThemeEntitlementsPayload> {
  const { data, error } = await callEdgeFunction<ThemeEntitlementsPayload>(
    "THEME_ENTITLEMENTS",
    {
      method: "POST",
      body: { wallet },
    },
  );
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Empty response from theme-entitlements");
  }
  return data;
}

export function useThemeEntitlements(): UseThemeEntitlementsResult {
  const wallet = useConnectedWallet();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["theme-entitlements", wallet] as const, [
    wallet,
  ]);

  const initialData = useMemo(
    () => wallet ? readCachedEntitlements(wallet) ?? undefined : undefined,
    [wallet],
  );

  const query = useQuery({
    queryKey,
    enabled: Boolean(wallet),
    initialData,
    queryFn: async ({ queryKey }) => {
      const [, currentWallet] = queryKey;
      if (!currentWallet) {
        throw new Error("Wallet unavailable");
      }
      const payload = await fetchEntitlements(currentWallet);
      return payload;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!wallet || !query.data) return;
    persistEntitlements(wallet, query.data);
  }, [wallet, query.data]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOpen = () => {
      if (wallet) {
        queryClient.invalidateQueries({ queryKey });
      }
    };

    window.addEventListener("wallet-connect:open", handleOpen);
    window.addEventListener("wallet-connect:connected", handleOpen);

    const unsubscribeBroadcast = subscribeToBroadcast((message) => {
      if (message.type === "update") {
        if (!wallet || message.wallet === wallet) {
          queryClient.setQueryData<ThemeEntitlementsPayload>(
            ["theme-entitlements", message.wallet] as const,
            message.payload,
          );
        }
      } else if (message.type === "invalidate") {
        const target = message.wallet;
        if (!target || target === wallet) {
          queryClient.invalidateQueries({ queryKey });
        }
      } else if (message.type === "wallet") {
        const nextWallet = message.wallet;
        if (!nextWallet) {
          queryClient.removeQueries({ queryKey: ["theme-entitlements", null] });
        }
      }
    });

    const unsubscribeStorage = subscribeToStorage((event) => {
      if (event.key === null) return;
      if (wallet && event.key === WALLET_STORAGE_KEY) {
        // handled by useConnectedWallet
        return;
      }
      if (
        wallet && event.key === `${ENTITLEMENTS_PREFIX}:${wallet}` &&
        event.newValue
      ) {
        try {
          const parsed = JSON.parse(event.newValue) as ThemeEntitlementsPayload;
          queryClient.setQueryData(queryKey, parsed);
        } catch {
          // ignore malformed cache entries
        }
      }
    });

    const channel = supabase?.channel?.("theme-entitlements");
    let subscription: ReturnType<typeof supabase.channel> | null = null;
    if (channel) {
      channel.on(
        "broadcast",
        { event: "refresh" },
        (payload) => {
          const targetWallet =
            (payload?.payload as { wallet?: string | null })?.wallet ?? null;
          if (!targetWallet || targetWallet === wallet) {
            queryClient.invalidateQueries({ queryKey });
          }
        },
      );
      subscription = channel.subscribe();
    }

    return () => {
      window.removeEventListener("wallet-connect:open", handleOpen);
      window.removeEventListener("wallet-connect:connected", handleOpen);
      unsubscribeBroadcast();
      unsubscribeStorage();
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [wallet, queryKey, queryClient]);

  const refresh = () => {
    if (wallet) {
      invalidateEntitlements(wallet);
      queryClient.invalidateQueries({ queryKey });
    }
  };

  return {
    wallet: wallet ?? null,
    entitlements: query.data?.themes ?? [],
    dctBalance: query.data?.dctBalance ?? null,
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
    refresh,
  };
}
