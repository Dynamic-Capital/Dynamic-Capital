"use client";

import Link from "next/link";

import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/hooks/useAuth";
import { useWalletConnect } from "@/hooks/useWalletConnect";
import { Button } from "@/components/ui/button";

import { DesktopNav } from "./DesktopNav";
import { MobileMenu } from "./MobileMenu";
import { RouteHintTrail } from "./RouteHintTrail";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const connectWallet = useWalletConnect();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4 sm:py-4">
        <Link
          href="/"
          aria-label="Dynamic Capital home"
          className="flex items-center gap-3 rounded-md px-2 py-1 transition hover:bg-accent/40"
        >
          <BrandLogo size="md" variant="brand" showText={false} animated />
          <span className="hidden text-sm font-semibold uppercase tracking-[0.32em] text-muted-foreground sm:inline">
            Dynamic Capital
          </span>
        </Link>

        <DesktopNav className="flex-1 justify-center" />

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              void connectWallet();
            }}
            className="hidden md:inline-flex"
          >
            Connect wallet
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden md:inline-flex"
          >
            <Link href="/support">Support</Link>
          </Button>
          {user
            ? (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="hidden md:inline-flex"
                >
                  <Link href="/profile">Profile</Link>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void signOut();
                  }}
                  className="hidden md:inline-flex"
                >
                  Sign out
                </Button>
              </>
            )
            : (
              <Button
                asChild
                size="sm"
                variant="secondary"
                className="hidden md:inline-flex"
              >
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          <div className="flex items-center gap-2 md:hidden">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void connectWallet();
              }}
            >
              Connect
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/support">Support</Link>
            </Button>
            <MobileMenu />
          </div>
        </div>
      </div>
      <RouteHintTrail />
    </header>
  );
}

export default SiteHeader;
