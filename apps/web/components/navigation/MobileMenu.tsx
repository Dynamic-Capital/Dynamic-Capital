"use client";

import React, { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
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
        <Button variant="ghost" size="icon" aria-label="Open menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-full max-w-sm border-r border-border/60 bg-background/95 p-0"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
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
