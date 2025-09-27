import {
  Gauge,
  LayoutDashboard,
  LineChart,
  type LucideIcon,
  PieChart,
} from "lucide-react";

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
  "token",
  "wallet",
  "markets",
  "community",
  "miniApp",
  "api",
  "admin",
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

const firstExtraStep = deskNavItems.length + 1;

const extraNavItems: NavItem[] = [
  {
    id: "studio",
    step: `Step ${firstExtraStep}`,
    label: "LLM studio",
    description: "Run side-by-side provider benchmarks.",
    icon: LayoutDashboard,
    path: "/tools/multi-llm",
    ariaLabel:
      `Step ${firstExtraStep}: LLM studio. Run side-by-side provider benchmarks.`,
    showOnMobile: true,
  },
  {
    id: "dynamic-portfolio",
    step: `Step ${firstExtraStep + 1}`,
    label: "Dynamic portfolio",
    description:
      "Explore the Dynamic Capital desk experience from hero to checkout.",
    icon: PieChart,
    path: "/tools/dynamic-portfolio",
    ariaLabel: `Step ${
      firstExtraStep + 1
    }: Dynamic portfolio. Explore the Dynamic Capital desk experience from hero to checkout.`,
    showOnMobile: true,
  },
  {
    id: "ui-optimizer",
    step: `Step ${firstExtraStep + 2}`,
    label: "Dynamic UI optimizer",
    description: "Optimize readiness workflows and activation channels.",
    icon: Gauge,
    path: "/tools/dynamic-ui-optimizer",
    ariaLabel: `Step ${
      firstExtraStep + 2
    }: Dynamic UI optimizer. Optimize readiness workflows and activation channels.`,
    showOnMobile: true,
  },
  {
    id: "market-review",
    step: `Step ${firstExtraStep + 3}`,
    label: "Market review",
    description: "Track FX strength, volatility, and cross-asset watchlists.",
    icon: LineChart,
    path: "/tools/dynamic-market-review",
    ariaLabel: `Step ${
      firstExtraStep + 3
    }: Market review. Track FX strength, volatility, and cross-asset watchlists.`,
    showOnMobile: true,
  },
  {
    id: "dynamic-dashboard",
    step: `Step ${firstExtraStep + 4}`,
    label: "Dynamic dashboard",
    description:
      "Monitor equity, activation velocity, and risk telemetry in one view.",
    icon: Gauge,
    path: "/tools/dynamic-dashboard",
    ariaLabel: `Step ${
      firstExtraStep + 4
    }: Dynamic dashboard. Monitor equity, activation velocity, and risk telemetry in one view.`,
    showOnMobile: true,
  },
];

const onboardingNavItem = createNavItemFromSection(
  "advantages",
  deskNavItems.length + extraNavItems.length + 1,
);

export const NAV_ITEMS: NavItem[] = [
  ...deskNavItems,
  ...extraNavItems,
  ...(onboardingNavItem ? [onboardingNavItem] : []),
];

export default NAV_ITEMS;
