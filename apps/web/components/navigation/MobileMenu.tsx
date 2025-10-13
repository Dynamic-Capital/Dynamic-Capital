"use client";

import React, { useMemo, useState } from "react";

import {
  Button as DynamicButton,
  IconButton,
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
import { Menu, X } from "lucide-react";

import FilterComponent from "./framer/FilterComponent";
import { NAV_ITEMS } from "./nav-items";
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
  const navItems = useMemo(
    () => NAV_ITEMS.filter((item) => item.showOnMobile),
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
          className={cn("rounded-xl bg-background/80", className)}
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
          <div className="flex flex-col gap-2">
            <Text
              as="span"
              variant="label-default-xs"
              className="uppercase tracking-[0.18em] text-muted-foreground"
            >
              Quick actions
            </Text>
            <DynamicButton
              size="s"
              variant="primary"
              className="justify-between px-4 py-2 text-sm font-semibold normal-case tracking-[0.02em]"
              onClick={handleConnect}
              suffixIcon="arrowUpRight"
            >
              Connect wallet
            </DynamicButton>
            {user
              ? (
                <>
                  <DynamicButton
                    size="s"
                    variant="secondary"
                    href="/profile"
                    className="justify-between px-4 py-2 text-sm font-semibold normal-case tracking-[0.02em]"
                    onClick={closeMenu}
                  >
                    {accountLabel ?? "Profile"}
                  </DynamicButton>
                  <DynamicButton
                    size="s"
                    variant="tertiary"
                    href="/support"
                    className="justify-between px-4 py-2 text-sm font-semibold normal-case tracking-[0.02em]"
                    onClick={closeMenu}
                  >
                    Support
                  </DynamicButton>
                  <DynamicButton
                    size="s"
                    variant="tertiary"
                    className="justify-between px-4 py-2 text-sm font-semibold normal-case tracking-[0.02em] text-danger-strong"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </DynamicButton>
                </>
              )
              : (
                <>
                  <DynamicButton
                    size="s"
                    variant="secondary"
                    href="/login"
                    className="justify-between px-4 py-2 text-sm font-semibold normal-case tracking-[0.02em]"
                    onClick={closeMenu}
                  >
                    Sign in
                  </DynamicButton>
                  <DynamicButton
                    size="s"
                    variant="tertiary"
                    href="/support"
                    className="justify-between px-4 py-2 text-sm font-semibold normal-case tracking-[0.02em]"
                    onClick={closeMenu}
                  >
                    Support
                  </DynamicButton>
                </>
              )}
          </div>
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
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
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
