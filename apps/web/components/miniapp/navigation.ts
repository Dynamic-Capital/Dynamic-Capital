import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CandlestickChart,
  GraduationCap,
  Home,
  LineChart,
  Radar,
  Sparkles,
  Wallet,
} from "lucide-react";

export type MiniAppTabId =
  | "dynamic-hq"
  | "dynamic-market"
  | "dynamic-watchlist"
  | "dynamic-pool-trading"
  | "dynamic-signals"
  | "dynamic-learn"
  | "dynamic-access";

export type MiniAppTabTone = "accent" | "neutral" | "warning";

export interface MiniAppTabBadge {
  label: string;
  tone?: MiniAppTabTone;
}

export interface MiniAppTabMeta {
  label: string;
  icon?: LucideIcon;
  tone?: MiniAppTabTone;
}

export interface MiniAppTab {
  id: MiniAppTabId;
  href: string;
  label: string;
  eyebrow: string;
  description: string;
  Icon: LucideIcon;
  analyticsEvent: string;
  badge?: MiniAppTabBadge;
  meta?: MiniAppTabMeta;
  showInBottomNav?: boolean;
}

export const MINIAPP_TABS: MiniAppTab[] = [
  {
    id: "dynamic-hq",
    href: "/miniapp/dynamic-hq",
    label: "Dynamic HQ",
    eyebrow: "Command",
    description: "Agenda, automation status, and plan sprints.",
    Icon: Home,
    analyticsEvent: "nav_dynamic_hq",
    badge: { label: "New", tone: "accent" },
  },
  {
    id: "dynamic-market",
    href: "/miniapp/dynamic-market",
    label: "Dynamic Market",
    eyebrow: "Market",
    description: "Portfolio pulse, KPIs, and equity curve.",
    Icon: LineChart,
    analyticsEvent: "nav_dynamic_market",
    meta: { label: "Live", icon: Sparkles, tone: "accent" },
  },
  {
    id: "dynamic-watchlist",
    href: "/miniapp/dynamic-watchlist",
    label: "Dynamic Watchlist",
    eyebrow: "Signals",
    description: "Core assets with catalysts and automation hooks.",
    Icon: Radar,
    analyticsEvent: "nav_dynamic_watchlist",
  },
  {
    id: "dynamic-pool-trading",
    href: "/miniapp/dynamic-pool-trading",
    label: "Dynamic Pool Trading",
    eyebrow: "Pool",
    description: "Fund transparency, supply allocation, and epochs.",
    Icon: CandlestickChart,
    analyticsEvent: "nav_dynamic_pool_trading",
  },
  {
    id: "dynamic-signals",
    href: "/miniapp/dynamic-signals",
    label: "Dynamic Signals",
    eyebrow: "Feed",
    description: "Realtime desk triggers and automation alerts.",
    Icon: Activity,
    analyticsEvent: "nav_dynamic_signals",
    meta: { label: "Streaming", icon: Sparkles, tone: "accent" },
  },
  {
    id: "dynamic-learn",
    href: "/miniapp/dynamic-learn",
    label: "Dynamic Learn & Earn",
    eyebrow: "Mentor",
    description: "Mentor chat, office hours, and skill tracks.",
    Icon: GraduationCap,
    analyticsEvent: "nav_dynamic_learn",
    showInBottomNav: true,
  },
  {
    id: "dynamic-access",
    href: "/miniapp/dynamic-access",
    label: "Dynamic Access",
    eyebrow: "Access",
    description: "Membership, billing, and concierge support.",
    Icon: Wallet,
    analyticsEvent: "nav_dynamic_access",
    showInBottomNav: false,
  },
];
