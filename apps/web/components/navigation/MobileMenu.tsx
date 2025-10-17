"use client";

import React, { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import {
  Button as DynamicButton,
  IconButton,
  SmartLink,
  Text,
} from "@/components/dynamic-ui-system";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/utils";
import { ChevronRight, Menu, X } from "lucide-react";

import FilterComponent from "./framer/FilterComponent";
import {
  HEADER_NAV_ROUTE_IDS,
  NAV_ITEMS,
  type ResolvedHeaderNavLink,
  type ResolvedHeaderNavMenu,
  resolveHeaderNavigation,
} from "./nav-items";
import { HeaderSearchButton } from "./HeaderSearchButton";
import { getAccountLabel } from "./account-label";

interface MobileMenuProps {
  user: import("@supabase/supabase-js").User | null;
  onConnectWallet: () => void;
  onSignOut: () => void;
  className?: string;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  user,
  onConnectWallet,
  onSignOut,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "/";
  const navigation = resolveHeaderNavigation(pathname);
  const navItems = useMemo(
    () => NAV_ITEMS.filter((item) => HEADER_NAV_ROUTE_IDS.has(item.id)),
    [],
  );

  const closeMenu = () => {
    setOpen(false);
  };

  const handleConnect = () => {
    onConnectWallet();
    closeMenu();
  };

  const handleSignOut = () => {
    onSignOut();
    closeMenu();
  };

  const accountLabel = getAccountLabel(user);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <IconButton
          variant="secondary"
          size="m"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={cn(
            "min-h-[44px] min-w-[44px] rounded-xl bg-background/80",
            className,
          )}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </IconButton>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-full max-w-sm flex-col border-r border-border/60 bg-background/95 p-0"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>
            <Text as="span" variant="label-strong-s">
              Navigation
            </Text>
          </SheetTitle>
        </SheetHeader>
        <div className="border-b border-border/60 px-6 pb-6 pt-7">
          <div className="flex flex-col gap-3">
            <Text
              as="span"
              variant="label-default-xs"
              className="uppercase tracking-[0.18em] text-muted-foreground"
            >
              Quick actions
            </Text>
            <HeaderSearchButton
              size="m"
              variant="secondary"
              fullWidth
              onOpen={closeMenu}
            />
            <DynamicButton
              size="m"
              variant="primary"
              className="min-h-[44px] justify-between px-4 text-base font-semibold normal-case tracking-[0.01em]"
              onClick={handleConnect}
              suffixIcon="arrowUpRight"
            >
              Connect wallet
            </DynamicButton>
            {user
              ? (
                <>
                  <DynamicButton
                    size="m"
                    variant="secondary"
                    href="/profile"
                    className="min-h-[44px] justify-between px-4 text-base font-semibold normal-case tracking-[0.01em]"
                    onClick={closeMenu}
                  >
                    {accountLabel ?? "Profile"}
                  </DynamicButton>
                  <DynamicButton
                    size="m"
                    variant="tertiary"
                    href="/support"
                    className="min-h-[44px] justify-between px-4 text-base font-semibold normal-case tracking-[0.01em]"
                    onClick={closeMenu}
                  >
                    Support
                  </DynamicButton>
                  <DynamicButton
                    size="m"
                    variant="tertiary"
                    className="min-h-[44px] justify-between px-4 text-base font-semibold normal-case tracking-[0.01em] text-danger-strong"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </DynamicButton>
                </>
              )
              : (
                <>
                  <DynamicButton
                    size="m"
                    variant="secondary"
                    href="/login"
                    className="min-h-[44px] justify-between px-4 text-base font-semibold normal-case tracking-[0.01em]"
                    onClick={closeMenu}
                  >
                    Sign in
                  </DynamicButton>
                  <DynamicButton
                    size="m"
                    variant="tertiary"
                    href="/support"
                    className="min-h-[44px] justify-between px-4 text-base font-semibold normal-case tracking-[0.01em]"
                    onClick={closeMenu}
                  >
                    Support
                  </DynamicButton>
                </>
              )}
          </div>
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="px-6 pb-4">
            <Text
              as="span"
              variant="label-default-xs"
              className="uppercase tracking-[0.18em] text-muted-foreground"
            >
              Primary navigation
            </Text>
            <div className="mt-3 flex flex-col gap-2">
              {navigation.map((item) => {
                if (item.type === "link") {
                  return (
                    <SmartLink
                      key={item.id}
                      href={item.href}
                      aria-label={item.ariaLabel}
                      aria-current={item.active ? "page" : undefined}
                      className={cn(
                        "flex min-h-[44px] items-center justify-between rounded-xl border border-border/60 px-4 text-base font-semibold",
                        item.active
                          ? "bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:border-primary/50 hover:text-foreground",
                      )}
                      onClick={closeMenu}
                    >
                      <span>{item.label}</span>
                      <ChevronRight className="h-4 w-4" />
                    </SmartLink>
                  );
                }

                const menu = item as ResolvedHeaderNavMenu;

                return (
                  <div key={menu.id} className="flex flex-col gap-2">
                    <Text
                      as="span"
                      variant="body-default-xs"
                      className="px-1 text-muted-foreground"
                    >
                      {menu.label}
                    </Text>
                    {menu.items.map((child: ResolvedHeaderNavLink) => (
                      <SmartLink
                        key={child.id}
                        href={child.href}
                        aria-label={child.ariaLabel}
                        aria-current={child.active ? "page" : undefined}
                        className={cn(
                          "flex min-h-[44px] items-center justify-between rounded-xl border border-border/60 px-4 text-base",
                          child.active
                            ? "bg-primary/10 text-foreground"
                            : "text-muted-foreground hover:border-primary/50 hover:text-foreground",
                        )}
                        onClick={closeMenu}
                      >
                        <span className="font-semibold">{child.label}</span>
                        <ChevronRight className="h-4 w-4" />
                      </SmartLink>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex flex-1 flex-col overflow-hidden border-t border-border/60">
            <FilterComponent
              items={navItems}
              onItemSelect={() => {
                closeMenu();
              }}
              title="Navigate the desk"
              description="Filter by product, workflow, or intelligence surface to jump straight into the right experience."
              className="flex-1"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
