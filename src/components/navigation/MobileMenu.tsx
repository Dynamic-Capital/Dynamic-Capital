import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  Menu,
  Home,
  CreditCard,
  Settings,
  GraduationCap,
  LogIn,
  X,
  Crown,
  Shield
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  ariaLabel: string;
}

const navItems: NavItem[] = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    path: "/",
    ariaLabel: "Navigate to home page",
  },
  {
    id: "plans",
    label: "Plans",
    icon: CreditCard,
    path: "/plans",
    ariaLabel: "View subscription plans",
  },
  {
    id: "education",
    label: "Education",
    icon: GraduationCap,
    path: "/education",
    ariaLabel: "Access educational content",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Settings,
    path: "/dashboard",
    ariaLabel: "View dashboard",
  },
  {
    id: "vip-dashboard",
    label: "VIP Dashboard",
    icon: Crown,
    path: "/vip-dashboard",
    ariaLabel: "View VIP member dashboard",
  },
  {
    id: "admin",
    label: "Admin",
    icon: Shield,
    path: "/admin",
    ariaLabel: "View admin dashboard",
  },
];

export const MobileMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <div className="md:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-80 bg-background/95 backdrop-blur-sm"
          aria-describedby="mobile-nav-description"
        >
          <SheetHeader>
            <SheetTitle className="text-left text-lg font-semibold">
              Navigation
            </SheetTitle>
          </SheetHeader>
          <div id="mobile-nav-description" className="sr-only">
            Mobile navigation menu with links to main sections
          </div>

          <nav className="flex flex-col gap-4 mt-8" role="navigation" aria-label="Mobile menu navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={handleLinkClick}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-all duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    "hover:bg-accent active:scale-95",
                    isActive(item.path)
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-foreground hover:text-primary"
                  )}
                  aria-label={item.ariaLabel}
                  aria-current={isActive(item.path) ? "page" : undefined}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}

            <div className="border-t border-border pt-4 mt-4">
              <Link
                to="/auth"
                onClick={handleLinkClick}
                className="flex items-center gap-3 p-3 rounded-lg transition-all duration-200 text-foreground hover:text-primary hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="Sign in to your account"
              >
                <LogIn className="h-5 w-5" />
                <span className="font-medium">Sign In</span>
              </Link>
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileMenu;
