import { describe, it } from "std/testing/bdd.ts";
import { assertEquals } from "std/assert/mod.ts";

import {
  isTonSitePath,
  normalizeTonGatewayPath,
  resolveTonSiteGatewayBaseForHost,
  resolveTonSiteGatewayBasesForHost,
  resolveTonSiteGatewayOrigin,
  resolveTonSiteUrl,
  TON_SITE_ALIAS_DOMAINS,
  TON_SITE_DOMAIN,
  TON_SITE_GATEWAY_BASE,
  TON_SITE_GATEWAY_CURL_URL,
  TON_SITE_GATEWAY_FOUNDATION_BASES,
  TON_SITE_GATEWAY_HOSTS,
  TON_SITE_GATEWAY_ORIGIN,
  TON_SITE_GATEWAY_PRIMARY_HOST,
  TON_SITE_GATEWAY_SELF_HOST_BASES,
  TON_SITE_GATEWAY_STANDBY_BASE,
  TON_SITE_GATEWAY_STANDBY_HOST,
  TON_SITE_GATEWAY_URL,
  TON_SITE_ICON_URL,
  TON_SITE_SOCIAL_PREVIEW_URL,
} from "../../../shared/ton/site";

describe("ton site gateway helpers", () => {
  it("exposes canonical constants", () => {
    assertEquals(
      TON_SITE_GATEWAY_BASE,
      "https://ton-gateway.dynamic-capital.ondigitalocean.app",
    );
    assertEquals(TON_SITE_GATEWAY_STANDBY_BASE, "https://ton.site");
    assertEquals(
      [...TON_SITE_GATEWAY_FOUNDATION_BASES],
      [
        "https://ton.site",
        "https://tonsite.io",
        "https://tonsite.link",
      ],
    );
    assertEquals(
      [...TON_SITE_GATEWAY_SELF_HOST_BASES],
      [
        "https://ton-gateway.dynamic-capital.ondigitalocean.app",
        "https://ton-gateway.dynamic-capital.lovable.app",
      ],
    );
    assertEquals(TON_SITE_DOMAIN, "dynamiccapital.ton");
    assertEquals([...TON_SITE_ALIAS_DOMAINS], ["dynamicapital.ton"]);
    assertEquals(
      TON_SITE_GATEWAY_ORIGIN,
      "https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton",
    );
    assertEquals(TON_SITE_GATEWAY_URL, TON_SITE_GATEWAY_ORIGIN);
    assertEquals(TON_SITE_GATEWAY_CURL_URL, TON_SITE_GATEWAY_URL);
    assertEquals(
      TON_SITE_GATEWAY_PRIMARY_HOST,
      "ton-gateway.dynamic-capital.ondigitalocean.app",
    );
    assertEquals(
      TON_SITE_GATEWAY_STANDBY_HOST,
      "ton.site",
    );
    assertEquals(
      [...TON_SITE_GATEWAY_HOSTS],
      [
        "ton.site",
        "tonsite.io",
        "tonsite.link",
        "ton-gateway.dynamic-capital.ondigitalocean.app",
        "ton-gateway.dynamic-capital.lovable.app",
      ],
    );
    assertEquals(
      TON_SITE_ICON_URL,
      "https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton/icon.png",
    );
    assertEquals(
      TON_SITE_SOCIAL_PREVIEW_URL,
      "https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton/social/social-preview.svg",
    );
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
        expected:
          "https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton/app",
      },
      {
        name: "collapses duplicate slashes while preserving nesting",
        args: ["/nested//path//"],
        expected:
          "https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton/nested/path",
      },
      {
        name: "trims whitespace before normalising a path with query params",
        args: [" nested//path ?q=1 "],
        expected:
          "https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton/nested/path?q=1",
      },
      {
        name: "preserves hash fragments after normalisation",
        args: ["/path//with#hash"],
        expected:
          "https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton/path/with#hash",
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

  describe("normalizeTonGatewayPath", () => {
    const cases: Array<{ input: string | undefined; expected: string }> = [
      { input: undefined, expected: "" },
      { input: "/", expected: "" },
      { input: "", expected: "" },
      { input: "   ", expected: "" },
      { input: `/${TON_SITE_DOMAIN}`, expected: "" },
      { input: `/${TON_SITE_DOMAIN}/`, expected: "" },
      { input: `/${TON_SITE_DOMAIN}//`, expected: "" },
      { input: "/dynamicapital.ton", expected: "" },
      { input: "/dynamicapital.ton/", expected: "" },
      {
        input: `/${TON_SITE_DOMAIN}/icon.png`,
        expected: "/icon.png",
      },
      {
        input: `/${TON_SITE_DOMAIN}/./icon.png`,
        expected: "/icon.png",
      },
      {
        input: `${TON_SITE_DOMAIN}/icon.png`,
        expected: "/icon.png",
      },
      {
        input: `/${TON_SITE_DOMAIN}//nested//asset`,
        expected: "/nested/asset",
      },
      {
        input: "/dynamicapital.ton//nested//asset",
        expected: "/nested/asset",
      },
      {
        input: `/${TON_SITE_DOMAIN}/../etc/passwd`,
        expected: "",
      },
      { input: "/favicon.ico", expected: "/favicon.ico" },
      { input: "favicon.ico", expected: "/favicon.ico" },
      { input: "../favicon.ico", expected: "" },
    ];

    for (const { input, expected } of cases) {
      it(`normalises ${JSON.stringify(input)} -> ${JSON.stringify(expected)}`, () => {
        assertEquals(normalizeTonGatewayPath(input), expected);
      });
    }
  });

  describe("isTonSitePath", () => {
    const positiveCases = [
      `/${TON_SITE_DOMAIN}`,
      `/${TON_SITE_DOMAIN}/`,
      `/${TON_SITE_DOMAIN}/icon.png`,
      `/${TON_SITE_DOMAIN}//nested//asset`,
      `${TON_SITE_DOMAIN}`,
      ` ${TON_SITE_DOMAIN}/docs `,
      "/dynamicapital.ton",
      "/dynamicapital.ton/",
      "/dynamicapital.ton/icon.png",
      "dynamicapital.ton",
      " dynamicapital.ton/docs ",
    ];

    for (const input of positiveCases) {
      it(`recognises TON site path ${JSON.stringify(input)}`, () => {
        assertEquals(isTonSitePath(input), true);
      });
    }

    const negativeCases = [
      undefined,
      null,
      "",
      "   ",
      "/",
      "/ton-site",
      "/dynamiccapital.tonic",
      "/dynamiccapital.tonx/path",
      "other/path",
    ];

    for (const input of negativeCases) {
      it(`rejects non-TON site path ${JSON.stringify(input)}`, () => {
        assertEquals(isTonSitePath(input as string | null | undefined), false);
      });
    }
  });

  describe("resolveTonSiteGatewayOrigin", () => {
    it("normalises different gateway bases", () => {
      assertEquals(
        resolveTonSiteGatewayOrigin(TON_SITE_GATEWAY_BASE),
        TON_SITE_GATEWAY_ORIGIN,
      );
      assertEquals(
        resolveTonSiteGatewayOrigin(TON_SITE_GATEWAY_STANDBY_BASE),
        "https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton",
      );
    });

    it("preserves standby base when canonicalisation is disabled", () => {
      assertEquals(
        resolveTonSiteGatewayOrigin(TON_SITE_GATEWAY_STANDBY_BASE, {
          canonicalizeStandby: false,
        }),
        `${TON_SITE_GATEWAY_STANDBY_BASE}/${TON_SITE_DOMAIN}`,
      );
    });
  });

  describe("resolveTonSiteGatewayBaseForHost", () => {
    const cases: Array<{ host: string | null | undefined; expected: string }> =
      [
        { host: undefined, expected: TON_SITE_GATEWAY_BASE },
        { host: null, expected: TON_SITE_GATEWAY_BASE },
        { host: "", expected: TON_SITE_GATEWAY_BASE },
        { host: "   ", expected: TON_SITE_GATEWAY_BASE },
        {
          host: TON_SITE_GATEWAY_PRIMARY_HOST,
          expected: TON_SITE_GATEWAY_BASE,
        },
        {
          host: `${TON_SITE_GATEWAY_PRIMARY_HOST}:443`,
          expected: TON_SITE_GATEWAY_BASE,
        },
        {
          host: TON_SITE_GATEWAY_PRIMARY_HOST.toUpperCase(),
          expected: TON_SITE_GATEWAY_BASE,
        },
        {
          host: TON_SITE_GATEWAY_STANDBY_HOST,
          expected: TON_SITE_GATEWAY_STANDBY_BASE,
        },
        {
          host: ` ${TON_SITE_GATEWAY_STANDBY_HOST}:8443 `,
          expected: TON_SITE_GATEWAY_STANDBY_BASE,
        },
        {
          host: "ton-gateway.dynamic-capital.lovable.app",
          expected: "https://ton-gateway.dynamic-capital.lovable.app",
        },
        { host: "unknown.example.com", expected: TON_SITE_GATEWAY_BASE },
      ];

    for (const { host, expected } of cases) {
      it(`maps ${JSON.stringify(host)} -> ${expected}`, () => {
        assertEquals(resolveTonSiteGatewayBaseForHost(host), expected);
      });
    }
  });

  describe("resolveTonSiteGatewayBasesForHost", () => {
    it("prioritises mapped host bases before defaults", () => {
      assertEquals(
        resolveTonSiteGatewayBasesForHost(
          "ton-gateway.dynamic-capital.lovable.app",
        ),
        [
          "https://ton-gateway.dynamic-capital.lovable.app",
          "https://ton-gateway.dynamic-capital.ondigitalocean.app",
          "https://ton.site",
          "https://tonsite.io",
          "https://tonsite.link",
        ],
      );
    });

    it("falls back to the foundation gateways when the host is unknown", () => {
      assertEquals(
        resolveTonSiteGatewayBasesForHost("unknown.example.com"),
        [
          "https://ton-gateway.dynamic-capital.ondigitalocean.app",
          "https://ton.site",
          "https://tonsite.io",
          "https://tonsite.link",
          "https://ton-gateway.dynamic-capital.lovable.app",
        ],
      );
    });
  });
});
