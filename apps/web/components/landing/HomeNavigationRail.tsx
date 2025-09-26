"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/utils";

import {
  HOME_NAV_SECTIONS,
  type HomeNavSectionId,
} from "./home-navigation-config";

const observerOptions: IntersectionObserverInit = {
  root: null,
  rootMargin: "-45% 0px -40% 0px",
  threshold: [0, 0.25, 0.5, 0.75, 1],
};

export function HomeNavigationRail({ className }: { className?: string }) {
  const [activeId, setActiveIdState] = useState<HomeNavSectionId | null>(
    HOME_NAV_SECTIONS[0]?.id ?? null,
  );
  const activeIdRef = useRef<HomeNavSectionId | null>(activeId);
  const reduceMotion = useReducedMotion();

  const setActiveId = useCallback((nextId: HomeNavSectionId) => {
    if (activeIdRef.current === nextId) {
      return;
    }

    activeIdRef.current = nextId;
    setActiveIdState(nextId);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    const sectionElements = HOME_NAV_SECTIONS.map(({ id }) =>
      document.querySelector<HTMLElement>(`[data-section-anchor="${id}"]`)
    ).filter((element): element is HTMLElement => Boolean(element));

    if (!sectionElements.length) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (visibleEntries.length > 0) {
        const latest = visibleEntries[0];
        const anchor = latest.target.getAttribute("data-section-anchor");
        if (anchor && anchor !== activeIdRef.current) {
          setActiveId(anchor as HomeNavSectionId);
        }
        return;
      }

      const nearest = entries
        .slice()
        .sort((a, b) =>
          Math.abs(a.boundingClientRect.top) -
          Math.abs(b.boundingClientRect.top)
        )[0];

      if (nearest) {
        const anchor = nearest.target.getAttribute("data-section-anchor");
        if (anchor && anchor !== activeIdRef.current) {
          setActiveId(anchor as HomeNavSectionId);
        }
      }
    }, observerOptions);

    sectionElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [setActiveId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hash = window.location.hash?.replace(/^#/, "") as
      | HomeNavSectionId
      | undefined;

    if (hash && HOME_NAV_SECTIONS.some((section) => section.id === hash)) {
      setActiveId(hash);
    }
  }, [setActiveId]);

  return (
    <motion.nav
      aria-label="Landing page sections"
      className={cn(
        "sticky top-4 z-[5] mx-auto w-full max-w-6xl",
        "rounded-2xl border border-border/50 bg-background/80 backdrop-blur-xl",
        "shadow-lg shadow-primary/5",
        "px-4 py-3",
        className,
      )}
      initial={reduceMotion ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.4, ease: "easeOut" }}
    >
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Explore the desk
        </div>
        <div className="relative overflow-hidden">
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            role="tablist"
            aria-orientation="horizontal"
          >
            {HOME_NAV_SECTIONS.map((section, index) => {
              const Icon = section.icon;
              const isActive = activeId === section.id;

              return (
                <motion.div
                  key={section.id}
                  className="relative"
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.3,
                    delay: reduceMotion ? 0 : index * 0.05,
                  }}
                >
                  <Link
                    href={section.href}
                    className={cn(
                      "group inline-flex items-center gap-2 rounded-full border px-3 py-2",
                      "text-xs font-semibold transition-colors",
                      isActive
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border/70 bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-primary",
                    )}
                    aria-current={isActive ? "page" : undefined}
                    role="tab"
                    aria-selected={isActive}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </span>
                    <span className="flex flex-col items-start leading-tight">
                      <span>{section.label}</span>
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {section.description}
                      </span>
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

export default HomeNavigationRail;
