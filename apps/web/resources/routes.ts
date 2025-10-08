import type { NormalizedRouteDefinition, RouteConfigValue } from "./types";
import { routes } from "./dynamic-ui.config";

const normalizeRoutePath = (path: string): `/${string}` => {
  if (!path) {
    return "/";
  }

  const prefixed = path.startsWith("/") ? path : `/${path}`;
  if (prefixed === "/") {
    return "/";
  }

  const trimmed = prefixed.replace(/\/+$/, "");
  return (trimmed || "/") as `/${string}`;
};

const normalizeRouteConfig = (value: RouteConfigValue) => {
  if (typeof value === "boolean") {
    return {
      enabled: value,
      includeChildren: false,
    };
  }

  return {
    enabled: value.enabled,
    includeChildren: Boolean(value.includeChildren && value.enabled),
  };
};

const routeDefinitions: NormalizedRouteDefinition[] = Object.entries(routes)
  .map(
    ([path, value]) => {
      const normalizedPath = normalizeRoutePath(path);
      const { enabled, includeChildren } = normalizeRouteConfig(value);

      return {
        path: normalizedPath,
        enabled,
        includeChildren,
      } satisfies NormalizedRouteDefinition;
    },
  );

const routePrefix = (path: `/${string}`) => {
  if (path === "/") {
    return "/" as const;
  }

  return `${path}/` as const;
};

const matchesRoute = (
  target: `/${string}`,
  route: NormalizedRouteDefinition,
) => {
  if (!route.enabled) {
    return false;
  }

  if (target === route.path) {
    return true;
  }

  if (!route.includeChildren) {
    return false;
  }

  if (route.path === "/") {
    return target.startsWith("/");
  }

  return target.startsWith(routePrefix(route.path));
};

export const getRouteDefinitions =
  (): NormalizedRouteDefinition[] => [...routeDefinitions];

export const isRouteEnabled = (path: string): boolean => {
  const normalized = normalizeRoutePath(path);

  return routeDefinitions.some((definition) =>
    matchesRoute(normalized, definition)
  );
};
