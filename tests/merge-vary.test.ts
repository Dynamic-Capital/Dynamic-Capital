import test from "node:test";
import { equal as assertEqual } from "node:assert/strict";

import { mergeVary } from "../apps/web/utils/http.ts";

test("mergeVary deduplicates vary entries case-insensitively", () => {
  const merged = mergeVary("Origin, Accept-Encoding", "origin, X-Custom");
  assertEqual(merged, "Origin, Accept-Encoding, X-Custom");
});

test("mergeVary collapses duplicates from existing header values", () => {
  const merged = mergeVary("ORIGIN, accept-encoding, Origin", "ACCEPT-ENCODING, origin");
  assertEqual(merged, "ORIGIN, accept-encoding");
});
