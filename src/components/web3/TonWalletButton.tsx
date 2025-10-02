"use client";

import { TonConnectButton, useTonAddress, useTonWallet } from '@tonconnect/ui-react';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function TonWalletButton() {
  const wallet = useTonWallet();
  const address = useTonAddress();

  useEffect(() => {
    if (wallet && address) {
      saveTonAddress(address);
    }
  }, [wallet, address]);

  const saveTonAddress = async (tonAddress: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('[TonWallet] No authenticated user');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: tonAddress // Store TON address temporarily in avatar_url
        })
        .eq('id', user.id);

      if (error) {
        console.error('[TonWallet] Failed to save address:', error);
        toast.error('Failed to save TON wallet address');
      } else {
        toast.success('TON wallet connected successfully');
      }
    } catch (error) {
      console.error('[TonWallet] Error saving address:', error);
    }
  };

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
