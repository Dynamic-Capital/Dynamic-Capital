"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import MainComponent, { type MainNavItem } from "./framer/MainComponent";
import NAV_ITEMS from "./nav-items";

const ICON_NODES: Record<string, Array<[string, Record<string, string>]>> = {
  home: [
    ["path", { d: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" }],
    [
      "path",
      {
        d: "M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
      },
    ],
  ],
  plans: [
    ["polyline", { points: "22 7 13.5 15.5 8.5 10.5 2 17" }],
    ["polyline", { points: "16 7 22 7 22 13" }],
  ],
  education: [
    [
      "path",
      {
        d: "M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z",
      },
    ],
    ["path", { d: "M22 10v6" }],
    ["path", { d: "M6 12.5V16a6 3 0 0 0 12 0v-3.5" }],
  ],
  success: [
    [
      "path",
      {
        d: "M12 3.5 14.09 8.26 19.2 8.96 15.55 12.44 16.58 17.5 12 15 7.42 17.5 8.45 12.44 4.8 8.96 9.91 8.26 12 3.5z",
      },
    ],
  ],
  dashboard: [
    [
      "path",
      {
        d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      },
    ],
  ],
};

const NAV_COLORS = [
  { default: "rgb(116, 179, 82)", active: "rgb(92, 208, 110)" },
  { default: "rgb(0, 134, 255)", active: "rgb(59, 130, 246)" },
  { default: "rgb(255, 206, 0)", active: "rgb(255, 225, 96)" },
  { default: "rgb(253, 93, 98)", active: "rgb(255, 134, 139)" },
];

const iconNodeToSvg = (iconNode: Array<[string, Record<string, string>]>) => {
  const children = iconNode
    .map(([tag, attrs]) => {
      const attributes = Object.entries(attrs)
        .filter(([key]) => key !== "key")
        .map(([key, value]) => `${key}="${value}"`)
        .join(" ");
      return attributes.length > 0 ? `<${tag} ${attributes}/>` : `<${tag}/>`;
    })
    .join("");

  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`;
};

const buildNavItems = (
  pathname: string,
  navigate: (path: string) => void,
): MainNavItem[] => {
  const baseItems = NAV_ITEMS.slice(0, NAV_COLORS.length);
  return baseItems.map((item, index) => {
    const color = NAV_COLORS[index] ?? NAV_COLORS[0];
    const iconNode = ICON_NODES[item.id] ?? ICON_NODES.home;
    const icon = iconNodeToSvg(iconNode);
    const isActive = item.path === "/"
      ? pathname === "/"
      : pathname.startsWith(item.path);

    return {
      id: item.id,
      ariaLabel: item.ariaLabel,
      icon,
      color: isActive ? color.active : color.default,
      isActive,
      onClick: () => navigate(item.path),
    } satisfies MainNavItem;
  });
};

const FramerMainNav = () => {
  const router = useRouter();
  const rawPathname = usePathname();
  const pathname = rawPathname ?? "/";

  const navigate = useCallback(
    (path: string) => {
      if (pathname !== path) {
        router.push(path);
      }
    },
    [pathname, router],
  );

  const items = useMemo(() => buildNavItems(pathname, navigate), [
    pathname,
    navigate,
  ]);

  return <MainComponent items={items} />;
};

export default FramerMainNav;
