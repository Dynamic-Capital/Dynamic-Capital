"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { haptic } from "@/lib/telegram";
import { track } from "@/lib/metrics";
import { cn } from "@/utils";

import { MINIAPP_TABS } from "./navigation";

export function NavigationHeader() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const activeTab =
    MINIAPP_TABS.find((tab) => pathname?.startsWith(tab.href)) ??
      MINIAPP_TABS[0];

  return (
    <motion.nav
      aria-label="Mini app section overview"
      className="miniapp-nav"
      initial={reduceMotion ? false : { opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.35, ease: "easeOut" }}
    >
      <div className="miniapp-nav-card">
        <motion.div
          className="miniapp-nav-card-icon"
          key={activeTab.id}
          initial={reduceMotion ? false : { scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.3, ease: "easeOut" }}
        >
          <activeTab.Icon size={20} strokeWidth={2.2} />
        </motion.div>
        <div className="miniapp-nav-card-copy">
          <span className="miniapp-nav-card-subtitle">You're in</span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={activeTab.label}
              className="miniapp-nav-card-title"
              initial={reduceMotion ? false : { y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduceMotion ? undefined : { y: -8, opacity: 0 }}
              transition={{
                duration: reduceMotion ? 0 : 0.25,
                ease: "easeOut",
              }}
            >
              {activeTab.label}
            </motion.span>
          </AnimatePresence>
          <p className="miniapp-nav-card-description">
            {activeTab.description}
          </p>
        </div>
      </div>
      <div className="miniapp-nav-links" role="list">
        {MINIAPP_TABS.map((tab) => {
          const isActive = tab.id === activeTab.id;
          const Icon = tab.Icon;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "miniapp-nav-chip",
                isActive && "miniapp-nav-chip-active",
              )}
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                haptic(isActive ? "light" : "medium");
                void track(tab.analyticsEvent);
              }}
            >
              <Icon size={16} strokeWidth={isActive ? 2.4 : 2} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}

export default NavigationHeader;
