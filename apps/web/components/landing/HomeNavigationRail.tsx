"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/utils";

import {
  HOME_NAV_SECTION_IDS,
  HOME_NAV_SECTION_SLUG_TO_ID,
  HOME_NAV_SECTIONS,
  type HomeNavSectionId,
  type HomeNavSectionSlug,
} from "./home-navigation-config";

const observerOptions: IntersectionObserverInit = {
  root: null,
  rootMargin: "-45% 0px -40% 0px",
  threshold: [0, 0.25, 0.5, 0.75, 1],
};

interface ScrollHintState {
  atStart: boolean;
  atEnd: boolean;
}

type BrowserWindow = typeof globalThis & {
  ResizeObserver?: typeof ResizeObserver;
  addEventListener?: (
    type: string,
    listener: (...args: unknown[]) => void,
    options?: unknown,
  ) => void;
  removeEventListener?: (
    type: string,
    listener: (...args: unknown[]) => void,
    options?: unknown,
  ) => void;
};

export function HomeNavigationRail({ className }: { className?: string }) {
  const [activeId, setActiveIdState] = useState<HomeNavSectionId | null>(
    HOME_NAV_SECTIONS[0]?.id ?? null,
  );
  const activeIdRef = useRef<HomeNavSectionId | null>(activeId);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const [scrollHints, setScrollHints] = useState<ScrollHintState>({
    atStart: true,
    atEnd: false,
  });

  const setActiveId = useCallback((nextId: HomeNavSectionId) => {
    if (activeIdRef.current === nextId) {
      return;
    }

    activeIdRef.current = nextId;
    setActiveIdState(nextId);
  }, []);

  const updateScrollHints = useCallback(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const atStart = scrollLeft <= 6;
    const atEnd = scrollLeft + clientWidth >= scrollWidth - 6;

    setScrollHints((previous) => {
      if (previous.atStart === atStart && previous.atEnd === atEnd) {
        return previous;
      }

      return { atStart, atEnd };
    });
  }, []);

  const resolveIdFromSlug = useCallback((slug: string | null) => {
    if (!slug) {
      return null;
    }

    if (
      Object.prototype.hasOwnProperty.call(HOME_NAV_SECTION_SLUG_TO_ID, slug)
    ) {
      return HOME_NAV_SECTION_SLUG_TO_ID[slug as HomeNavSectionSlug];
    }

    return null;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    const sectionElements = HOME_NAV_SECTIONS.map(({ id }) => {
      const slug = HOME_NAV_SECTION_IDS[id];
      if (!slug) {
        return null;
      }

      return document.querySelector<HTMLElement>(
        `[data-section-anchor="${slug}"]`,
      );
    }).filter((element): element is HTMLElement => Boolean(element));

    if (!sectionElements.length) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (visibleEntries.length > 0) {
        const latest = visibleEntries[0];
        const anchor = resolveIdFromSlug(
          latest.target.getAttribute("data-section-anchor"),
        );
        if (anchor && anchor !== activeIdRef.current) {
          setActiveId(anchor);
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
        const anchor = resolveIdFromSlug(
          nearest.target.getAttribute("data-section-anchor"),
        );
        if (anchor && anchor !== activeIdRef.current) {
          setActiveId(anchor);
        }
      }
    }, observerOptions);

    sectionElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [resolveIdFromSlug, setActiveId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hash = window.location.hash?.replace(/^#/, "") ?? null;
    const sectionId = resolveIdFromSlug(hash);

    if (sectionId) {
      setActiveId(sectionId);
    }
  }, [resolveIdFromSlug, setActiveId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    const handleScroll = () => updateScrollHints();
    const handleResizeFallback = () => updateScrollHints();
    let resizeObserver: ResizeObserver | null = null;
    let usingWindowResizeListener = false;
    const safeWindow = window as unknown as BrowserWindow;

    updateScrollHints();

    container.addEventListener("scroll", handleScroll, { passive: true });

    if (typeof safeWindow.ResizeObserver === "function") {
      resizeObserver = new safeWindow.ResizeObserver(() => updateScrollHints());
      resizeObserver.observe(container);
    } else if (typeof safeWindow.addEventListener === "function") {
      usingWindowResizeListener = true;
      safeWindow.addEventListener("resize", handleResizeFallback);
    }

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (
        usingWindowResizeListener &&
        typeof safeWindow.removeEventListener === "function"
      ) {
        safeWindow.removeEventListener("resize", handleResizeFallback);
      }
    };
  }, [updateScrollHints]);

  return (
    <motion.nav
      aria-label="Landing page sections"
      className={cn(
        "sticky z-[5] mx-auto w-full max-w-6xl",
        "rounded-2xl border border-border/50 bg-background/80 backdrop-blur-xl",
        "shadow-lg shadow-primary/5",
        "px-3 py-3 sm:px-5 lg:px-6",
        className,
      )}
      style={{ top: "calc(var(--site-header-height, 64px) + 1rem)" }}
      initial={reduceMotion ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.4, ease: "easeOut" }}
    >
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground sm:text-xs">
          Explore Dynamic Capital
        </div>
        <div className="relative">
          <div
            ref={scrollContainerRef}
            className={cn(
              "flex gap-2 overflow-x-auto pb-2",
              "scroll-smooth overscroll-x-contain",
              "snap-x snap-mandatory md:snap-none",
              "sm:gap-3 sm:pb-1",
              "md:flex-wrap md:justify-center md:overflow-visible md:pb-0",
              "lg:justify-start",
            )}
          >
            {HOME_NAV_SECTIONS.map((section, index) => {
              const Icon = section.icon;
              const isActive = activeId === section.id;

              return (
                <motion.div
                  key={section.id}
                  className="relative snap-start"
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
                      "group relative inline-flex min-w-[10.5rem] items-center gap-2 overflow-hidden rounded-full border px-3 py-2",
                      "text-xs font-semibold tracking-tight transition-colors",
                      "sm:min-w-[11rem] sm:px-4 sm:py-2.5 sm:text-sm",
                      "md:min-w-[0] md:flex-1",
                      isActive
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border/70 bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-primary",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="contents">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-7 sm:w-7">
                        <Icon
                          className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                          strokeWidth={2.1}
                        />
                      </span>
                      <span className="flex min-w-0 flex-col items-start leading-tight">
                        <span className="truncate text-sm sm:text-[15px]">
                          {section.label}
                        </span>
                        <span className="sr-only text-[11px] font-normal text-muted-foreground/80 sm:not-sr-only sm:text-xs sm:leading-snug">
                          {section.description}
                        </span>
                      </span>
                      {isActive
                        ? (
                          <motion.span
                            aria-hidden
                            layoutId="nav-active-indicator"
                            className="absolute inset-0 -z-[1] rounded-full bg-primary/10"
                            transition={{
                              type: "spring",
                              stiffness: 260,
                              damping: 24,
                            }}
                          />
                        )
                        : null}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-1 left-0 w-8 bg-gradient-to-r from-background via-background/90 to-transparent",
              "transition-opacity duration-200",
              "md:hidden",
              scrollHints.atStart ? "opacity-0" : "opacity-100",
            )}
          />
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-1 right-0 w-8 bg-gradient-to-l from-background via-background/90 to-transparent",
              "transition-opacity duration-200",
              "md:hidden",
              scrollHints.atEnd ? "opacity-0" : "opacity-100",
            )}
          />
        </div>
      </div>
    </motion.nav>
  );
}

export default HomeNavigationRail;
