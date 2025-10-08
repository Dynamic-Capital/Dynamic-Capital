"use client";

import React, { useEffect, useRef, useState } from "react";
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
import { NAV_ITEMS, type NavItem } from "./nav-items";

const navItems = NAV_ITEMS.filter((n) => n.showOnMobile);

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname() ?? "/";
  const reduceMotion = useReducedMotion();
  const columnCount = navItems.length || 1;
  const [hash, setHash] = useState<string>("");
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateHash = () => {
      setHash(window.location.hash ?? "");
    };

    updateHash();
    window.addEventListener("hashchange", updateHash);

    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const element = navRef.current;
    const updateHeight = () => {
      const height = element?.offsetHeight ?? 0;
      document.documentElement.style.setProperty(
        "--mobile-nav-height",
        `${height}px`,
      );
    };

    updateHeight();

    const resizeObserver = typeof ResizeObserver !== "undefined" && element
      ? new ResizeObserver(updateHeight)
      : null;

    if (resizeObserver && element) {
      resizeObserver.observe(element);
    }

    window.addEventListener("resize", updateHeight);

    return () => {
      window.removeEventListener("resize", updateHeight);
      resizeObserver?.disconnect();
      document.documentElement.style.setProperty(
        "--mobile-nav-height",
        "0px",
      );
    };
  }, []);

  const isActive = (item: NavItem) => {
    if (item.href?.startsWith("/#")) {
      const target = item.href.split("#")[1] ?? "";
      if (pathname !== "/") {
        return false;
      }
      if (target === "overview") {
        return hash === "" || hash === "#overview";
      }
      return hash === `#${target}`;
    }

    if (item.path === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(item.path);
  };

  const activeIndex = navItems.findIndex((item) => isActive(item));
  const indicatorWidth = 100 / columnCount;

  return (
    <motion.nav
      ref={navRef}
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
              const linkActive = isActive(item);

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
                    href={item.href ?? item.path}
                    aria-label={item.ariaLabel}
                    title={item.description}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 p-2 text-center transition-colors",
                      linkActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary",
                    )}
                  >
                    <span className="contents">
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
                    </span>
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
