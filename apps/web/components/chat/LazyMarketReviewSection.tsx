"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useInView } from "framer-motion";

type UseInViewOptions = Parameters<typeof useInView>[1];
type UseInViewMargin = UseInViewOptions extends undefined ? string
  : NonNullable<UseInViewOptions>["margin"];

interface LazyMarketReviewSectionProps {
  children: (isReady: boolean) => ReactNode;
  className?: string;
  rootMargin?: UseInViewMargin;
}

function LazyMarketReviewSection({
  children,
  className,
  rootMargin,
}: LazyMarketReviewSectionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const margin = (rootMargin ?? "200px 0px 200px 0px") as UseInViewMargin;
  const isInView = useInView(containerRef, { once: true, margin });
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    if (isInView) {
      setHasEntered(true);
    }
  }, [isInView]);

  return (
    <div
      ref={containerRef}
      className={className}
      data-lazy-market-review-section
    >
      {children(hasEntered)}
    </div>
  );
}

export { LazyMarketReviewSection };
