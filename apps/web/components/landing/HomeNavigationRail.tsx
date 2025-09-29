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
        "group sticky z-[5] mx-auto w-full max-w-4xl",
        "relative overflow-visible",
        "px-3 sm:px-4",
        className,
      )}
      style={{ top: "calc(var(--site-header-height, 64px) + 1rem)" }}
      initial={reduceMotion ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.4, ease: "easeOut" }}
    >
      <div className="relative flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <div className="relative w-full sm:w-auto">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-[1] rounded-full"
          >
            <div className="absolute inset-[-65%] rounded-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_55%)] blur-3xl" />
            <div className="absolute inset-[-65%] translate-y-1/3 rounded-full bg-[radial-gradient(circle_at_bottom,rgba(255,153,102,0.16),transparent_65%)] blur-3xl" />
          </div>
          <div
            ref={scrollContainerRef}
            className={cn(
              "flex items-center gap-1.5 overflow-x-auto rounded-full border border-white/10 bg-black/80 px-2.5 py-2",
              "shadow-[0_12px_48px_-24px_rgba(255,153,102,0.65)] backdrop-blur-xl",
              "scroll-smooth overscroll-x-contain",
              "snap-x snap-mandatory md:snap-none",
              "sm:gap-2 sm:px-3 sm:py-2.5",
              "md:justify-center md:overflow-visible",
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
                      "group relative inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full",
                      "text-sm font-medium text-white/70 transition-all duration-200",
                      "sm:h-12 sm:w-12",
                      isActive ? "text-white" : "hover:text-white",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="sr-only">{section.label}</span>
                    <Icon className="h-5 w-5" strokeWidth={2} />
                    {isActive
                      ? (
                        <motion.span
                          aria-hidden
                          layoutId="nav-active-indicator"
                          className="absolute inset-0 -z-[1] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.18),rgba(255,153,102,0.18)_45%,rgba(0,0,0,0)_75%)]"
                          transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 26,
                          }}
                        />
                      )
                      : (
                        <span
                          aria-hidden
                          className="absolute inset-0 -z-[1] rounded-full border border-white/8 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        />
                      )}
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
