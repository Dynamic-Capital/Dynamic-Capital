"use client";

import React, { useMemo, useState } from "react";

import { IconButton, Text } from "@/components/dynamic-ui-system";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";

import FilterComponent from "./framer/FilterComponent";
import { NAV_ITEMS } from "./nav-items";

export const MobileMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navItems = useMemo(
    () => NAV_ITEMS.filter((item) => item.showOnMobile),
    [],
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <IconButton
          variant="secondary"
          size="m"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="rounded-xl bg-background/80"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </IconButton>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-full max-w-sm border-r border-border/60 bg-background/95 p-0"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>
            <Text as="span" variant="label-strong-s">
              Navigation
            </Text>
          </SheetTitle>
        </SheetHeader>
        <FilterComponent
          items={navItems}
          onItemSelect={() => setOpen(false)}
          title="Navigate the desk"
          description="Filter by product, workflow, or intelligence surface to jump straight into the right experience."
          className="h-full"
        />
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
