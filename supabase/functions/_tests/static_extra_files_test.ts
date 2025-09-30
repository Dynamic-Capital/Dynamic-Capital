import { assert, assertEquals } from "std/testing/asserts.ts";
import { serveStatic, StaticOpts } from "../_shared/static.ts";

Deno.test("serve robots.txt and sitemap.xml with correct content-type", async () => {
  const rootDir = new URL("../miniapp/static/", import.meta.url);
  const opts: StaticOpts = {
    rootDir,
    extraFiles: ["/robots.txt", "/sitemap.xml"],
  };

  const robots = await serveStatic(new Request("https://example.com/robots.txt"), opts);
  assertEquals(robots.status, 200);
  assert(robots.headers.get("content-type")?.startsWith("text/plain"));

  const sitemap = await serveStatic(new Request("https://example.com/sitemap.xml"), opts);
  assertEquals(sitemap.status, 200);
  assertEquals(sitemap.headers.get("content-type"), "application/xml");
});
