"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/utils";
import { Menu, X } from "@/lib/lucide";
import NAV_ITEMS from "./nav-items";

export const MobileMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navItems = NAV_ITEMS.filter((item) => item.showOnMobile);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="p-6">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="px-6 py-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === "/"
              ? pathname === "/"
              : pathname.startsWith(item.path);
            return (
              <Link
                key={item.id}
                href={item.path}
                aria-label={item.ariaLabel}
                title={item.description}
                className={cn(
                  "block rounded-lg px-3 py-3 transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-md bg-accent/40">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {item.step}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {item.label}
                    </span>
                    <span className="text-sm leading-snug text-muted-foreground">
                      {item.description}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
