import type { IconName } from "@/resources/icons";

export type PrimaryNavItem = {
  key: string;
  label: string;
  mobileLabel: string;
  href: string;
  icon: IconName;
  emoji: string;
  route: `/${string}`;
  includeInFooter: boolean;
  match: (pathname: string, hash: string) => boolean;
};

const normalizeHash = (hash: string): string =>
  hash?.trim().toLowerCase() ?? "";

export const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
  {
    key: "home",
    label: "Home",
    mobileLabel: "Home",
    href: "/",
    icon: "home",
    emoji: "🏠",
    route: "/",
    includeInFooter: true,
    match: (pathname, hash) => {
      if (pathname !== "/") {
        return false;
      }

      const normalizedHash = normalizeHash(hash);
      return normalizedHash === "" || normalizedHash === "#top";
    },
  },
  {
    key: "market",
    label: "Market Watch",
    mobileLabel: "Market",
    href: "/#market-watchlist",
    icon: "grid",
    emoji: "📊",
    route: "/",
    includeInFooter: true,
    match: (pathname, hash) =>
      pathname === "/" && normalizeHash(hash) === "#market-watchlist",
  },
  {
    key: "plans",
    label: "Plans",
    mobileLabel: "VIP Plans",
    href: "/plans",
    icon: "crown",
    emoji: "💎",
    route: "/plans",
    includeInFooter: true,
    match: (pathname) => pathname.startsWith("/plans"),
  },
  {
    key: "token",
    label: "Token",
    mobileLabel: "Token",
    href: "/token",
    icon: "infinity",
    emoji: "🪙",
    route: "/token",
    includeInFooter: false,
    match: (pathname) => pathname.startsWith("/token"),
  },
  {
    key: "learn",
    label: "Learn",
    mobileLabel: "Learn",
    href: "/blog",
    icon: "book",
    emoji: "🎓",
    route: "/blog",
    includeInFooter: true,
    match: (pathname) => pathname.startsWith("/blog"),
  },
  {
    key: "support",
    label: "Support",
    mobileLabel: "Support",
    href: "/support",
    icon: "telegram",
    emoji: "💬",
    route: "/support",
    includeInFooter: true,
    match: (pathname) => pathname.startsWith("/support"),
  },
];

export type PrimaryNavItemState = PrimaryNavItem & { selected: boolean };

export const resolvePrimaryNavItems = (
  pathname: string,
  hash: string,
  filter?: (item: PrimaryNavItem) => boolean,
): PrimaryNavItemState[] =>
  PRIMARY_NAV_ITEMS.filter((item) => (filter ? filter(item) : true)).map((
    item,
  ) => ({
    ...item,
    selected: Boolean(item.match(pathname, hash)),
  }));
