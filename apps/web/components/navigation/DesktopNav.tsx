"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

import { LANDING_SECTION_IDS } from "@/components/landing/landing-config";
import { cn } from "@/utils";

import NAV_ITEMS, { type NavItem } from "./nav-items";

const DEFAULT_ACTIVE_ID = LANDING_SECTION_IDS.hero;

export const DesktopNav: React.FC = () => {
  const pathname = usePathname() ?? "/";
  const shouldReduceMotion = useReducedMotion();
  const [activeSectionId, setActiveSectionId] = useState<string>(
    DEFAULT_ACTIVE_ID,
  );

  const navItems = useMemo(() => NAV_ITEMS, []);
  const isLandingRoute = pathname === "/";

  useEffect(() => {
    if (!isLandingRoute || typeof window === "undefined") {
      return undefined;
    }

    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (!sections.length) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleEntry?.target?.id) {
          setActiveSectionId(visibleEntry.target.id);
        }
      },
      {
        rootMargin: "-45% 0px -45% 0px",
        threshold: [0.2, 0.4, 0.6, 0.8, 1],
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
      observer.disconnect();
    };
  }, [isLandingRoute, navItems]);

  useEffect(() => {
    if (!isLandingRoute || typeof window === "undefined") {
      return;
    }

    const hash = window.location.hash.replace("#", "");
    setActiveSectionId(hash || DEFAULT_ACTIVE_ID);
  }, [isLandingRoute]);

  const isActive = (item: NavItem) => {
    if (isLandingRoute) {
      return activeSectionId === item.id;
    }

    if (item.path === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(item.path);
  };

  const handleClick = (item: NavItem) => {
    if (!isLandingRoute) {
      return;
    }

    setActiveSectionId(item.id);
  };

  return (
    <motion.nav
      className="hidden items-center md:flex"
      role="navigation"
      aria-label="Main navigation"
      initial={shouldReduceMotion ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
    >
      <ul className="flex items-center gap-1 rounded-full border border-border/60 bg-background/70 p-1 shadow-sm">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item);

          return (
            <motion.li
              key={item.id}
              className="relative"
              initial={shouldReduceMotion ? false : { opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.3,
                delay: shouldReduceMotion ? 0 : index * 0.05,
              }}
            >
              <Link
                href={item.href ?? item.path}
                aria-label={item.ariaLabel}
                scroll
                prefetch={false}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                  active
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
                onClick={() => handleClick(item)}
              >
                <Icon className={cn("h-4 w-4", active ? "text-primary" : "")} />
                <span className="sr-only sm:not-sr-only sm:inline">
                  {item.step}
                </span>
                <span>{item.label}</span>
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </motion.nav>
  );
};

export default DesktopNav;
