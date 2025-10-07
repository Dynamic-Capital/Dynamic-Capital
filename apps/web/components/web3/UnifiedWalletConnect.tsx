"use client";

import { useState } from "react";
import { TonWalletButton } from "./TonWalletButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getOnboard } from "@/integrations/web3-onboard";

export function UnifiedWalletConnect() {
  const [evmConnected, setEvmConnected] = useState(false);

  const handleEvmConnect = async () => {
    try {
      const onboard = await getOnboard();
      if (!onboard) {
        console.error("[UnifiedWallet] Web3-Onboard not initialized");
        return;
      }

      const wallets = await onboard.connectWallet();
      setEvmConnected(wallets.length > 0);
    } catch (error) {
      console.error("[UnifiedWallet] EVM connection failed:", error);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>

      <Tabs defaultValue="ton" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ton">TON</TabsTrigger>
          <TabsTrigger value="evm">EVM Chains</TabsTrigger>
        </TabsList>

        <TabsContent value="ton" className="space-y-4 pt-4">
          <div className="text-sm text-muted-foreground mb-2">
            Connect your TON wallet (Tonkeeper, DeDust Wallet, STON.fi Wallet,
            MyTonWallet, Tonhub, etc.)
          </div>
          <TonWalletButton />
        </TabsContent>

        <TabsContent value="evm" className="space-y-4 pt-4">
          <div className="text-sm text-muted-foreground mb-2">
            Connect MetaMask, Bitget Wallet, or other EVM wallets
          </div>
          <Button
            onClick={handleEvmConnect}
            variant="outline"
            className="w-full"
          >
            {evmConnected ? "Connected ✓" : "Connect EVM Wallet"}
          </Button>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
