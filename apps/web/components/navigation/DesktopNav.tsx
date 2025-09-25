"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CreditCard, LogIn, User, Zap } from "lucide-react";
import NAV_ITEMS from "./nav-items";

const navItems = NAV_ITEMS;

export const DesktopNav: React.FC = () => {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  const isActive = (path: string) => pathname === path;

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
        const active = isActive(item.path);
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
              href={item.path}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          </motion.div>
        );
      })}
    </motion.nav>
  );
};

export default DesktopNav;
