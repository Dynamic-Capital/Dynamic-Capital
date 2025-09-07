import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Home, 
  TrendingUp, 
  Settings, 
  MessageCircle,
  User
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

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
    label: "VIP",
    icon: TrendingUp,
    path: "/plans",
    ariaLabel: "View VIP plans"
  },
  {
    id: "dashboard",
    label: "Account",
    icon: Settings,
    path: "/dashboard",
    ariaLabel: "View account dashboard"
  },
  {
    id: "contact",
    label: "Support",
    icon: MessageCircle,
    path: "/contact",
    ariaLabel: "Contact support"
  }
];

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "bg-gradient-navigation backdrop-blur-xl border-t border-border/50",
        "shadow-2xl shadow-primary/10"
      )}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="container mx-auto px-2">
        <div className="grid grid-cols-5 gap-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.id}
                to={item.path}
                className={cn(
                  "relative flex flex-col items-center justify-center p-3 min-h-[64px]",
                  "transition-all duration-300 group rounded-2xl mx-1",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "active:scale-95 overflow-hidden",
                  isActive 
                    ? "text-white bg-gradient-brand shadow-lg shadow-primary/30" 
                    : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                )}
                aria-label={item.ariaLabel}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                )}
                <Icon 
                  className={cn(
                    "h-5 w-5 transition-all duration-300 relative z-10",
                    isActive && "scale-110 drop-shadow-sm",
                    "group-hover:scale-110"
                  )} 
                />
                <span className={cn(
                  "text-xs font-medium mt-1 transition-all duration-300 relative z-10",
                  isActive ? "text-white font-semibold" : "text-muted-foreground group-hover:text-primary"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          
          {/* Theme Toggle */}
          <div className="flex flex-col items-center justify-center p-3 min-h-[64px] mx-1">
            <ThemeToggle 
              size="sm" 
              variant="ghost" 
              className={cn(
                "h-5 w-5 p-0 transition-all duration-300",
                "hover:scale-110 hover:text-primary"
              )} 
            />
            <span className="text-xs font-medium mt-1 text-muted-foreground">
              Theme
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default MobileBottomNav;