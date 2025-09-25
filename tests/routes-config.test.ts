import test from "node:test";
import { equal as assertEqual } from "node:assert/strict";

import { isRouteEnabled } from "../apps/web/resources/routes.ts";

test("enables dynamic blog and work routes", () => {
  assertEqual(isRouteEnabled("/blog/example-post"), true);
  assertEqual(isRouteEnabled("/blog/example-post/insights"), true);
  assertEqual(isRouteEnabled("/work/case-study"), true);
  assertEqual(isRouteEnabled("/work/case-study/results"), true);
});

test("keeps disabled routes inaccessible", () => {
  assertEqual(isRouteEnabled("/gallery"), false);
  assertEqual(isRouteEnabled("/gallery/secret"), false);
});
