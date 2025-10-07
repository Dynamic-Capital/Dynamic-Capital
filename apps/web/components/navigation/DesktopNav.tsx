"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/utils";

import NAV_ITEMS from "./nav-items";

interface DesktopNavProps {
  className?: string;
}

const PRIMARY_NAV = NAV_ITEMS.slice(0, 6);

export function DesktopNav({ className }: DesktopNavProps) {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      className={cn(
        "hidden flex-1 flex-wrap items-center gap-2 md:flex",
        className,
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {PRIMARY_NAV.map((item) => {
        const target = item.href ?? item.path;
        const isAnchorLink = target.includes("#");
        const active = isAnchorLink
          ? pathname === "/"
          : target === "/"
          ? pathname === "/"
          : pathname.startsWith(item.path);

        return (
          <Link
            key={item.id}
            href={target}
            aria-label={item.ariaLabel}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/40 hover:text-primary",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default DesktopNav;
