import {
  Award,
  GraduationCap,
  Home,
  type LucideIcon,
  Shield,
  TrendingUp,
} from "@/lib/lucide";

export interface NavItem {
  id: string;
  step: string;
  label: string;
  description: string;
  icon: LucideIcon;
  path: string;
  ariaLabel: string;
  showOnMobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "home",
    step: "Step 1",
    label: "Start here",
    description: "Tour the platform and set your first goal.",
    icon: Home,
    path: "/",
    ariaLabel: "Step 1: Start here. Tour the platform and set your first goal.",
    showOnMobile: true,
  },
  {
    id: "education",
    step: "Step 2",
    label: "Learn the basics",
    description: "Watch bite-sized lessons built for beginners.",
    icon: GraduationCap,
    path: "/blog",
    ariaLabel:
      "Step 2: Learn the basics. Watch bite-sized lessons built for beginners.",
    showOnMobile: true,
  },
  {
    id: "plans",
    step: "Step 3",
    label: "Choose a plan",
    description: "Compare membership paths when you're ready to join.",
    icon: TrendingUp,
    path: "/plans",
    ariaLabel:
      "Step 3: Choose a plan. Compare membership paths when you're ready to join.",
    showOnMobile: true,
  },
  {
    id: "success",
    step: "Step 4",
    label: "See real results",
    description: "Browse live desk projects and member wins.",
    icon: Award,
    path: "/work",
    ariaLabel:
      "Step 4: See real results. Browse live desk projects and member wins.",
    showOnMobile: true,
  },
  {
    id: "dashboard",
    step: "Step 5",
    label: "Automation hub",
    description: "Connect signals and manage the Telegram bot.",
    icon: Shield,
    path: "/telegram",
    ariaLabel:
      "Step 5: Automation hub. Connect signals and manage the Telegram bot.",
    showOnMobile: true,
  },
];

export default NAV_ITEMS;
