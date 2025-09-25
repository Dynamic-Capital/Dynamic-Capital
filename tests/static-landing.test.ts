import { assert, assertEquals } from "jsr:@std/assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  clearStaticLandingCache,
  getStaticLandingDocument,
} from "../apps/web/lib/staticLanding.ts";

Deno.test("getStaticLandingDocument resolves when started in nested workspace", async () => {
  const originalCwd = Deno.cwd();
  const testDirectory = path.dirname(fileURLToPath(import.meta.url));
  const webDirectory = path.join(testDirectory, "..", "apps", "web");

  try {
    Deno.chdir(webDirectory);
    clearStaticLandingCache();

    const document = await getStaticLandingDocument();
    assert(
      document.body.length > 0,
      "expected static landing body to be non-empty",
    );
    assertEquals(document.lang, "en");
  } finally {
    Deno.chdir(originalCwd);
    clearStaticLandingCache();
  }
});
