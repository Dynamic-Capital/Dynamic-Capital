"use client";

import { useCallback } from "react";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { useReducedMotion } from "framer-motion";

type ShortcutScrollButtonProps = {
  href: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick">;

function ShortcutScrollButton({
  href,
  children,
  className,
  ...buttonProps
}: PropsWithChildren<ShortcutScrollButtonProps>) {
  const prefersReducedMotion = useReducedMotion();

  const handleClick = useCallback(() => {
    const targetId = href.startsWith("#") ? href.slice(1) : href;
    const element = document.getElementById(targetId);
    const behavior = prefersReducedMotion ? "auto" : "smooth";
    element?.scrollIntoView({ behavior, block: "start" });
  }, [href, prefersReducedMotion]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      {...buttonProps}
    >
      {children}
    </button>
  );
}

export { ShortcutScrollButton };
