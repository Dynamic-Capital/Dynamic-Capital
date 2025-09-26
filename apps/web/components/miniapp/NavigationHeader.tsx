"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

import { haptic } from "@/lib/telegram";
import { track } from "@/lib/metrics";
import { cn } from "@/utils";

import { MINIAPP_TABS } from "./navigation";

export function NavigationHeader() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const activeTab = useMemo(() => {
    return (
      MINIAPP_TABS.find((tab) => pathname?.startsWith(tab.href)) ??
        MINIAPP_TABS[0]
    );
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40">
      <div className="border-b border-white/10 bg-background/80 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+12px)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <motion.div
            layout
            initial={reduceMotion ? false : { scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner"
          >
            <activeTab.Icon size={20} strokeWidth={2.2} />
          </motion.div>
          <div className="flex-1 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              You're viewing
            </p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.h1
                key={activeTab.id}
                initial={reduceMotion ? false : { y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduceMotion ? undefined : { y: -8, opacity: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.25,
                  ease: "easeOut",
                }}
                className="text-lg font-semibold text-foreground"
              >
                {activeTab.label}
              </motion.h1>
            </AnimatePresence>
            <p className="text-xs text-muted-foreground/80">
              {activeTab.description}
            </p>
          </div>
        </div>
      </div>
      <div className="border-b border-white/10 bg-background/80 px-4 pb-3 backdrop-blur-xl">
        <nav
          className="flex gap-2 overflow-x-auto"
          aria-label="Mini app sections"
        >
          {MINIAPP_TABS.map((tab) => {
            const isActive = tab.id === activeTab.id;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  "relative flex items-center gap-2 rounded-full border border-transparent px-3 py-2 text-xs font-semibold text-muted-foreground/80 transition",
                  "hover:border-primary/20 hover:text-foreground",
                  isActive &&
                    "border-primary/30 bg-primary/10 text-primary shadow-[0_10px_30px_rgba(59,130,246,0.25)]",
                )}
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  haptic(isActive ? "light" : "medium");
                  void track(tab.analyticsEvent);
                }}
              >
                <tab.Icon size={16} strokeWidth={isActive ? 2.4 : 2} />
                <span>{tab.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="nav-chip-indicator"
                    className="absolute inset-0 rounded-full border border-primary/40"
                    transition={{ type: "spring", stiffness: 220, damping: 24 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export default NavigationHeader;
