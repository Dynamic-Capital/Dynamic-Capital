import type { LucideIcon } from "lucide-react";
import {
  Coins,
  Compass,
  LayoutDashboard,
  LineChart,
  Rocket,
  ServerCog,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

export interface HomeNavSection {
  id: HomeNavSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

export const HOME_NAV_SECTION_IDS = {
  overview: "overview",
  token: "dct-token",
  markets: "live-markets",
  community: "community-trust",
  miniApp: "investor-mini-app",
  api: "api-backend",
  admin: "admin-desk",
  advantages: "advantages",
} as const;

export type HomeNavSectionId = keyof typeof HOME_NAV_SECTION_IDS;

export const HOME_NAV_SECTIONS: HomeNavSection[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Tour Dynamic Capital’s AI-powered ecosystem.",
    icon: Compass,
    href: `/#${HOME_NAV_SECTION_IDS.overview}`,
  },
  {
    id: "token",
    label: "DCT Token",
    description: "Understand burns, rewards, and transparency.",
    icon: Coins,
    href: `/#${HOME_NAV_SECTION_IDS.token}`,
  },
  {
    id: "markets",
    label: "Live Markets",
    description: "Watch Gold, Forex, and Crypto in real time.",
    icon: LineChart,
    href: `/#${HOME_NAV_SECTION_IDS.markets}`,
  },
  {
    id: "community",
    label: "Community",
    description: "Build trust in Dhivehi and English.",
    icon: UsersRound,
    href: `/#${HOME_NAV_SECTION_IDS.community}`,
  },
  {
    id: "miniApp",
    label: "Mini App",
    description: "Preview the Telegram investor dashboard.",
    icon: LayoutDashboard,
    href: `/#${HOME_NAV_SECTION_IDS.miniApp}`,
  },
  {
    id: "api",
    label: "APIs",
    description: "Connect trading, treasury, and Telegram services.",
    icon: ServerCog,
    href: `/#${HOME_NAV_SECTION_IDS.api}`,
  },
  {
    id: "admin",
    label: "Admin Desk",
    description: "Manage strategies, signals, and payments.",
    icon: ShieldCheck,
    href: `/#${HOME_NAV_SECTION_IDS.admin}`,
  },
  {
    id: "advantages",
    label: "Advantages",
    description: "See why one universal site scales with you.",
    icon: Rocket,
    href: `/#${HOME_NAV_SECTION_IDS.advantages}`,
  },
];

export const HOME_NAV_SECTION_MAP = HOME_NAV_SECTIONS.reduce(
  (accumulator, section) => {
    accumulator[section.id] = section;
    return accumulator;
  },
  {} as Record<HomeNavSectionId, HomeNavSection>,
);
