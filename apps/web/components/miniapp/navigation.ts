import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

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

export type MiniAppTabIcon =
  | { type: "lucide"; icon: LucideIcon }
  | { type: "image"; src: string; alt: string };

export interface MiniAppTab {
  id: MiniAppTabId;
  href: string;
  label: string;
  eyebrow: string;
  description: string;
  icon: MiniAppTabIcon;
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
    icon: {
      type: "image",
      src: "/miniapp/dc-mark.svg",
      alt: "Dynamic Capital mark",
    },
    analyticsEvent: "nav_dynamic_hq",
    badge: { label: "New", tone: "accent" },
  },
  {
    id: "dynamic-market",
    href: "/miniapp/dynamic-market",
    label: "Dynamic Market",
    eyebrow: "Market",
    description: "Portfolio pulse, KPIs, and equity curve.",
    icon: {
      type: "image",
      src: "/miniapp/dlm-mark.svg",
      alt: "Dynamic Live Market mark",
    },
    analyticsEvent: "nav_dynamic_market",
    meta: { label: "Live", icon: Sparkles, tone: "accent" },
  },
  {
    id: "dynamic-watchlist",
    href: "/miniapp/dynamic-watchlist",
    label: "Dynamic Watchlist",
    eyebrow: "Signals",
    description: "Core assets with catalysts and automation hooks.",
    icon: {
      type: "image",
      src: "/miniapp/di-mark.svg",
      alt: "Dynamic Intelligence mark",
    },
    analyticsEvent: "nav_dynamic_watchlist",
  },
  {
    id: "dynamic-pool-trading",
    href: "/miniapp/dynamic-pool-trading",
    label: "Dynamic Pool Trading",
    eyebrow: "Pool",
    description: "Fund transparency, supply allocation, and epochs.",
    icon: {
      type: "image",
      src: "/miniapp/dfp-mark.svg",
      alt: "Dynamic Fund Pool mark",
    },
    analyticsEvent: "nav_dynamic_pool_trading",
  },
  {
    id: "dynamic-signals",
    href: "/miniapp/dynamic-signals",
    label: "Dynamic Signals",
    eyebrow: "Feed",
    description: "Realtime desk triggers and automation alerts.",
    icon: {
      type: "image",
      src: "/miniapp/dagi-mark.svg",
      alt: "Dynamic AGI mark",
    },
    analyticsEvent: "nav_dynamic_signals",
    meta: { label: "Streaming", icon: Sparkles, tone: "accent" },
  },
  {
    id: "dynamic-learn",
    href: "/miniapp/dynamic-learn",
    label: "Dynamic Learn & Earn",
    eyebrow: "Mentor",
    description: "Mentor chat, office hours, and skill tracks.",
    icon: {
      type: "image",
      src: "/miniapp/dle-mark.svg",
      alt: "Dynamic Learn & Earn mark",
    },
    analyticsEvent: "nav_dynamic_learn",
    showInBottomNav: true,
  },
  {
    id: "dynamic-access",
    href: "/miniapp/dynamic-access",
    label: "Dynamic Access",
    eyebrow: "Access",
    description: "Membership, billing, and concierge support.",
    icon: {
      type: "image",
      src: "/miniapp/dv-mark.svg",
      alt: "Dynamic VIP mark",
    },
    analyticsEvent: "nav_dynamic_access",
    showInBottomNav: false,
  },
];
