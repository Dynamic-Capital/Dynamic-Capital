import {
  Home,
  TrendingUp,
  GraduationCap,
  MessageCircle,
  Shield,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
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
    label: "Bot Dashboard",
    icon: Shield,
    path: "/telegram",
    ariaLabel: "View Telegram bot dashboard",
    showOnMobile: true,
  },
];

export default NAV_ITEMS;
