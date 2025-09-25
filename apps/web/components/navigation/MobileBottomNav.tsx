"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "framer-motion";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import NAV_ITEMS from "./nav-items";

const navItems = NAV_ITEMS.filter((n) => n.showOnMobile);

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const columnCount = navItems.length || 1;

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  const activeIndex = navItems.findIndex((item) => isActive(item.path));
  const indicatorWidth = 100 / columnCount;

  return (
    <motion.nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-bottom",
        "bg-gradient-navigation backdrop-blur-xl border-t border-border/50",
        "shadow-2xl shadow-primary/10",
      )}
      role="navigation"
      aria-label="Mobile navigation"
      initial={reduceMotion ? false : { y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={reduceMotion
        ? { duration: 0 }
        : { duration: 0.5, ease: "easeOut" }}
    >
      <div className="container mx-auto px-2">
        <LayoutGroup>
          <div
            className="relative grid gap-0"
            style={{
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
            }}
          >
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const linkActive = isActive(item.path);

              return (
                <motion.div
                  key={item.id}
                  initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={reduceMotion
                    ? { duration: 0 }
                    : { delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
                >
                  <Link
                    href={item.path}
                    aria-label={item.ariaLabel}
                    title={item.description}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 p-2 text-center transition-colors",
                      linkActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wide",
                        linkActive ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {item.step}
                    </span>
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium leading-tight">
                      {item.label}
                    </span>
                    <span className="sr-only">{item.description}</span>
                  </Link>
                </motion.div>
              );
            })}
            <AnimatePresence>
              {pathname && activeIndex >= 0 && (
                <motion.div
                  className="pointer-events-none absolute bottom-0 left-0 h-1 rounded-t-full bg-primary"
                  layoutId="activeIndicator"
                  initial={false}
                  animate={{ x: `${activeIndex * indicatorWidth}%` }}
                  style={{ width: `${indicatorWidth}%` }}
                  transition={reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.3, ease: "easeOut" }}
                />
              )}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      </div>
    </motion.nav>
  );
};

export default MobileBottomNav;
