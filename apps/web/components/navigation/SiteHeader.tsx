"use client";

import Link from "next/link";

import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/hooks/useAuth";
import { useWalletConnect } from "@/hooks/useWalletConnect";
import { Button as DynamicButton, Text } from "@/components/dynamic-ui-system";
import { cn } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { DesktopNav } from "./DesktopNav";
import { MobileMenu } from "./MobileMenu";
import { RouteHintTrail } from "./RouteHintTrail";
import { getAccountLabel } from "./account-label";

function HeaderActions({
  user,
  accountLabel,
  onConnectWallet,
  onSignOut,
  className,
}: {
  user: import("@supabase/supabase-js").User | null;
  accountLabel?: string;
  onConnectWallet: () => void;
  onSignOut: () => void;
  className?: string;
}) {
  const resolvedAccountLabel = accountLabel ?? "Account";

  return (
    <div
      className={cn("hidden items-center gap-3 md:flex", className)}
      role="group"
      aria-label="Workspace actions"
    >
      <DynamicButton
        size="s"
        variant="primary"
        className="px-4 py-2 text-sm font-semibold normal-case tracking-[0.02em]"
        onClick={onConnectWallet}
        suffixIcon="arrowUpRight"
      >
        Connect wallet
      </DynamicButton>
      {user
        ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <DynamicButton
                size="s"
                variant="tertiary"
                className="px-3 py-2 text-sm font-semibold normal-case tracking-[0.02em]"
                suffixIcon="chevronDown"
              >
                {resolvedAccountLabel}
              </DynamicButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Account
              </DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link
                  href="/profile"
                  className="flex w-full items-center text-sm"
                >
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/support"
                  className="flex w-full items-center text-sm"
                >
                  Support
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  onSignOut();
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
        : (
          <>
            <DynamicButton
              size="s"
              variant="tertiary"
              href="/login"
              className="px-3 py-2 text-sm font-semibold normal-case tracking-[0.02em]"
            >
              Sign in
            </DynamicButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <DynamicButton
                  size="s"
                  variant="tertiary"
                  className="px-3 py-2 text-sm font-semibold normal-case tracking-[0.02em]"
                  suffixIcon="chevronDown"
                >
                  Resources
                </DynamicButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Help & support
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link
                    href="/support"
                    className="flex w-full items-center text-sm"
                  >
                    Support center
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
    </div>
  );
}

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const connectWallet = useWalletConnect();
  const accountLabel = getAccountLabel(user);

  const handleConnectWallet = () => {
    void connectWallet();
  };

  const handleSignOut = () => {
    void signOut();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="flex flex-col gap-3 py-3 sm:gap-4 sm:py-4">
          <div className="flex flex-col gap-3 md:grid md:grid-cols-[auto_1fr_auto] md:items-center md:gap-x-6">
            <div className="flex items-center justify-between gap-3 md:col-start-1 md:col-end-2 md:justify-start md:gap-4">
              <Link
                href="/"
                aria-label="Dynamic Capital home"
                className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-muted/40 md:px-2"
              >
                <BrandLogo
                  size="md"
                  variant="brand"
                  showText={false}
                  animated
                />
                <Text
                  as="span"
                  variant="body-default-s"
                  className="hidden font-semibold tracking-[0.01em] text-muted-foreground sm:inline"
                >
                  Dynamic Capital
                </Text>
              </Link>
              <MobileMenu
                user={user}
                onConnectWallet={() => {
                  handleConnectWallet();
                }}
                onSignOut={() => {
                  handleSignOut();
                }}
                className="md:hidden"
              />
            </div>
            <DesktopNav className="md:col-start-2 md:justify-center" />
            <HeaderActions
              user={user}
              accountLabel={accountLabel}
              onConnectWallet={handleConnectWallet}
              onSignOut={handleSignOut}
              className="md:col-start-3 md:justify-end md:justify-self-end"
            />
          </div>
        </div>
      </div>
      <RouteHintTrail />
    </header>
  );
}

export default SiteHeader;
