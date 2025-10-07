"use client";

import {
  TonConnectButton,
  useTonAddress,
  useTonWallet,
} from "@tonconnect/ui-react";
import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function TonWalletButton() {
  const wallet = useTonWallet();
  const address = useTonAddress();

  const lastSavedAddressRef = useRef<string | null>(null);
  const lastAttemptedAddressRef = useRef<string | null>(null);

  const saveTonAddress = useCallback(async (tonAddress: string) => {
    try {
      const validationResponse = await fetch(
        "/functions/v1/validate-ton-address",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ address: tonAddress }),
        },
      );

      if (!validationResponse.ok) {
        const errorBody = await validationResponse.json().catch(() => null);
        const message = errorBody?.error ?? "Failed to validate TON address";
        throw new Error(message);
      }

      const validationData = await validationResponse.json() as {
        ok?: boolean;
        error?: string;
        hint?: string;
        normalizedAddress?: string;
      };

      if (!validationData.ok) {
        throw new Error(
          validationData.error ?? "TON address validation failed",
        );
      }

      const normalizedAddress = validationData.normalizedAddress ?? tonAddress;

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.warn("[TonWallet] No authenticated user");
        lastAttemptedAddressRef.current = null;
        toast.error("Sign in to link your TON wallet");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          ton_wallet_address: normalizedAddress,
        })
        .eq("id", user.id);

      if (error) {
        console.error("[TonWallet] Failed to save address:", error);
        lastAttemptedAddressRef.current = null;
        toast.error("Failed to save TON wallet address");
      } else {
        lastSavedAddressRef.current = tonAddress;
        toast.success("TON wallet connected successfully");
      }
    } catch (error) {
      console.error("[TonWallet] Error saving address:", error);
      lastAttemptedAddressRef.current = null;
      const message = error instanceof Error
        ? error.message
        : "Unexpected error while saving TON wallet";
      toast.error(message);
    }
  }, []);

  useEffect(() => {
    if (!wallet || !address) {
      return;
    }

    if (lastSavedAddressRef.current === address) {
      return;
    }

    if (lastAttemptedAddressRef.current === address) {
      return;
    }

    lastAttemptedAddressRef.current = address;
    void saveTonAddress(address);
  }, [wallet, address, saveTonAddress]);

  return (
    <div className="flex items-center gap-2">
      <TonConnectButton />
      {address && (
        <span className="text-sm text-muted-foreground">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      )}
    </div>
  );
}
