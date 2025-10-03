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
          ton_wallet_address: tonAddress,
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
      toast.error("Unexpected error while saving TON wallet");
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
