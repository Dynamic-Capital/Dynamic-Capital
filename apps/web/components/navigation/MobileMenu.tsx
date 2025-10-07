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

  const handleClose = () => setOpen(false);

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
        <nav className="flex h-full flex-col overflow-y-auto">
          <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Navigate
              </p>
              <p className="text-sm text-muted-foreground">
                Jump straight to each section of the desk walkthrough or open
                the live environment.
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Button
                      asChild
                      variant="ghost"
                      size="lg"
                      className="w-full justify-start gap-3 px-4 py-3 text-left"
                      onClick={handleClose}
                    >
                      <Link href={item.href ?? item.path} prefetch={false}>
                        <span className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {item.step.split(" ")[1] ?? item.step}
                          </span>
                          <span className="flex flex-col gap-1">
                            <span className="flex items-center gap-2 text-base font-medium">
                              <Icon className="h-4 w-4" />
                              {item.label}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {item.description}
                            </span>
                          </span>
                        </span>
                      </Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="mt-auto grid gap-2 border-t border-border/60 bg-background/80 p-6">
            <Button
              asChild
              size="lg"
              onClick={handleClose}
            >
              <Link href={CTA_LINKS.invest} target="_blank" rel="noreferrer">
                Launch the desk
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              onClick={handleClose}
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
