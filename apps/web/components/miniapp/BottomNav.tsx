"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { haptic } from "@/lib/telegram";
import { track } from "@/lib/metrics";
import { cn } from "@/utils";

import { MINIAPP_TABS } from "./navigation";

export function BottomNav() {
  const pathname = usePathname();
  const primaryTabs = MINIAPP_TABS.filter((tab) =>
    tab.showInBottomNav !== false
  );

  return (
    <nav
      aria-label="Mini app primary navigation"
      className="miniapp-bottom-nav"
    >
      <div className="miniapp-bottom-card px-4 py-3">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns:
              `repeat(${primaryTabs.length}, minmax(0, 1fr))`,
          }}
        >
          {primaryTabs.map(({ href, label, Icon, analyticsEvent }) => {
            const active = pathname?.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "miniapp-bottom-tab",
                  active && "miniapp-bottom-tab--active",
                )}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  haptic(active ? "light" : "medium");
                  void track(analyticsEvent);
                }}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    className="miniapp-bottom-tab__indicator"
                    transition={{
                      type: "spring",
                      stiffness: 220,
                      damping: 24,
                    }}
                  />
                )}
                <span className="miniapp-bottom-tab__icon">
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className="miniapp-bottom-tab__label">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default BottomNav;
