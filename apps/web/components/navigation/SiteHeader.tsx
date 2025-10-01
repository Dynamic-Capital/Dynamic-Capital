"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { LifeBuoy } from "lucide-react";

import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/hooks/useAuth";
import { useWalletConnect } from "@/hooks/useWalletConnect";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";

import { DesktopNav } from "./DesktopNav";
import { MobileMenu } from "./MobileMenu";

export function SiteHeader() {
  const headerRef = useRef<HTMLElement | null>(null);
  const { user, signOut } = useAuth();
  const connectWallet = useWalletConnect();
  const { scrollYProgress } = useScroll();
  const scrollProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 20,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateHeaderHeight = () => {
      const headerHeight = headerRef.current?.offsetHeight;
      if (typeof headerHeight === "number") {
        document.documentElement.style.setProperty(
          "--site-header-height",
          `${headerHeight}px`,
        );
      }
    };

    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);

    return () => {
      window.removeEventListener("resize", updateHeaderHeight);
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className={cn(
        "sticky top-0 z-40 w-full backdrop-blur-xl",
        "bg-background/70 supports-[backdrop-filter]:bg-background/60 border-b border-border/60",
      )}
    >
      <motion.div
        className="h-0.5 w-full origin-left bg-gradient-to-r from-primary/0 via-primary/60 to-accent/60"
        style={{ scaleX: scrollProgress }}
        aria-hidden
      />
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link
          href="/"
          aria-label="Dynamic Capital home"
          className="flex items-center gap-3"
        >
          <span className="contents">
            <BrandLogo size="md" variant="brand" showText={false} animated />
            <span className="hidden text-sm font-semibold uppercase tracking-[0.32em] text-muted-foreground sm:inline">
              Dynamic Capital
            </span>
          </span>
        </Link>

        <DesktopNav />

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            className="hidden md:inline-flex"
            onClick={() => {
              void connectWallet();
            }}
          >
            Connect wallet
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary lg:flex"
          >
            <Link href="/support">Support</Link>
          </Button>
          {user
            ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => signOut()}
                className="hidden lg:inline-flex"
              >
                Sign out
              </Button>
            )
            : (
              <Button
                asChild
                size="sm"
                variant="secondary"
                className="hidden lg:inline-flex"
              >
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          <div className="flex items-center gap-2 md:hidden">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void connectWallet();
              }}
            >
              Connect
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Open support"
            >
              <Link href="/support" aria-label="Support center">
                <span className="contents">
                  <LifeBuoy className="h-5 w-5" />
                  <span className="sr-only">Support</span>
                </span>
              </Link>
            </Button>
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
