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

  return (
    <nav className="sticky bottom-0 left-0 right-0 z-40">
      <div className="border-t border-white/10 bg-background/80 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-xl shadow-[0_-20px_60px_rgba(0,0,0,0.35)]">
        <div className="grid grid-cols-4 gap-2">
          {MINIAPP_TABS.map(({ href, label, Icon, analyticsEvent }) => {
            const active = pathname?.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-muted-foreground/80 transition",
                  "hover:text-foreground",
                  active && "text-primary",
                )}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  haptic(active ? "light" : "medium");
                  void track(analyticsEvent);
                }}
              >
                <span className="relative flex h-10 w-full items-center justify-center">
                  {active && (
                    <motion.span
                      layoutId="bottom-nav-active"
                      className="absolute inset-y-0 w-full rounded-xl bg-primary/10"
                      transition={{
                        type: "spring",
                        stiffness: 220,
                        damping: 24,
                      }}
                    />
                  )}
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.4 : 2}
                    className="relative z-10"
                  />
                </span>
                <span className="relative z-10">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default BottomNav;
