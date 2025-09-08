"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CreditCard, User, LogIn, Zap } from "lucide-react";
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
            <Button
              asChild
              variant={active ? "default" : "ghost"}
              size="sm"
              className={cn(
                "relative transition-all duration-300 group",
                "focus:ring-2 focus:ring-primary focus:ring-offset-2",
                active && "bg-gradient-brand text-white shadow-lg",
                !active && "hover:bg-primary/10 hover:text-primary"
              )}
            >
              <Link
                href={item.path}
                className="flex items-center gap-2 relative overflow-hidden"
                aria-label={item.ariaLabel}
                aria-current={active ? "page" : undefined}
              >
                <motion.div
                  animate={
                    active
                      ? shouldReduceMotion
                        ? { scale: 1.05 }
                        : { scale: 1.1, rotate: 360 }
                      : { scale: 1, rotate: 0 }
                  }
                  transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
                >
                  <Icon className="h-4 w-4" />
                </motion.div>
                <span className="font-medium">{item.label}</span>
                <AnimatePresence>
                  {!shouldReduceMotion &&
                    active && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        exit={{ x: "100%" }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      />
                    )}
                </AnimatePresence>
              </Link>
            </Button>
          </motion.div>
        );
      })}
      
      {/* Auth Button */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3, delay: shouldReduceMotion ? 0 : 0.5 }}
          whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
        >
        <Button
          asChild
          variant="outline"
          size="sm"
          className={cn(
            "ml-4 transition-all duration-300 group",
            "border-primary/20 hover:border-primary hover:bg-primary/5",
            "hover:text-primary hover:shadow-md"
          )}
        >
          <Link
            href="/auth"
            className="flex items-center gap-2"
            aria-label="Sign in to your account"
          >
            <motion.div
              whileHover={shouldReduceMotion ? undefined : { rotate: -10 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            >
              <LogIn className="h-4 w-4" />
            </motion.div>
            <span className="font-medium">Sign In</span>
          </Link>
        </Button>
      </motion.div>
    </motion.nav>
  );
};

export default DesktopNav;