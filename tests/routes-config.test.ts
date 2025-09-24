import test from "node:test";
import { deepStrictEqual } from "node:assert/strict";

import { getAppRoutes, getPageRoutes } from "../apps/web/utils/routes.ts";
import { routes } from "../apps/web/resources/routes.config.ts";

const toRouteSet = () => {
  const appRoutes = getAppRoutes();
  const pageRoutes = getPageRoutes();
  const entries = [...appRoutes, ...pageRoutes];
  return new Set(entries.map((entry) => entry.route));
};

test("route config paths map to existing Next.js routes", () => {
  const availableRoutes = toRouteSet();
  const configuredRoutes = Object.keys(routes);

  const missing = configuredRoutes.filter((route) =>
    !availableRoutes.has(route)
  );

  deepStrictEqual(
    missing,
    [],
    missing.length === 0
      ? undefined
      : `Configured routes are missing Next.js entries: ${missing.join(", ")}`,
  );
});
