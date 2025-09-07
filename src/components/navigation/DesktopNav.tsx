import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Home, 
  CreditCard, 
  Settings, 
  GraduationCap,
  User,
  LogIn,
  MessageCircle
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
    ariaLabel: "Navigate to home page"
  },
  {
    id: "plans",
    label: "Plans",
    icon: CreditCard,
    path: "/plans",
    ariaLabel: "View subscription plans"
  },
  {
    id: "education",
    label: "Education",
    icon: GraduationCap,
    path: "/education",
    ariaLabel: "Access educational content"
  },
  {
    id: "checkout",
    label: "Checkout",
    icon: CreditCard,
    path: "/checkout",
    ariaLabel: "Complete your purchase"
  },
  {
    id: "contact",
    label: "Contact",
    icon: MessageCircle,
    path: "/contact",
    ariaLabel: "Contact support"
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Settings,
    path: "/dashboard",
    ariaLabel: "View dashboard"
  }
];

export const DesktopNav: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="hidden md:flex items-center gap-2" role="navigation" aria-label="Main navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Button
            key={item.id}
            asChild
            variant={isActive(item.path) ? "default" : "ghost"}
            size="sm"
            className={cn(
              "transition-all duration-200 hover:scale-105",
              "focus:ring-2 focus:ring-primary focus:ring-offset-2"
            )}
          >
            <Link 
              to={item.path} 
              className="flex items-center gap-2"
              aria-label={item.ariaLabel}
              aria-current={isActive(item.path) ? "page" : undefined}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          </Button>
        );
      })}
      
      {/* Auth Button */}
      <Button
        asChild
        variant="outline"
        size="sm"
        className="ml-4 hover:scale-105 transition-transform duration-200"
      >
        <Link 
          to="/auth" 
          className="flex items-center gap-2"
          aria-label="Sign in to your account"
        >
          <LogIn className="h-4 w-4" />
          Sign In
        </Link>
      </Button>
    </nav>
  );
};

export default DesktopNav;