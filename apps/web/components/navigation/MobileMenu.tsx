"use client";

import Link from "next/link";
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

import { CTA_LINKS } from "@/components/landing/landing-config";

import NAV_ITEMS from "./nav-items";

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
        <nav className="flex h-full flex-col gap-6 overflow-y-auto p-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
              Navigate
            </p>
            <p className="text-sm text-muted-foreground">
              Jump to each moment of the single-page desk or open the live
              experience.
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <Button
                    asChild
                    variant="ghost"
                    size="lg"
                    className="w-full justify-start gap-3 px-4 py-3 text-left"
                    onClick={() => setOpen(false)}
                  >
                    <Link href={item.href ?? item.path}>
                      <span className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {item.step}
                        </span>
                        <span className="flex items-center gap-2 text-base font-medium">
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
          <div className="mt-auto flex flex-col gap-2 border-t border-border/60 pt-4">
            <Button
              asChild
              variant="brand"
              size="lg"
              onClick={() => setOpen(false)}
            >
              <Link href={CTA_LINKS.invest} target="_blank" rel="noreferrer">
                Launch the desk
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              size="lg"
              onClick={() => setOpen(false)}
            >
              <Link href={CTA_LINKS.telegram} target="_blank" rel="noreferrer">
                Join Telegram
              </Link>
            </Button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
