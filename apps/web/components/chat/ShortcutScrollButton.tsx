"use client";

import { useCallback } from "react";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ShortcutScrollButtonProps = {
  href: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick">;

function ShortcutScrollButton({
  href,
  children,
  className,
  ...buttonProps
}: PropsWithChildren<ShortcutScrollButtonProps>) {
  const handleClick = useCallback(() => {
    const targetId = href.startsWith("#") ? href.slice(1) : href;
    const element = document.getElementById(targetId);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [href]);

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
