"use client";

import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Row, SmartLink, Text } from "@/components/dynamic-ui-system";
import { cn } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  type HeaderNavState,
  type ResolvedHeaderNavLink,
  type ResolvedHeaderNavMenu,
  resolveHeaderNavigation,
} from "./nav-items";

interface DesktopNavProps {
  className?: string;
}

export function DesktopNav({ className }: DesktopNavProps) {
  const pathname = usePathname() ?? "/";
  const navigation = resolveHeaderNavigation(pathname);

  const renderLink = (item: Extract<HeaderNavState, { type: "link" }>) => (
    <SmartLink
      key={item.id}
      href={item.href}
      aria-label={item.ariaLabel}
      aria-current={item.active ? "page" : undefined}
      selected={item.active}
      className={cn(
        "group relative min-h-[44px] rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors duration-200",
        "after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity after:duration-200",
        item.active
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
        {navigation.map((item) => {
          if (item.type === "link") {
            return renderLink(item);
          }

          const menu = item as ResolvedHeaderNavMenu;

          return (
            <DropdownMenu key={menu.id}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "relative flex min-h-[44px] items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors duration-200",
                    "after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity after:duration-200",
                    "data-[state=open]:text-foreground data-[state=open]:after:opacity-100 data-[state=open]:[&>span>svg:last-child]:rotate-180",
                    item.active
                      ? "text-foreground after:opacity-100"
                      : "hover:text-foreground hover:after:opacity-60",
                  )}
                  aria-haspopup="menu"
                  aria-label={menu.ariaLabel}
                >
                  <span className="flex items-center gap-2">
                    <Text
                      as="span"
                      variant="body-default-s"
                      className="font-semibold normal-case tracking-[0.02em]"
                    >
                      {menu.label}
                    </Text>
                    <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-72 space-y-1 rounded-xl border-border/80 bg-background/95 p-2 shadow-xl"
              >
                <DropdownMenuLabel className="px-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {menu.label}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="mx-3" />
                {menu.items.map((child: ResolvedHeaderNavLink) => {
                  const ChildIcon = child.icon;

                  return (
                    <DropdownMenuItem key={child.id} asChild>
                      <SmartLink
                        href={child.href}
                        aria-label={child.ariaLabel}
                        aria-current={child.active ? "page" : undefined}
                        selected={child.active}
                        className={cn(
                          "flex min-h-[48px] items-start gap-3 rounded-lg px-3 py-2",
                          child.active
                            ? "bg-primary/10 text-foreground"
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                        )}
                        data-route-category={child.categoryId}
                      >
                        {ChildIcon
                          ? (
                            <ChildIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          )
                          : (
                            <ChevronRight className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          )}
                        <span className="flex flex-col">
                          <Text
                            as="span"
                            variant="body-default-s"
                            className="font-semibold normal-case tracking-[0.01em]"
                          >
                            {child.label}
                          </Text>
                          {child.description && (
                            <Text
                              as="span"
                              variant="body-default-xs"
                              className="text-muted-foreground"
                            >
                              {child.description}
                            </Text>
                          )}
                        </span>
                      </SmartLink>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
      </Row>
    </nav>
  );
}

export default DesktopNav;
