"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";

import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import {
  CTA_LINKS,
  LANDING_SECTION_IDS,
} from "@/components/landing/landing-config";
import { cn } from "@/utils";

import { DesktopNav } from "./DesktopNav";
import { MobileMenu } from "./MobileMenu";

export function SiteHeader() {
  const headerRef = useRef<HTMLElement | null>(null);
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
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
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

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-primary md:inline-flex"
          >
            <Link href={`/#${LANDING_SECTION_IDS.highlights}`}>
              Product tour
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden border-border/70 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary lg:inline-flex"
          >
            <Link
              href={CTA_LINKS.telegram}
              target="_blank"
              rel="noreferrer"
            >
              Telegram
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="hidden font-semibold uppercase tracking-wide md:inline-flex"
          >
            <Link
              href={CTA_LINKS.invest}
              target="_blank"
              rel="noreferrer"
            >
              Launch desk
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="md:hidden"
          >
            <Link
              href={CTA_LINKS.invest}
              target="_blank"
              rel="noreferrer"
            >
              Launch
            </Link>
          </Button>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
