import { describe, it } from "std/testing/bdd.ts";
import { assertEquals } from "std/assert/mod.ts";

import {
  resolveTonSiteProxyPath,
  resolveTonSiteProxyUrl,
  resolveTonSiteUrl,
  TON_SITE_DOMAIN,
  TON_SITE_GATEWAY_BASE,
  TON_SITE_GATEWAY_ORIGIN,
  TON_SITE_GATEWAY_URL,
  TON_SITE_ICON_URL,
  TON_SITE_PROXY_FUNCTION_NAME,
  TON_SITE_PROXY_PATH_PREFIX,
  TON_SITE_SOCIAL_PREVIEW_URL,
} from "../../../shared/ton/site.ts";

describe("ton site gateway helpers", () => {
  it("exposes canonical constants", () => {
    assertEquals(TON_SITE_GATEWAY_BASE, "https://ton.site");
    assertEquals(TON_SITE_DOMAIN, "dynamiccapital.ton");
    assertEquals(
      TON_SITE_GATEWAY_ORIGIN,
      "https://ton.site/dynamiccapital.ton",
    );
    assertEquals(TON_SITE_GATEWAY_URL, TON_SITE_GATEWAY_ORIGIN);
    assertEquals(
      TON_SITE_ICON_URL,
      "https://ton.site/dynamiccapital.ton/icon.png",
    );
    assertEquals(
      TON_SITE_SOCIAL_PREVIEW_URL,
      "https://ton.site/dynamiccapital.ton/social/social-preview.svg",
    );
    assertEquals(TON_SITE_PROXY_FUNCTION_NAME, "ton-site-proxy");
    assertEquals(TON_SITE_PROXY_PATH_PREFIX, "/ton-site-proxy");
  });

  describe("resolveTonSiteUrl", () => {
    type ResolveArgs = [] | [string];

    const cases: Array<{
      name: string;
      args: ResolveArgs;
      expected: string;
    }> = [
      {
        name: "defaults to the gateway origin when no path is provided",
        args: [],
        expected: TON_SITE_GATEWAY_ORIGIN,
      },
      {
        name: "treats root paths as the gateway origin",
        args: ["/"],
        expected: TON_SITE_GATEWAY_ORIGIN,
      },
      {
        name: "collapses empty input down to the origin",
        args: ["   "],
        expected: TON_SITE_GATEWAY_ORIGIN,
      },
      {
        name: "resolves asset paths relative to the origin",
        args: ["icon.png"],
        expected: TON_SITE_ICON_URL,
      },
      {
        name: "supports simple application routes",
        args: ["/app"],
        expected: "https://ton.site/dynamiccapital.ton/app",
      },
      {
        name: "collapses duplicate slashes while preserving nesting",
        args: ["/nested//path//"],
        expected: "https://ton.site/dynamiccapital.ton/nested/path",
      },
      {
        name: "trims whitespace before normalising a path with query params",
        args: [" nested//path ?q=1 "],
        expected: "https://ton.site/dynamiccapital.ton/nested/path?q=1",
      },
      {
        name: "preserves hash fragments after normalisation",
        args: ["/path//with#hash"],
        expected: "https://ton.site/dynamiccapital.ton/path/with#hash",
      },
      {
        name: "resolves nested social preview asset paths",
        args: ["social/social-preview.svg"],
        expected: TON_SITE_SOCIAL_PREVIEW_URL,
      },
    ];

    for (const testCase of cases) {
      it(testCase.name, () => {
        assertEquals(resolveTonSiteUrl(...testCase.args), testCase.expected);
      });
    }
  });

  describe("resolveTonSiteProxyPath", () => {
    type ResolveArgs = [] | [string];

    const cases: Array<{
      name: string;
      args: ResolveArgs;
      expected: string;
    }> = [
      {
        name: "returns the proxy root when no path is provided",
        args: [],
        expected: `${TON_SITE_PROXY_PATH_PREFIX}/`,
      },
      {
        name: "normalises leading slashes and whitespace",
        args: [" //icon.png"],
        expected: `${TON_SITE_PROXY_PATH_PREFIX}/icon.png`,
      },
      {
        name: "collapses duplicate path separators",
        args: ["/social//preview.svg"],
        expected: `${TON_SITE_PROXY_PATH_PREFIX}/social/preview.svg`,
      },
      {
        name: "preserves query and hash segments",
        args: ["/asset.png?q=1#hash"],
        expected: `${TON_SITE_PROXY_PATH_PREFIX}/asset.png?q=1#hash`,
      },
    ];

    for (const testCase of cases) {
      it(testCase.name, () => {
        assertEquals(
          resolveTonSiteProxyPath(...testCase.args),
          testCase.expected,
        );
      });
    }
  });

  describe("resolveTonSiteProxyUrl", () => {
    it("joins the Supabase functions base with the proxy path", () => {
      assertEquals(
        resolveTonSiteProxyUrl(
          "https://project.functions.supabase.co/",
          "/icon.png",
        ),
        "https://project.functions.supabase.co/ton-site-proxy/icon.png",
      );
    });

    it("trims extraneous slashes from the base URL", () => {
      assertEquals(
        resolveTonSiteProxyUrl("https://project.functions.supabase.co////"),
        "https://project.functions.supabase.co/ton-site-proxy/",
      );
    });
  });
});
