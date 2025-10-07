"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils";
import { motion, useReducedMotion } from "framer-motion";
import NAV_ITEMS, { type NavItem } from "./nav-items";

const navItems = NAV_ITEMS;

export const DesktopNav: React.FC = () => {
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
      className="hidden md:flex items-center gap-1"
      role="navigation"
      aria-label="Main navigation"
      initial={shouldReduceMotion ? false : { opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
    >
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
            whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
          >
            <Link
              href={item.href ?? item.path}
              aria-label={item.ariaLabel}
              className={cn(
                "flex min-w-[11rem] flex-col gap-1 rounded-md px-4 py-3 transition",
                active
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <span className="contents">
                <span
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-wide",
                    active
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground",
                  )}
                >
                  {item.step}
                </span>
                <div className="flex items-center gap-2 font-medium">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                <span
                  className={cn(
                    "text-xs leading-snug",
                    active
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground",
                  )}
                >
                  {item.description}
                </span>
              </span>
            </Link>
          </motion.div>
        );
      })}
    </motion.nav>
  );
};

export default DesktopNav;
