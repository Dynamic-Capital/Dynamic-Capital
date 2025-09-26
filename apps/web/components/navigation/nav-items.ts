import { LayoutDashboard, type LucideIcon } from "lucide-react";

import {
  HOME_NAV_SECTION_MAP,
  type HomeNavSectionId,
} from "@/components/landing/home-navigation-config";

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

const DESK_NAV_SECTION_ORDER: HomeNavSectionId[] = [
  "overview",
  "providers",
  "workflows",
  "analytics",
  "security",
];

const createNavItemFromSection = (
  sectionId: HomeNavSectionId,
  stepNumber: number,
): NavItem | null => {
  const section = HOME_NAV_SECTION_MAP[sectionId];

  if (!section) {
    return null;
  }

  return {
    id: section.id,
    step: `Step ${stepNumber}`,
    label: section.label,
    description: section.description,
    icon: section.icon,
    path: "/",
    href: section.href,
    ariaLabel: `Step ${stepNumber}: ${section.label}. ${section.description}`,
    showOnMobile: true,
  } satisfies NavItem;
};

const deskNavItems = DESK_NAV_SECTION_ORDER.map((sectionId, index) =>
  createNavItemFromSection(sectionId, index + 1)
).filter((item): item is NavItem => Boolean(item));

const onboardingNavItem = createNavItemFromSection(
  "onboarding",
  deskNavItems.length + 2,
);

export const NAV_ITEMS: NavItem[] = [
  ...deskNavItems,
  {
    id: "studio",
    step: `Step ${deskNavItems.length + 1}`,
    label: "LLM studio",
    description: "Run side-by-side provider benchmarks.",
    icon: LayoutDashboard,
    path: "/tools/multi-llm",
    ariaLabel: `Step ${deskNavItems.length + 1}: LLM studio. Run side-by-side provider benchmarks.`,
    showOnMobile: true,
  },
  ...(onboardingNavItem ? [onboardingNavItem] : []),
];

export default NAV_ITEMS;
