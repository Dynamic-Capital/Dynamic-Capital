"use client";

import Link from "next/link";

import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/hooks/useAuth";
import { useWalletConnect } from "@/hooks/useWalletConnect";
import {
  Button as DynamicButton,
  Row,
  Text,
} from "@/components/dynamic-ui-system";

import { DesktopNav } from "./DesktopNav";
import { MobileMenu } from "./MobileMenu";
import { RouteHintTrail } from "./RouteHintTrail";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const connectWallet = useWalletConnect();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-4 py-3 sm:py-4">
        <Row
          gap="12"
          wrap
          vertical="center"
          className="w-full gap-y-4"
          role="navigation"
          aria-label="Primary workspace header"
        >
          <Link
            href="/"
            aria-label="Dynamic Capital home"
            className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-muted/40"
          >
            <BrandLogo size="md" variant="brand" showText={false} animated />
            <Text
              as="span"
              variant="label-default-s"
              className="hidden uppercase tracking-[0.32em] text-muted-foreground sm:inline"
            >
              Dynamic Capital
            </Text>
          </Link>

          <DesktopNav className="flex-1 justify-center" />

          <Row gap="8" vertical="center" className="ml-auto">
            <DynamicButton
              size="s"
              variant="secondary"
              className="hidden md:inline-flex"
              onClick={() => {
                void connectWallet();
              }}
              suffixIcon="arrowUpRight"
            >
              Connect wallet
            </DynamicButton>
            <DynamicButton
              size="s"
              variant="tertiary"
              href="/support"
              className="hidden md:inline-flex"
            >
              Support
            </DynamicButton>
            {user
              ? (
                <>
                  <DynamicButton
                    size="s"
                    variant="tertiary"
                    href="/profile"
                    className="hidden md:inline-flex"
                  >
                    Profile
                  </DynamicButton>
                  <DynamicButton
                    size="s"
                    variant="secondary"
                    className="hidden md:inline-flex"
                    onClick={() => {
                      void signOut();
                    }}
                  >
                    Sign out
                  </DynamicButton>
                </>
              )
              : (
                <DynamicButton
                  size="s"
                  variant="secondary"
                  href="/login"
                  className="hidden md:inline-flex"
                >
                  Sign in
                </DynamicButton>
              )}
            <Row gap="8" vertical="center" className="md:hidden">
              <DynamicButton
                size="s"
                variant="secondary"
                onClick={() => {
                  void connectWallet();
                }}
                suffixIcon="arrowUpRight"
              >
                Connect
              </DynamicButton>
              <DynamicButton size="s" variant="tertiary" href="/support">
                Support
              </DynamicButton>
              <MobileMenu />
            </Row>
          </Row>
        </Row>
      </div>
      <RouteHintTrail />
    </header>
  );
}

export default SiteHeader;
