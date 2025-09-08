import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import NAV_ITEMS from "./nav-items";

const navItems = NAV_ITEMS.filter((n) => n.showOnMobile);

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  return (
    <motion.nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
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
        <div className="grid grid-cols-5 gap-0">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <motion.div
                key={item.id}
                initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : {
                        duration: 0.3,
                        delay: index * 0.1,
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                      }
                }
                whileTap={reduceMotion ? undefined : { scale: 0.9 }}
              >
                <Link
                  to={item.path}
                  className={cn(
                    "relative flex flex-col items-center justify-center p-3 min-h-[64px]",
                    !reduceMotion && "transition-all duration-300",
                    "group rounded-2xl mx-1",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    "overflow-hidden",
                    isActive
                      ? "text-white bg-gradient-brand shadow-lg shadow-primary/30"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  )}
                  aria-label={item.ariaLabel}
                  aria-current={isActive ? "page" : undefined}
                >
                  <AnimatePresence>
                    {isActive && !reduceMotion && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        exit={{ x: "100%" }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    )}
                  </AnimatePresence>

                  <motion.div
                    animate={
                      isActive ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }
                    }
                    transition={{ duration: reduceMotion ? 0 : 0.2 }}
                    className="relative z-10"
                  >
                    <Icon className="h-5 w-5" />
                  </motion.div>

                  <motion.span
                    className={cn(
                      "text-xs font-medium mt-1 relative z-10",
                      isActive
                        ? "text-white font-semibold"
                        : "text-muted-foreground group-hover:text-primary"
                    )}
                    animate={
                      isActive ? { scale: 1.05, fontWeight: 600 } : { scale: 1 }
                    }
                    transition={{ duration: reduceMotion ? 0 : 0.2 }}
                  >
                    {item.label}
                  </motion.span>
                </Link>
              </motion.div>
            );
          })}

          {/* Theme Toggle */}
          <motion.div
            className="flex flex-col items-center justify-center p-3 min-h-[64px] mx-1"
            initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    duration: 0.3,
                    delay: 0.4,
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                  }
            }
            whileTap={reduceMotion ? undefined : { scale: 0.9 }}
          >
            <motion.div
              whileHover={reduceMotion ? undefined : { rotate: 180 }}
              transition={{ duration: reduceMotion ? 0 : 0.3 }}
            >
              <ThemeToggle />
            </motion.div>
            <span className="text-xs font-medium mt-1 text-muted-foreground">
              Theme
            </span>
          </motion.div>
        </div>
      </div>
    </motion.nav>
  );
};

export default MobileBottomNav;
