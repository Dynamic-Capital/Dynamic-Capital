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
    <header className="sticky top-0 z-40 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
      <div className="miniapp-hero px-4 pb-4">
        <div className="flex items-start gap-3">
          <motion.div
            layout
            initial={reduceMotion ? false : { scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-inner"
          >
            <activeTab.Icon size={20} strokeWidth={2.2} />
          </motion.div>
          <div className="flex-1 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
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
        <div className="mt-4 border-t border-[hsl(var(--primary)/0.2)] pt-3">
          <nav
            className="flex gap-2 overflow-x-auto pb-1"
            aria-label="Mini app sections"
          >
            {MINIAPP_TABS.map((tab) => {
              const isActive = tab.id === activeTab.id;

              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={cn(
                    "miniapp-chip",
                    isActive && "miniapp-chip--active",
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
                      className="miniapp-chip__indicator"
                      transition={{
                        type: "spring",
                        stiffness: 220,
                        damping: 24,
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default NavigationHeader;
