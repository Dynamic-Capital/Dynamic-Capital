"use client";

import Link from "next/link";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import {
  TONCONNECT_RECOMMENDED_WALLETS,
  type TonConnectWalletMetadata,
} from "@shared/ton/tonconnect-wallets";

const PLATFORM_LABELS: Record<string, string> = {
  ios: "iOS",
  android: "Android",
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
  chrome: "Chrome",
  safari: "Safari",
  firefox: "Firefox",
};

const PLATFORM_PRIORITY = [
  "ios",
  "android",
  "chrome",
  "safari",
  "firefox",
  "macos",
  "windows",
  "linux",
] as const;

const WALLET_DESCRIPTIONS: Record<string, string> = {
  "telegram-wallet":
    "Native Telegram wallet with TonConnect support across mobile and desktop clients.",
  tonkeeper:
    "Mobile-first TonConnect 2.0 wallet for rapid onboarding and staking flows.",
  dedust:
    "Exchange-grade wallet embedded inside DeDust with liquidity and swap routing.",
  stonfi:
    "STON.fi's wallet keeps DeFi routing close to the AMM with responsive desktop and mobile support.",
  tonhub:
    "Lightweight mobile wallet ideal for investors joining through Telegram communities.",
  mytonwallet:
    "Browser extension and desktop wallet tailored for operators who prefer workstation trading.",
};

function getPlatformLabels(wallet: TonConnectWalletMetadata): string[] {
  const byPriority = new Map<string, number>();
  PLATFORM_PRIORITY.forEach((platform, index) => {
    byPriority.set(platform, index);
  });

  return [...wallet.platforms]
    .sort((a, b) => {
      const priorityA = byPriority.get(a) ?? PLATFORM_PRIORITY.length;
      const priorityB = byPriority.get(b) ?? PLATFORM_PRIORITY.length;
      if (priorityA === priorityB) {
        return a.localeCompare(b);
      }
      return priorityA - priorityB;
    })
    .map((platform) => PLATFORM_LABELS[platform] ?? platform.toUpperCase());
}

function getUniversalLinkHost(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function TonWalletCatalogue() {
  return (
    <section className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold tracking-tight text-foreground">
            TonConnect wallet directory
          </h3>
          <p className="text-sm text-muted-foreground">
            Wallet (Telegram), Tonkeeper, DeDust Wallet, STON.fi Wallet, Tonhub,
            and MyTonWallet ship TonConnect deep links that work out of the box
            with Dynamic Capital.
          </p>
        </div>
        <p className="text-xs text-muted-foreground/80">
          Tap a wallet to open its TonConnect deep link or review the project
          site before connecting.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {TONCONNECT_RECOMMENDED_WALLETS.map((wallet) => {
          const description = WALLET_DESCRIPTIONS[wallet.appName] ??
            "TonConnect compatible wallet.";
          const platforms = getPlatformLabels(wallet);
          const host = getUniversalLinkHost(wallet.universalLink);

          return (
            <Card
              key={wallet.appName}
              className={cn(
                "flex h-full flex-col border border-border/60 bg-background/70",
                "backdrop-blur supports-[backdrop-filter]:bg-background/60",
                "transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg",
              )}
            >
              <CardHeader className="flex flex-row items-center gap-4 pb-4">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/40">
                  <img
                    src={wallet.imageUrl}
                    alt={`${wallet.name} logo`}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <CardTitle className="text-lg font-semibold leading-tight">
                    {wallet.name}
                  </CardTitle>
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
                    {host ?? "tonconnect"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 pt-0">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {platforms.map((platform) => (
                    <Badge
                      key={`${wallet.appName}-${platform}`}
                      variant="outline"
                      className="border-border/60 bg-muted/40 text-xs font-medium text-foreground/80"
                    >
                      {platform}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="mt-auto flex flex-wrap gap-2 border-t border-border/60 bg-muted/30 px-6 py-4">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                >
                  <Link
                    href={wallet.universalLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open TonConnect
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-muted-foreground hover:text-primary"
                >
                  <Link href={wallet.aboutUrl} target="_blank" rel="noreferrer">
                    Project site
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
