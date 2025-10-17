import { Command, NotebookPen } from "lucide-react";
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

type HeaderNavMatch = (pathname: string) => boolean;

export interface HeaderNavLink {
  type: "link";
  id: string;
  label: string;
  href: string;
  ariaLabel: string;
  description?: string;
  icon?: LucideIcon;
  keywords?: string[];
  categoryId?: RouteCategoryId;
  match: HeaderNavMatch;
}

export interface HeaderNavMenu {
  type: "menu";
  id: string;
  label: string;
  ariaLabel: string;
  items: HeaderNavLink[];
}

export type HeaderNavItem = HeaderNavLink | HeaderNavMenu;

const HEADER_AI_FEATURE_IDS: RouteId[] = [
  "dynamic-chat-hub",
  "dynamic-market-review",
  "dynamic-trade-and-learn",
];

const HEADER_CORE_LINK_IDS: RouteId[] = [
  "dynamic-portfolio",
  "vip-plans",
  "dynamic-token",
];

const NAV_ITEM_INDEX = new Map<RouteId, NavItem>(
  NAV_ITEMS.map((item) => [item.id, item]),
);

const createMatch = (item: NavItem): HeaderNavMatch => {
  const { path } = item;

  if (path === "/") {
    return (pathname) => pathname === "/";
  }

  return (pathname) => pathname.startsWith(path);
};

const createHeaderLink = (item: NavItem): HeaderNavLink => ({
  type: "link",
  id: item.id,
  label: item.label,
  href: item.href ?? item.path,
  ariaLabel: item.ariaLabel,
  description: item.description,
  icon: item.icon,
  keywords: item.tags,
  categoryId: item.categoryId,
  match: createMatch(item),
});

const resolveNavItemsById = (ids: RouteId[]): HeaderNavLink[] =>
  ids
    .map((id) => NAV_ITEM_INDEX.get(id))
    .filter((item): item is NavItem => Boolean(item))
    .map(createHeaderLink);

const RESOURCES_LINK: HeaderNavLink = {
  type: "link",
  id: "resources",
  label: "Resources",
  href: "/blog",
  ariaLabel:
    "Resources hub. Read guides, updates, and retrospectives from the Dynamic Capital desk.",
  description: "Guides, updates, and retrospectives from the desk.",
  icon: NotebookPen,
  keywords: ["blog", "guides", "updates", "resources"],
  categoryId: "community",
  match: (pathname) => pathname.startsWith("/blog"),
};

const SUPPORT_LINK = NAV_ITEM_INDEX.get("support");

export const HEADER_NAV_ITEMS: HeaderNavItem[] = [
  {
    type: "menu",
    id: "ai-copilots",
    label: "AI copilots",
    ariaLabel: "Open AI copilots navigation menu",
    items: resolveNavItemsById(HEADER_AI_FEATURE_IDS),
  },
  ...resolveNavItemsById(HEADER_CORE_LINK_IDS),
  RESOURCES_LINK,
  ...(SUPPORT_LINK ? [createHeaderLink(SUPPORT_LINK)] : []),
];

export type ResolvedHeaderNavLink = HeaderNavLink & { active: boolean };

export type ResolvedHeaderNavMenu = HeaderNavMenu & {
  active: boolean;
  items: ResolvedHeaderNavLink[];
};

export type HeaderNavState = ResolvedHeaderNavLink | ResolvedHeaderNavMenu;

export const resolveHeaderNavigation = (pathname: string): HeaderNavState[] =>
  HEADER_NAV_ITEMS.map((item) => {
    if (item.type === "link") {
      const resolvedLink: ResolvedHeaderNavLink = {
        ...item,
        active: item.match(pathname),
      };

      return resolvedLink;
    }

    const resolvedItems: ResolvedHeaderNavLink[] = item.items.map((child) => ({
      ...child,
      active: child.match(pathname),
    }));

    const resolvedMenu: ResolvedHeaderNavMenu = {
      ...item,
      active: resolvedItems.some((child) => child.active),
      items: resolvedItems,
    };

    return resolvedMenu;
  });

export const HEADER_NAV_ROUTE_IDS = new Set<RouteId>(
  HEADER_NAV_ITEMS.flatMap((item) => {
    if (item.type === "link") {
      return NAV_ITEM_INDEX.has(item.id as RouteId) ? [item.id as RouteId] : [];
    }

    return item.items
      .map((child) => child.id as RouteId)
      .filter((id) => NAV_ITEM_INDEX.has(id));
  }),
);

export const HEADER_SEARCH_ENTRIES = [
  ...NAV_ITEMS.map((item) => ({
    id: item.id,
    name: item.label,
    section: item.categoryLabel,
    shortcut: [] as string[],
    keywords: item.tags.join(" "),
    href: item.href ?? item.path,
    description: item.description,
  })),
  {
    id: "resources",
    name: "Resources hub",
    section: "Community",
    shortcut: [] as string[],
    keywords: "blog guides updates resources",
    href: RESOURCES_LINK.href,
    description: RESOURCES_LINK.description,
  },
];

export default NAV_ITEMS;
