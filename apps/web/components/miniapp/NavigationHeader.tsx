"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

import { haptic } from "@/lib/telegram";
import { track } from "@/lib/metrics";
import { cn } from "@/utils";

import {
  MINIAPP_TABS,
  type MiniAppTab,
  type MiniAppTabTone,
} from "./navigation";

const badgeToneMap: Record<MiniAppTabTone, string> = {
  accent: "border-primary/60 bg-primary/20 text-primary-foreground",
  neutral: "border-white/20 bg-white/10 text-white/70",
  warning: "border-amber-500/40 bg-amber-500/15 text-amber-200",
};

export function NavigationHeader() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const activeTab = useMemo<MiniAppTab>(() => {
    return (
      MINIAPP_TABS.find((tab) => pathname?.startsWith(tab.href)) ??
        MINIAPP_TABS[0]
    );
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
      <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/12 via-white/6 to-transparent px-4 py-4 shadow-[0_18px_48px_rgba(8,10,18,0.55)]">
        <div className="flex items-start gap-3">
          <motion.div
            layout
            initial={reduceMotion ? false : { scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white"
          >
            <activeTab.Icon size={20} strokeWidth={2.2} />
          </motion.div>
          <div className="flex-1 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
              {activeTab.eyebrow}
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
                className="text-lg font-semibold text-white"
              >
                {activeTab.label}
              </motion.h1>
            </AnimatePresence>
            <p className="text-xs text-white/70">{activeTab.description}</p>
          </div>
          {activeTab.badge
            ? (
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                  badgeToneMap[activeTab.badge.tone ?? "accent"],
                )}
              >
                {activeTab.badge.label}
              </span>
            )
            : null}
        </div>
      </div>
      <nav
        aria-label="Mini app sections"
        className="mt-4 flex gap-3 overflow-x-auto pb-2"
      >
        {MINIAPP_TABS.map((tab) => {
          const isActive = tab.id === activeTab.id;
          const badgeTone = badgeToneMap[tab.badge?.tone ?? "accent"];
          const metaTone = badgeToneMap[tab.meta?.tone ?? "neutral"];

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "relative flex min-w-[220px] flex-col gap-2 rounded-2xl border px-4 py-3 text-left transition",
                isActive
                  ? "border-primary/50 bg-primary/15 text-white shadow-[0_18px_42px_rgba(48,194,242,0.35)]"
                  : "border-white/15 bg-white/5 text-white/75 hover:border-white/30 hover:text-white",
              )}
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                haptic(isActive ? "light" : "medium");
                void track(tab.analyticsEvent);
              }}
            >
              {isActive && (
                <motion.span
                  layoutId="nav-pill-indicator"
                  className="absolute inset-0 -z-10 rounded-2xl border border-primary/40 bg-primary/20"
                  transition={{
                    type: "spring",
                    stiffness: 220,
                    damping: 24,
                  }}
                />
              )}
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white",
                    isActive &&
                      "border-primary/50 bg-primary/25 text-primary-foreground",
                  )}
                >
                  <tab.Icon size={18} strokeWidth={isActive ? 2.4 : 2} />
                </span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                    {tab.eyebrow}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {tab.label}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-white/70">{tab.description}</p>
              {(tab.badge || tab.meta)
                ? (
                  <div className="flex items-center gap-2">
                    {tab.badge
                      ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            badgeTone,
                          )}
                        >
                          {tab.badge.label}
                        </span>
                      )
                      : null}
                    {tab.meta
                      ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            metaTone,
                          )}
                        >
                          {tab.meta.icon ? <tab.meta.icon size={12} /> : null}
                          {tab.meta.label}
                        </span>
                      )
                      : null}
                  </div>
                )
                : null}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

export default NavigationHeader;
