import type { LucideIcon } from "lucide-react";
import { Activity, Home, PieChart, User } from "lucide-react";

export type MiniAppTabId = "home" | "fund" | "signals" | "account";

export interface MiniAppTab {
  id: MiniAppTabId;
  href: string;
  label: string;
  Icon: LucideIcon;
  analyticsEvent: string;
  description: string;
}

export const MINIAPP_TABS: MiniAppTab[] = [
  {
    id: "home",
    href: "/miniapp/home",
    label: "Home",
    Icon: Home,
    analyticsEvent: "nav_home",
    description: "Live agenda, announcements, and quick actions.",
  },
  {
    id: "fund",
    href: "/miniapp/fund",
    label: "Fund",
    Icon: PieChart,
    analyticsEvent: "nav_fund",
    description: "Pool performance, funding status, and unlocks.",
  },
  {
    id: "signals",
    href: "/miniapp/signals",
    label: "Signals",
    Icon: Activity,
    analyticsEvent: "nav_signals",
    description: "Realtime trade ideas and automation triggers.",
  },
  {
    id: "account",
    href: "/miniapp/account",
    label: "Account",
    Icon: User,
    analyticsEvent: "nav_account",
    description: "Membership, billing, and personal settings.",
  },
];
