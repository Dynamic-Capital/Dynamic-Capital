"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils";
import { motion, AnimatePresence, useReducedMotion, LayoutGroup } from "framer-motion";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import NAV_ITEMS from "./nav-items";

const navItems = NAV_ITEMS.filter((n) => n.showOnMobile);

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <motion.nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-bottom",
        "bg-gradient-navigation backdrop-blur-xl border-t border-border/50",
        "shadow-2xl shadow-primary/10"
      )}
      role="navigation"
      aria-label="Mobile navigation"
      initial={reduceMotion ? false : { y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
    >
      <div className="container mx-auto px-2">
        <LayoutGroup>
        <div className="grid grid-cols-5 gap-0">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            return (
              <motion.div
                key={item.id}
                initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { delay: index * 0.05, duration: 0.3, ease: "easeOut" }
                }
              >
                <Link
                  href={item.path}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 gap-1",
                    "text-sm font-medium transition-colors",
                    "hover:text-primary",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </motion.div>
            );
          })}
          <AnimatePresence>
            {pathname && (
              <motion.div
                className="absolute bottom-0 left-0 w-1/5 h-1 rounded-t-full bg-primary"
                layoutId="activeIndicator"
                initial={false}
                animate={{ x: navItems.findIndex((n) => n.path === pathname) * 100 + "%" }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }}
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
