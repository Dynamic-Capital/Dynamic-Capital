import { Home, TrendingUp, Settings, GraduationCap, MessageCircle } from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  ariaLabel: string;
  showOnMobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    path: "/",
    ariaLabel: "Navigate to home page",
    showOnMobile: true,
  },
  {
    id: "plans",
    label: "VIP Plans",
    icon: TrendingUp,
    path: "/plans",
    ariaLabel: "View VIP subscription plans",
    showOnMobile: true,
  },
  {
    id: "education",
    label: "Academy",
    icon: GraduationCap,
    path: "/education",
    ariaLabel: "Access trading academy",
    showOnMobile: true,
  },
  {
    id: "contact",
    label: "Support",
    icon: MessageCircle,
    path: "/contact",
    ariaLabel: "Contact support team",
    showOnMobile: true,
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Settings,
    path: "/dashboard",
    ariaLabel: "View member dashboard",
    showOnMobile: true,
  },
];

export default NAV_ITEMS;
