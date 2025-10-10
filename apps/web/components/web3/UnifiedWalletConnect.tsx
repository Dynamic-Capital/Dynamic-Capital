"use client";

import { useState } from "react";
import { TonWalletButton } from "./TonWalletButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWalletConnect } from "@/hooks/useWalletConnect";
import { TONCONNECT_RECOMMENDED_WALLETS } from "@shared/ton/tonconnect-wallets";
import { useTonAddress } from "@tonconnect/ui-react";

const TON_WALLET_PREVIEW = TONCONNECT_RECOMMENDED_WALLETS.map((wallet) => ({
  appName: wallet.appName,
  name: wallet.name,
  imageUrl: wallet.imageUrl,
}));

export function UnifiedWalletConnect() {
  const connectWallet = useWalletConnect();
  const [evmConnected, setEvmConnected] = useState(false);
  const tonAddress = useTonAddress();
  const tonConnected = Boolean(tonAddress);

  const handleEvmConnect = async () => {
    try {
      const connected = await connectWallet();
      setEvmConnected(connected);
    } catch (error) {
      console.error("[UnifiedWallet] EVM connection failed:", error);
    }
  };

  const tonStatusClass = tonConnected
    ? "text-emerald-500"
    : "text-muted-foreground";
  const evmStatusClass = evmConnected
    ? "text-emerald-500"
    : "text-muted-foreground";

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>

      <Tabs defaultValue="ton" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ton">TON</TabsTrigger>
          <TabsTrigger value="evm">EVM Chains</TabsTrigger>
        </TabsList>

        <TabsContent value="ton" className="space-y-4 pt-4">
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-2">
            <span className="text-sm font-medium text-foreground/80">
              TON wallet status
            </span>
            <span className={`text-xs font-semibold ${tonStatusClass}`}>
              {tonConnected ? "Connected" : "Not connected"}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 rounded-xl border border-border/60 bg-muted/30 p-4">
            {TON_WALLET_PREVIEW.map((wallet) => (
              <div
                key={wallet.appName}
                className="flex w-[88px] flex-col items-center gap-2 text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-background/80">
                  <img
                    src={wallet.imageUrl}
                    alt={`${wallet.name} logo`}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className="text-[11px] font-medium leading-tight text-muted-foreground">
                  {wallet.name}
                </span>
              </div>
            ))}
          </div>
          <div className="text-sm text-muted-foreground mb-2">
            Connect your TON wallet (Wallet (Telegram), Tonkeeper, DeDust
            Wallet, STON.fi Wallet, MyTonWallet, Tonhub, etc.)
          </div>
          <TonWalletButton />
        </TabsContent>

        <TabsContent value="evm" className="space-y-4 pt-4">
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-2">
            <span className="text-sm font-medium text-foreground/80">
              EVM wallet status
            </span>
            <span className={`text-xs font-semibold ${evmStatusClass}`}>
              {evmConnected ? "Connected" : "Not connected"}
            </span>
          </div>
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
