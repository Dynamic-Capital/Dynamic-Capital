import type { LucideIcon } from "lucide-react";
import {
  Coins,
  Compass,
  Globe2,
  LayoutDashboard,
  LineChart,
  Rocket,
  ServerCog,
  ShieldCheck,
  UsersRound,
  Wallet,
} from "lucide-react";

export const HOME_NAV_SECTION_IDS = {
  overview: "overview",
  token: "dct-token",
  wallet: "dynamic-wallet",
  markets: "live-markets",
  forecasts: "global-forecasts",
  community: "community-trust",
  miniApp: "investor-mini-app",
  api: "api-backend",
  admin: "admin-desk",
  advantages: "advantages",
} as const;

export type HomeNavSectionId = keyof typeof HOME_NAV_SECTION_IDS;

export type HomeNavSectionSlug =
  (typeof HOME_NAV_SECTION_IDS)[HomeNavSectionId];

export interface HomeNavSection {
  id: HomeNavSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

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
    id: "wallet",
    label: "Dynamic Wallet",
    description: "Link TON addresses with Supabase guardrails.",
    icon: Wallet,
    href: `/#${HOME_NAV_SECTION_IDS.wallet}`,
  },
  {
    id: "markets",
    label: "Live Markets",
    description: "Watch Gold, Forex, and Crypto in real time.",
    icon: LineChart,
    href: `/#${HOME_NAV_SECTION_IDS.markets}`,
  },
  {
    id: "forecasts",
    label: "Forecasts",
    description: "Plan ahead with macro and market projections.",
    icon: Globe2,
    href: `/#${HOME_NAV_SECTION_IDS.forecasts}`,
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

export const HOME_NAV_SECTION_SLUG_TO_ID = Object.entries(
  HOME_NAV_SECTION_IDS,
).reduce(
  (accumulator, [id, slug]) => {
    accumulator[slug as HomeNavSectionSlug] = id as HomeNavSectionId;
    return accumulator;
  },
  {} as Record<HomeNavSectionSlug, HomeNavSectionId>,
);

type SectionIdsFromConfig = (typeof HOME_NAV_SECTIONS)[number]["id"];

type MissingSections = Exclude<HomeNavSectionId, SectionIdsFromConfig>;
type UnexpectedSections = Exclude<SectionIdsFromConfig, HomeNavSectionId>;

type AssertAllSectionsCovered = MissingSections extends never ? true
  : ["Missing HOME_NAV_SECTIONS entry for", MissingSections];
type AssertNoUnexpectedSections = UnexpectedSections extends never ? true
  : ["Unexpected HOME_NAV_SECTIONS id", UnexpectedSections];

const _assertAllSectionsCovered: AssertAllSectionsCovered = true;
const _assertNoUnexpectedSections: AssertNoUnexpectedSections = true;
