import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import { normalizeMiniAppUrl } from "../supabase/functions/setup-lovable-miniapp/url.ts";

Deno.test("normalizeMiniAppUrl enforces https and trailing slash", () => {
  const normalized = normalizeMiniAppUrl("https://example.com/miniapp");
  assertEquals(normalized, "https://example.com/miniapp/");
});

Deno.test("normalizeMiniAppUrl strips hash fragments", () => {
  const normalized = normalizeMiniAppUrl(
    "https://example.com/miniapp/#section",
  );
  assertEquals(normalized, "https://example.com/miniapp/");
});

Deno.test("normalizeMiniAppUrl rejects non-https schemes", () => {
  assertThrows(
    () => normalizeMiniAppUrl("http://example.com/miniapp"),
    Error,
    "MINI_APP_URL must start with https://",
  );
});

Deno.test("normalizeMiniAppUrl rejects invalid URLs", () => {
  assertThrows(
    () => normalizeMiniAppUrl("not a url"),
    Error,
    "Invalid MINI_APP_URL",
  );
});
