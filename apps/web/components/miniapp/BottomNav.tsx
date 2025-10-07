"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";

import { haptic } from "@/lib/telegram";
import { track } from "@/lib/metrics";
import { cn } from "@/utils";

import { MINIAPP_TABS, type MiniAppTabIcon } from "./navigation";

function renderTabIcon(icon: MiniAppTabIcon, active: boolean) {
  if (icon.type === "lucide") {
    const IconComponent = icon.icon;
    return <IconComponent size={20} strokeWidth={active ? 2.4 : 2} />;
  }

  return (
    <Image
      src={icon.src}
      alt={icon.alt}
      width={20}
      height={20}
      className={cn("h-5 w-5", active ? "opacity-100" : "opacity-80")}
    />
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const primaryTabs = MINIAPP_TABS.filter((tab) =>
    tab.showInBottomNav !== false
  );

  return (
    <nav className="sticky bottom-0 left-0 right-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
      <div className="miniapp-bottom-card px-4 py-3">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns:
              `repeat(${primaryTabs.length}, minmax(0, 1fr))`,
          }}
        >
          {primaryTabs.map(({ href, label, icon, analyticsEvent }) => {
            const active = pathname?.startsWith(href) ?? false;

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
                  {renderTabIcon(icon, active)}
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
