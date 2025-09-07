import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Home, 
  CreditCard, 
  CheckCircle, 
  User, 
  Settings,
  GraduationCap
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
    id: "checkout",
    label: "Checkout",
    icon: CheckCircle,
    path: "/checkout",
    ariaLabel: "Complete your purchase"
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Settings,
    path: "/dashboard",
    ariaLabel: "View dashboard"
  }
];

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.id}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center p-3 min-h-[60px] transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-lg",
                  "hover:bg-accent/50 active:scale-95",
                  isActive && "text-primary bg-primary/10"
                )}
                aria-label={item.ariaLabel}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon 
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isActive && "scale-110"
                  )} 
                />
                <span className={cn(
                  "text-xs font-medium mt-1 transition-all duration-200",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default MobileBottomNav;