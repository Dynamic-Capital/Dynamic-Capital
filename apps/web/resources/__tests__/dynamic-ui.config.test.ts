import { describe, expect, it } from "vitest";

import { baseURL, isRouteEnabled, routes } from "@/resources";
import { TON_SITE_GATEWAY_URL } from "@shared/ton/site";

const EXPECTED_ROUTE_PATHS = [
  "/",
  "/about",
  "/admin",
  "/blog",
  "/checkout",
  "/gallery",
  "/investor",
  "/login",
  "/miniapp",
  "/payment-status",
  "/plans",
  "/profile",
  "/school",
  "/styles",
  "/support",
  "/telegram",
  "/token",
  "/tools",
  "/ui/sandbox",
  "/wallet",
  "/work",
] as const satisfies readonly string[];

const CHILD_ROUTE_EXAMPLES = [
  ["/blog", "/blog/example"],
  ["/miniapp", "/miniapp/home"],
  ["/tools", "/tools/dynamic-portfolio"],
  ["/work", "/work/example"],
] as const satisfies ReadonlyArray<readonly [string, string]>;

describe("dynamic UI routes configuration", () => {
  it("matches the expected set of public routes", () => {
    const configuredRoutes = Object.keys(routes).sort();
    const expectedRoutes = [...EXPECTED_ROUTE_PATHS].sort();

    expect(configuredRoutes).toEqual(expectedRoutes);
  });

  it("enables every configured public route", () => {
    for (const path of EXPECTED_ROUTE_PATHS) {
      expect(isRouteEnabled(path)).toBe(true);
    }
  });

  it("enables nested paths for routes that should include children", () => {
    for (const [, childPath] of CHILD_ROUTE_EXAMPLES) {
      expect(isRouteEnabled(childPath)).toBe(true);
    }
  });

  it("does not treat the root route as a catch-all", () => {
    expect(routes["/"]).toBe(true);
    expect(isRouteEnabled("/this-route-does-not-exist"))
      .toBe(false);
  });

  it("uses the TON gateway URL as the primary base URL", () => {
    expect(baseURL).toBe(TON_SITE_GATEWAY_URL);
  });
});
