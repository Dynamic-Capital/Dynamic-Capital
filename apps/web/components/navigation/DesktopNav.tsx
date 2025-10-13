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
      className={cn("hidden flex-1 flex-wrap md:flex", className)}
      role="navigation"
      aria-label="Main navigation"
    >
      <Row
        gap="12"
        wrap
        className="w-full items-center justify-center gap-y-2"
      >
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
                "group relative rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors duration-200",
                "after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity after:duration-200",
                active
                  ? "text-foreground after:opacity-100"
                  : "hover:text-foreground hover:after:opacity-60",
              )}
              data-route-category={item.categoryId}
            >
              <Text
                as="span"
                variant="body-default-s"
                className="font-semibold normal-case tracking-[0.02em]"
              >
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
