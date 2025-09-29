import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChartBig,
  CandlestickChart,
  Home,
  LineChart,
  MessageSquare,
  PieChart,
  User,
} from "lucide-react";

export type MiniAppTabId =
  | "home"
  | "overview"
  | "watchlist"
  | "signals"
  | "mentorship"
  | "trade"
  | "fund"
  | "account";

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
    id: "overview",
    href: "/miniapp/overview",
    label: "Overview",
    Icon: BarChartBig,
    analyticsEvent: "nav_overview",
    description: "Capital allocation, KPI highlights, and desk priorities.",
  },
  {
    id: "watchlist",
    href: "/miniapp/watchlist",
    label: "Watchlist",
    Icon: LineChart,
    analyticsEvent: "nav_watchlist",
    description: "Curated assets with price levels and catalyst alerts.",
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
    id: "mentorship",
    href: "/miniapp/mentorship",
    label: "Mentorship",
    Icon: MessageSquare,
    analyticsEvent: "nav_mentorship",
    description: "Direct mentor chat, office hours, and learning track.",
  },
  {
    id: "trade",
    href: "/miniapp/trade",
    label: "Trade",
    Icon: CandlestickChart,
    analyticsEvent: "nav_trade",
    description: "Execute setups, sizing models, and risk tooling.",
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
