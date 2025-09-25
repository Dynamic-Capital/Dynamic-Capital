"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/utils";
import {
  Menu,
  Home,
  CandlestickChart,
  CreditCard,
  Settings,
  GraduationCap,
  User,
  LogIn,
  X,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  ariaLabel: string;
}

const navItems: NavItem[] = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    path: "/",
    ariaLabel: "Navigate to home page"
  },
  {
    id: "market",
    label: "Market",
    icon: CandlestickChart,
    path: "/market",
    ariaLabel: "View market dashboards"
  },
  {
    id: "plans",
    label: "Plans",
    icon: CreditCard,
    path: "/plans",
    ariaLabel: "View subscription plans"
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    path: "/#settings",
    ariaLabel: "Adjust user settings"
  },
  {
    id: "education",
    label: "Education",
    icon: GraduationCap,
    path: "/education",
    ariaLabel: "Explore educational content"
  }
];

export const MobileMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

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
        <nav className="px-6 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.id}
                href={item.path}
                aria-label={item.ariaLabel}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                  "transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
