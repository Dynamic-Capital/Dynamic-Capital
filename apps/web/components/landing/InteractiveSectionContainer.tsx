"use client";

import { type PointerEvent, type ReactNode, useCallback } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

import { cn } from "@/utils";

interface InteractiveSectionContainerProps {
  children: ReactNode;
  /**
   * Additional className applied to the outer wrapper. The wrapper already provides responsive padding
   * and a centered max-width layout.
   */
  className?: string;
  /**
   * Class name forwarded to the inner content wrapper where the section markup is rendered.
   */
  innerClassName?: string;
  /**
   * Tailwind classes applied to the animated glow background. Useful for tweaking rounded corners or borders.
   */
  glowClassName?: string;
  /**
   * Base color used for the interactive radial highlight. Defaults to the brand accent glow.
   */
  glowColor?: string;
  /**
   * Disable hover driven interactions when set to false (for example for static sections).
   */
  interactive?: boolean;
}

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

export function InteractiveSectionContainer({
  children,
  className,
  innerClassName,
  glowClassName,
  glowColor = "rgba(80, 214, 255, 0.18)",
  interactive = true,
}: InteractiveSectionContainerProps) {
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const springX = useSpring(mouseX, {
    stiffness: 150,
    damping: 25,
    mass: 0.2,
  });
  const springY = useSpring(mouseY, {
    stiffness: 150,
    damping: 25,
    mass: 0.2,
  });

  const xPercent = useTransform(springX, (value) => `${value * 100}%`);
  const yPercent = useTransform(springY, (value) => `${value * 100}%`);

  const glowBackground =
    useMotionTemplate`radial-gradient(420px circle at ${xPercent} ${yPercent}, ${glowColor}, transparent 70%)`;

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!interactive || event.pointerType !== "mouse") {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const x = clamp01((event.clientX - rect.left) / rect.width);
      const y = clamp01((event.clientY - rect.top) / rect.height);

      mouseX.set(x);
      mouseY.set(y);
    },
    [interactive, mouseX, mouseY],
  );

  const handlePointerLeave = useCallback(() => {
    if (!interactive) {
      return;
    }

    mouseX.set(0.5);
    mouseY.set(0.5);
  }, [interactive, mouseX, mouseY]);

  return (
    <div
      className={cn(
        "group relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8",
        className,
      )}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <motion.div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 rounded-[28px] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100 group-focus-within:opacity-100",
          glowClassName,
        )}
        style={{ background: glowBackground }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 rounded-[32px] border border-white/10 bg-gradient-to-b from-white/5 via-transparent to-white/5 opacity-70"
      />
      <div className={cn("relative z-10 w-full", innerClassName)}>
        {children}
      </div>
    </div>
  );
}
