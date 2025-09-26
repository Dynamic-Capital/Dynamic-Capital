import type { LucideIcon } from "lucide-react";
import {
  Compass,
  Diamond,
  LineChart,
  Rocket,
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
  market: "market-intelligence",
  mentorship: "mentorship",
  plans: "vip-plans",
  trust: "trust-safety",
  onboarding: "get-started",
} as const;

export type HomeNavSectionId = keyof typeof HOME_NAV_SECTION_IDS;

export const HOME_NAV_SECTIONS: HomeNavSection[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Tour automation, playbooks, and desk setup.",
    icon: Compass,
    href: `/#${HOME_NAV_SECTION_IDS.overview}`,
  },
  {
    id: "market",
    label: "Market intel",
    description: "Scan watchlists, posture maps, and catalysts.",
    icon: LineChart,
    href: `/#${HOME_NAV_SECTION_IDS.market}`,
  },
  {
    id: "mentorship",
    label: "Mentorship",
    description: "Meet cohort leads and training programmes.",
    icon: UsersRound,
    href: `/#${HOME_NAV_SECTION_IDS.mentorship}`,
  },
  {
    id: "plans",
    label: "Membership",
    description: "Compare VIP plans and funding unlocks.",
    icon: Diamond,
    href: `/#${HOME_NAV_SECTION_IDS.plans}`,
  },
  {
    id: "trust",
    label: "Trust & safety",
    description: "Review compliance, guardrails, and audits.",
    icon: ShieldCheck,
    href: `/#${HOME_NAV_SECTION_IDS.trust}`,
  },
  {
    id: "onboarding",
    label: "Get started",
    description: "Check readiness, checkout, and concierge.",
    icon: Rocket,
    href: `/#${HOME_NAV_SECTION_IDS.onboarding}`,
  },
];
