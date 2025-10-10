"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils";

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

  useEffect(() => {
    if (!responsive) {
      return;
    }

    let frameId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const updateHeight = () => {
      if (!containerRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const availableHeight = viewportHeight - rect.top - 20; // 20px buffer

      const calculatedHeight = Math.max(
        minHeight,
        maxHeight ? Math.min(availableHeight, maxHeight) : availableHeight,
      );

      setContainerHeight(calculatedHeight);
    };

    const scheduleUpdate = () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(updateHeight);
    };

    scheduleUpdate();

    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("orientationchange", scheduleUpdate);

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(scheduleUpdate);
      const element = containerRef.current;
      const parent = element?.parentElement;
      if (element) {
        resizeObserver.observe(element);
      }
      if (parent) {
        resizeObserver.observe(parent);
      }
    }

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("orientationchange", scheduleUpdate);
      resizeObserver?.disconnect();
    };
  }, [responsive, minHeight, maxHeight]);

  if (animate) {
    return (
      <motion.div
        ref={containerRef}
        className={cn("overflow-auto", className)}
        style={{
          height: responsive ? containerHeight : "auto",
          minHeight: minHeight || undefined,
          maxHeight: maxHeight || undefined,
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
        minHeight: minHeight || undefined,
        maxHeight: maxHeight || undefined,
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

  useEffect(() => {
    if (!responsive) {
      return;
    }

    let frameId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const updateColumns = () => {
      if (!gridRef.current) {
        return;
      }

      const containerWidth = gridRef.current.offsetWidth;
      const availableWidth = containerWidth - gap;
      const calculatedColumns = Math.floor(
        availableWidth / (minItemWidth + gap),
      );
      const finalColumns = Math.min(Math.max(1, calculatedColumns), maxColumns);
      setColumns(finalColumns);
    };

    const scheduleUpdate = () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(updateColumns);
    };

    scheduleUpdate();
    window.addEventListener("resize", scheduleUpdate);

    if (typeof ResizeObserver !== "undefined" && gridRef.current) {
      resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(gridRef.current);
      if (gridRef.current.parentElement) {
        resizeObserver.observe(gridRef.current.parentElement);
      }
    }

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      window.removeEventListener("resize", scheduleUpdate);
      resizeObserver?.disconnect();
    };
  }, [responsive, minItemWidth, maxColumns, gap]);

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

  useEffect(() => {
    let frameId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const adjustFontSize = () => {
      const container = containerRef?.current || textRef.current?.parentElement;
      const textElement = textRef.current;

      if (container && textElement) {
        let currentSize = maxSize;
        textElement.style.fontSize = `${currentSize}px`;

        while (
          (textElement.scrollWidth > container.offsetWidth ||
            textElement.scrollHeight > container.offsetHeight) &&
          currentSize > minSize
        ) {
          currentSize -= 1;
          textElement.style.fontSize = `${currentSize}px`;
        }

        setFontSize(currentSize);
      }
    };

    const scheduleAdjust = () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(adjustFontSize);
    };

    scheduleAdjust();
    window.addEventListener("resize", scheduleAdjust);
    window.addEventListener("orientationchange", scheduleAdjust);

    const container = containerRef?.current || textRef.current?.parentElement;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(scheduleAdjust);
      if (container) {
        resizeObserver.observe(container);
      }
      if (textRef.current) {
        resizeObserver.observe(textRef.current);
      }
    }

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      window.removeEventListener("resize", scheduleAdjust);
      window.removeEventListener("orientationchange", scheduleAdjust);
      resizeObserver?.disconnect();
    };
  }, [minSize, maxSize, containerRef, children]);

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
