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
  MessageCircle,
  TrendingUp,
  Zap
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
    label: "VIP Plans",
    icon: TrendingUp,
    path: "/plans",
    ariaLabel: "View VIP subscription plans"
  },
  {
    id: "education",
    label: "Academy",
    icon: GraduationCap,
    path: "/education",
    ariaLabel: "Access trading academy"
  },
  {
    id: "contact",
    label: "Support",
    icon: MessageCircle,
    path: "/contact",
    ariaLabel: "Contact support team"
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Settings,
    path: "/dashboard",
    ariaLabel: "View member dashboard"
  }
];

export const DesktopNav: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Main navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <Button
            key={item.id}
            asChild
            variant={active ? "default" : "ghost"}
            size="sm"
            className={cn(
              "relative transition-all duration-300 hover:scale-105 group",
              "focus:ring-2 focus:ring-primary focus:ring-offset-2",
              active && "bg-gradient-brand text-white shadow-lg",
              !active && "hover:bg-primary/10 hover:text-primary"
            )}
          >
            <Link 
              to={item.path} 
              className="flex items-center gap-2 relative overflow-hidden"
              aria-label={item.ariaLabel}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn(
                "h-4 w-4 transition-transform duration-300",
                active && "scale-110",
                "group-hover:scale-110"
              )} />
              <span className="font-medium">{item.label}</span>
              {active && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
              )}
            </Link>
          </Button>
        );
      })}
      
      {/* Auth Button */}
      <Button
        asChild
        variant="outline"
        size="sm"
        className={cn(
          "ml-4 transition-all duration-300 hover:scale-105 group",
          "border-primary/20 hover:border-primary hover:bg-primary/5",
          "hover:text-primary hover:shadow-md"
        )}
      >
        <Link 
          to="/auth" 
          className="flex items-center gap-2"
          aria-label="Sign in to your account"
        >
          <LogIn className="h-4 w-4 group-hover:scale-110 transition-transform" />
          <span className="font-medium">Sign In</span>
        </Link>
      </Button>
    </nav>
  );
};

export default DesktopNav;