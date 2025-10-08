"use client";

import { usePathname } from "next/navigation";

import { Row, SmartLink, Text } from "@/components/dynamic-ui-system";
import { cn } from "@/utils";

import { PRIMARY_NAV_ITEMS } from "./nav-items";

interface DesktopNavProps {
  className?: string;
}

export function DesktopNav({ className }: DesktopNavProps) {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      className={cn("hidden flex-1 md:flex", className)}
      role="navigation"
      aria-label="Main navigation"
    >
      <Row gap="8" wrap className="w-full items-center justify-center">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const target = item.href ?? item.path;
          const isAnchorLink = target.includes("#");
          const active = isAnchorLink
            ? pathname === "/"
            : target === "/"
            ? pathname === "/"
            : pathname.startsWith(item.path);

          return (
            <SmartLink
              key={item.id}
              href={target}
              aria-label={item.ariaLabel}
              aria-current={active ? "page" : undefined}
              selected={active}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold uppercase tracking-[0.24em] transition",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary",
              )}
              data-route-category={item.categoryId}
            >
              <Text as="span" variant="label-default-xs">
                {item.label}
              </Text>
            </SmartLink>
          );
        })}
      </Row>
    </nav>
  );
}

export default DesktopNav;
