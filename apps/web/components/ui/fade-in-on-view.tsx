"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils";

interface FadeInOnViewProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
  animation?: "fade-in-up" | "slide-in-right" | "bounce-in" | "fade-in";
}

export function FadeInOnView({
  children,
  className,
  delay = 0,
  threshold = 0.1,
  animation = "fade-in-up",
}: FadeInOnViewProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, delay);
          observer.disconnect();
        }
      },
      { threshold },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay, threshold]);

  return (
    <div
      ref={ref}
      className={cn(
        "opacity-0 transition-all duration-700 ease-out",
        isVisible && "opacity-100",
        isVisible && animation === "fade-in-up" && "animate-fade-in-up",
        isVisible && animation === "slide-in-right" && "animate-slide-in-right",
        isVisible && animation === "bounce-in" && "animate-bounce-in",
        isVisible && animation === "fade-in" && "animate-fade-in",
        className,
      )}
    >
      {children}
    </div>
  );
}
