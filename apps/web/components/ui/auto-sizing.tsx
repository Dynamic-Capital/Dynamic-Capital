"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils";

const useIsomorphicLayoutEffect = typeof window !== "undefined"
  ? useLayoutEffect
  : useEffect;

interface AutoSizingContainerProps {
  children: React.ReactNode;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
  responsive?: boolean;
  animate?: boolean;
}

export function AutoSizingContainer({
  children,
  className,
  minHeight = 0,
  maxHeight,
  responsive = true,
  animate = true,
}: AutoSizingContainerProps) {
  const [containerHeight, setContainerHeight] = useState<number | "auto">(
    "auto",
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const frameIdRef = useRef<number | null>(null);

  const updateHeight = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const element = containerRef.current;
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const buffer = 20;
    const availableHeight = Math.max(0, viewportHeight - rect.top - buffer);

    const hasMaxHeight = typeof maxHeight === "number";
    const safeMin = hasMaxHeight ? Math.min(minHeight, maxHeight) : minHeight;
    const safeMax = hasMaxHeight
      ? Math.max(maxHeight, safeMin)
      : Number.POSITIVE_INFINITY;

    const constrainedHeight = Math.min(
      safeMax,
      Math.max(availableHeight, safeMin),
    );

    setContainerHeight((previous) =>
      previous === constrainedHeight ? previous : constrainedHeight
    );
  }, [maxHeight, minHeight]);

  const scheduleUpdate = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (frameIdRef.current) {
      cancelAnimationFrame(frameIdRef.current);
    }

    frameIdRef.current = window.requestAnimationFrame(() => {
      frameIdRef.current = null;
      updateHeight();
    });
  }, [updateHeight]);

  useEffect(() => {
    if (!responsive) {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
      setContainerHeight("auto");
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    scheduleUpdate();

    const handleResize = () => scheduleUpdate();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    let resizeObserver: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => scheduleUpdate());
      const element = containerRef.current;
      if (element) {
        resizeObserver.observe(element);
        if (element.parentElement) {
          resizeObserver.observe(element.parentElement);
        }
      }
    }

    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      resizeObserver?.disconnect();
    };
  }, [responsive, scheduleUpdate]);

  if (animate) {
    return (
      <motion.div
        ref={containerRef}
        className={cn("overflow-auto", className)}
        style={{
          height: responsive ? containerHeight : "auto",
          minHeight: typeof minHeight === "number" ? minHeight : undefined,
          maxHeight: typeof maxHeight === "number" ? maxHeight : undefined,
        }}
        layout
        transition={{
          duration: 0.3,
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", className)}
      style={{
        height: responsive ? containerHeight : "auto",
        minHeight: typeof minHeight === "number" ? minHeight : undefined,
        maxHeight: typeof maxHeight === "number" ? maxHeight : undefined,
      }}
    >
      {children}
    </div>
  );
}

interface AutoSizingGridProps {
  children: React.ReactNode;
  className?: string;
  minItemWidth?: number;
  maxColumns?: number;
  gap?: number;
  responsive?: boolean;
  stagger?: number;
}

export function AutoSizingGrid({
  children,
  className,
  minItemWidth = 280,
  maxColumns = 4,
  gap = 16,
  responsive = true,
  stagger = 0,
}: AutoSizingGridProps) {
  const [columns, setColumns] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridFrameIdRef = useRef<number | null>(null);

  const updateColumns = useCallback(() => {
    const element = gridRef.current;
    if (!element) {
      return;
    }

    const width = element.clientWidth;
    if (width <= 0) {
      return;
    }

    const safeGap = Math.max(0, gap);
    const safeMinItemWidth = Math.max(1, minItemWidth);
    const safeMaxColumns = Math.max(1, maxColumns);

    const usableWidth = Math.max(0, width - safeGap);
    const rawColumns = Math.floor(
      (usableWidth + safeGap) / (safeMinItemWidth + safeGap),
    );
    const nextColumns = Math.min(
      safeMaxColumns,
      Math.max(1, rawColumns),
    );

    setColumns((current) => (current === nextColumns ? current : nextColumns));
  }, [gap, maxColumns, minItemWidth]);

  const scheduleColumnUpdate = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (gridFrameIdRef.current) {
      cancelAnimationFrame(gridFrameIdRef.current);
    }

    gridFrameIdRef.current = window.requestAnimationFrame(() => {
      gridFrameIdRef.current = null;
      updateColumns();
    });
  }, [updateColumns]);

  useEffect(() => {
    if (!responsive) {
      if (gridFrameIdRef.current) {
        cancelAnimationFrame(gridFrameIdRef.current);
        gridFrameIdRef.current = null;
      }
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    scheduleColumnUpdate();

    const handleResize = () => scheduleColumnUpdate();
    window.addEventListener("resize", handleResize);

    let resizeObserver: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => scheduleColumnUpdate());
      const element = gridRef.current;
      if (element) {
        resizeObserver.observe(element);
        if (element.parentElement) {
          resizeObserver.observe(element.parentElement);
        }
      }
    }

    return () => {
      if (gridFrameIdRef.current) {
        cancelAnimationFrame(gridFrameIdRef.current);
        gridFrameIdRef.current = null;
      }
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
    };
  }, [responsive, scheduleColumnUpdate]);

  return (
    <motion.div
      ref={gridRef}
      className={cn("grid", className)}
      style={{
        gridTemplateColumns: responsive ? `repeat(${columns}, 1fr)` : undefined,
        gap: `${gap}px`,
      }}
      layout
      initial={stagger ? "hidden" : undefined}
      whileInView={stagger ? "visible" : undefined}
      viewport={stagger ? { once: true, amount: 0.2 } : undefined}
      variants={stagger
        ? {
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: stagger, delayChildren: 0.1 },
          },
        }
        : undefined}
      transition={{
        duration: 0.3,
        type: "spring",
        stiffness: 300,
        damping: 30,
      }}
    >
      {stagger
        ? React.Children.map(children, (child) => (
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20, scale: 0.95 },
              visible: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { type: "spring", stiffness: 260, damping: 20 },
              },
            }}
          >
            {child}
          </motion.div>
        ))
        : children}
    </motion.div>
  );
}

interface AutoSizingTextProps {
  children: React.ReactNode;
  className?: string;
  minSize?: number;
  maxSize?: number;
  containerRef?: React.RefObject<HTMLElement>;
}

export function AutoSizingText({
  children,
  className,
  minSize = 12,
  maxSize = 24,
  containerRef,
}: AutoSizingTextProps) {
  const [fontSize, setFontSize] = useState(maxSize);
  const textRef = useRef<HTMLDivElement>(null);
  const textFrameIdRef = useRef<number | null>(null);

  const adjustFontSize = useCallback(() => {
    const container = containerRef?.current ?? textRef.current?.parentElement;
    const textElement = textRef.current;

    if (!container || !textElement) {
      return;
    }

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    if (containerWidth <= 0) {
      return;
    }

    const lowerBound = Math.max(1, Math.min(minSize, maxSize));
    const upperBound = Math.max(lowerBound, Math.max(minSize, maxSize));

    let bestFit = lowerBound;
    let low = lowerBound;
    let high = upperBound;

    const fits = (size: number) => {
      textElement.style.fontSize = `${size}px`;

      const fitsWidth = textElement.scrollWidth <= containerWidth;
      const fitsHeight = containerHeight === 0
        ? true
        : textElement.scrollHeight <= containerHeight;

      return fitsWidth && fitsHeight;
    };

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);

      if (fits(mid)) {
        bestFit = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    textElement.style.fontSize = `${bestFit}px`;
    setFontSize((current) => (current === bestFit ? current : bestFit));
  }, [containerRef, maxSize, minSize]);

  const scheduleAdjust = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (textFrameIdRef.current) {
      cancelAnimationFrame(textFrameIdRef.current);
    }

    textFrameIdRef.current = window.requestAnimationFrame(() => {
      textFrameIdRef.current = null;
      adjustFontSize();
    });
  }, [adjustFontSize]);

  useIsomorphicLayoutEffect(() => {
    let isCancelled = false;

    const runAdjust = () => {
      if (!isCancelled) {
        scheduleAdjust();
      }
    };

    runAdjust();

    if (typeof document !== "undefined") {
      const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
      fonts?.ready
        .then(() => {
          if (!isCancelled) {
            scheduleAdjust();
          }
        })
        .catch(() => {
          /* ignore font loading errors */
        });
    }

    if (typeof window === "undefined") {
      return () => {
        isCancelled = true;
      };
    }

    const handleResize = () => runAdjust();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => runAdjust());
      const container = containerRef?.current ?? textRef.current?.parentElement;
      if (container) {
        resizeObserver.observe(container);
      }
    }

    return () => {
      isCancelled = true;
      if (textFrameIdRef.current) {
        cancelAnimationFrame(textFrameIdRef.current);
        textFrameIdRef.current = null;
      }
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      resizeObserver?.disconnect();
    };
  }, [scheduleAdjust, containerRef, children]);

  return (
    <div
      ref={textRef}
      className={cn("transition-all duration-300", className)}
      style={{ fontSize: `${fontSize}px` }}
    >
      {children}
    </div>
  );
}

interface ResponsiveSpacingProps {
  children: React.ReactNode;
  className?: string;
  space?: "xs" | "sm" | "md" | "lg" | "xl";
}

export function ResponsiveSpacing(
  { children, className, space = "md" }: ResponsiveSpacingProps,
) {
  const spacingMap = {
    xs: "space-y-1 sm:space-y-2",
    sm: "space-y-2 sm:space-y-3",
    md: "space-y-3 sm:space-y-4 lg:space-y-6",
    lg: "space-y-4 sm:space-y-6 lg:space-y-8",
    xl: "space-y-6 sm:space-y-8 lg:space-y-12",
  };

  return (
    <div className={cn(spacingMap[space], className)}>
      {children}
    </div>
  );
}
