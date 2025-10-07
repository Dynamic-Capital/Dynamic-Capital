"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils";
import { motion, useReducedMotion } from "framer-motion";
import NAV_ITEMS, { type NavItem } from "./nav-items";

const navItems = NAV_ITEMS;

interface DesktopNavProps {
  className?: string;
}

export const DesktopNav: React.FC<DesktopNavProps> = ({ className }) => {
  const pathname = usePathname() ?? "/";
  const shouldReduceMotion = useReducedMotion();
  const [hash, setHash] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateHash = () => {
      setHash(window.location.hash ?? "");
    };

    updateHash();
    window.addEventListener("hashchange", updateHash);

    return () => {
      window.removeEventListener("hashchange", updateHash);
    };
  }, [pathname]);

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

  return (
    <motion.nav
      className={cn(
        "hidden w-full items-stretch gap-1 overflow-x-auto md:flex lg:overflow-visible",
        "no-scrollbar",
        className,
      )}
      role="navigation"
      aria-label="Main navigation"
      initial={shouldReduceMotion ? false : { opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
    >
      <div className="flex w-full items-stretch gap-1">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <motion.div
              key={item.id}
              initial={shouldReduceMotion ? false : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.3,
                delay: shouldReduceMotion ? 0 : index * 0.1,
              }}
              whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              className="flex-shrink-0"
            >
              <Link
                href={item.href ?? item.path}
                aria-label={item.ariaLabel}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-full min-w-[10.5rem] flex-col justify-center gap-1 rounded-lg border px-3 py-3 text-left transition",
                  "bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60",
                  active
                    ? "border-primary/70 text-primary"
                    : "border-border/60 text-foreground hover:border-primary/40 hover:text-primary",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wide",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {item.step}
                </span>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="h-4 w-4" />
                  <span className="leading-tight">{item.label}</span>
                </div>
                <span
                  className={cn(
                    "text-xs leading-snug text-muted-foreground transition group-hover:text-muted-foreground/80",
                    active && "text-primary/80 group-hover:text-primary/80",
                    "line-clamp-2",
                  )}
                >
                  {item.description}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default DesktopNav;
