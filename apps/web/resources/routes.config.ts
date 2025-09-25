import type { RoutesConfig } from "./types/config.types.ts";

export const routes: RoutesConfig = {
  "/": true,
  "/about": true,
  "/plans": true,
  "/checkout": true,
  "/login": true,
  "/admin": true,
  "/signal": true,
  "/work": { enabled: true, includeChildren: true },
  "/blog": { enabled: true, includeChildren: true },
  "/gallery": false,
  "/telegram": true,
};
