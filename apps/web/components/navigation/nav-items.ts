import { Command } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  getNavigationEntries,
  type NavigationEntry,
  ROUTE_CATEGORY_STYLES,
  type RouteCategoryId,
  type RouteHint,
  type RouteId,
} from "@/config/route-registry";

export interface NavItem {
  id: RouteId;
  step: string;
  label: string;
  description: string;
  icon: LucideIcon;
  path: string;
  ariaLabel: string;
  href?: string;
  showOnMobile?: boolean;
  navGroup: "primary" | "secondary" | "support" | "admin";
  order: number;
  categoryId: RouteCategoryId;
  categoryLabel: string;
  tags: string[];
  hint: RouteHint;
}

const NAV_ENTRIES = getNavigationEntries();

const enhanceEntry = (entry: NavigationEntry): NavItem => {
  const categoryMeta = ROUTE_CATEGORY_STYLES[entry.categoryId];

  return {
    id: entry.id,
    step: entry.step,
    label: entry.label,
    description: entry.description,
    icon: entry.icon ?? Command,
    path: entry.path,
    ariaLabel: entry.ariaLabel,
    href: entry.href ?? entry.path,
    showOnMobile: entry.showOnMobile,
    navGroup: entry.navGroup,
    order: entry.order,
    categoryId: entry.categoryId,
    categoryLabel: categoryMeta.label,
    tags: entry.tags,
    hint: entry.hint,
  } satisfies NavItem;
};

export const NAV_ITEMS: NavItem[] = NAV_ENTRIES.map(enhanceEntry);

export const PRIMARY_NAV_ITEMS: NavItem[] = NAV_ITEMS
  .filter((item) => item.navGroup === "primary")
  .sort((a, b) => a.order - b.order);

export default NAV_ITEMS;
