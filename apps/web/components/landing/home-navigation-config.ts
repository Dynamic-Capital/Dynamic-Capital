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
  providers: "provider-matrix",
  workflows: "orchestration",
  analytics: "analytics",
  security: "resilience",
  onboarding: "onboarding",
} as const;

export type HomeNavSectionId = keyof typeof HOME_NAV_SECTION_IDS;

export const HOME_NAV_SECTIONS: HomeNavSection[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Tour the multi-LLM orchestration workspace.",
    icon: Compass,
    href: `/#${HOME_NAV_SECTION_IDS.overview}`,
  },
  {
    id: "providers",
    label: "Providers",
    description: "Compare coverage and capabilities per vendor.",
    icon: LineChart,
    href: `/#${HOME_NAV_SECTION_IDS.providers}`,
  },
  {
    id: "workflows",
    label: "Routing",
    description: "Design policies, fallbacks, and ensembles.",
    icon: UsersRound,
    href: `/#${HOME_NAV_SECTION_IDS.workflows}`,
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Track latency, quality, and spend in one view.",
    icon: Diamond,
    href: `/#${HOME_NAV_SECTION_IDS.analytics}`,
  },
  {
    id: "security",
    label: "Guardrails",
    description: "Review compliance, governance, and escalations.",
    icon: ShieldCheck,
    href: `/#${HOME_NAV_SECTION_IDS.security}`,
  },
  {
    id: "onboarding",
    label: "Onboarding",
    description: "Book concierge setup or chat with the desk.",
    icon: Rocket,
    href: `/#${HOME_NAV_SECTION_IDS.onboarding}`,
  },
];

export const HOME_NAV_SECTION_MAP = HOME_NAV_SECTIONS.reduce(
  (accumulator, section) => {
    accumulator[section.id] = section;
    return accumulator;
  },
  {} as Record<HomeNavSectionId, HomeNavSection>,
);
