import {
  Compass,
  type LucideIcon,
  MessageCircle,
  Sparkles,
  Timer,
  Users,
} from "lucide-react";

import { LANDING_SECTION_IDS } from "@/components/landing/landing-config";

export interface NavItem {
  id: string;
  step: string;
  label: string;
  description: string;
  icon: LucideIcon;
  path: string;
  ariaLabel: string;
  href?: string;
  showOnMobile?: boolean;
}

const landingNavItems: NavItem[] = [
  {
    id: LANDING_SECTION_IDS.hero,
    step: "Section 01",
    label: "Overview",
    description: "Start with the hero animation.",
    icon: Compass,
    path: "/",
    href: `/#${LANDING_SECTION_IDS.hero}`,
    ariaLabel:
      "Section 01: Overview. Start with the hero animation and framing.",
    showOnMobile: true,
  },
  {
    id: LANDING_SECTION_IDS.highlights,
    step: "Section 02",
    label: "Highlights",
    description: "Skim the live desk capabilities.",
    icon: Sparkles,
    path: "/",
    href: `/#${LANDING_SECTION_IDS.highlights}`,
    ariaLabel:
      "Section 02: Highlights. Skim the live desk capabilities and feature callouts.",
    showOnMobile: true,
  },
  {
    id: LANDING_SECTION_IDS.rhythm,
    step: "Section 03",
    label: "Rhythm",
    description: "Follow the desk cadence.",
    icon: Timer,
    path: "/",
    href: `/#${LANDING_SECTION_IDS.rhythm}`,
    ariaLabel:
      "Section 03: Rhythm. Follow how the desk flows throughout the day.",
    showOnMobile: true,
  },
  {
    id: LANDING_SECTION_IDS.stakeholders,
    step: "Section 04",
    label: "Stakeholders",
    description: "See who benefits together.",
    icon: Users,
    path: "/",
    href: `/#${LANDING_SECTION_IDS.stakeholders}`,
    ariaLabel:
      "Section 04: Stakeholders. See how investors and analysts stay aligned.",
    showOnMobile: true,
  },
  {
    id: LANDING_SECTION_IDS.join,
    step: "Section 05",
    label: "Join the desk",
    description: "Meet the CTA and community links.",
    icon: MessageCircle,
    path: "/",
    href: `/#${LANDING_SECTION_IDS.join}`,
    ariaLabel:
      "Section 05: Join the desk. Jump to the calls to action and community links.",
    showOnMobile: true,
  },
];

export const NAV_ITEMS: NavItem[] = landingNavItems;

export default NAV_ITEMS;
