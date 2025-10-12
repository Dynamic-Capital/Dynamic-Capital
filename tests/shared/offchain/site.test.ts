import { describe, it } from "std/testing/bdd.ts";
import { assertEquals } from "std/assert/mod.ts";

import {
  OFFCHAIN_WEBSITE_BASES,
  OFFCHAIN_WEBSITE_CANONICAL_BASE,
  OFFCHAIN_WEBSITE_CANONICAL_HOST,
  OFFCHAIN_WEBSITE_CANONICAL_URL,
  OFFCHAIN_WEBSITE_FALLBACK_BASES,
  OFFCHAIN_WEBSITE_HOSTS,
  resolveOffchainWebsiteBaseForHost,
  resolveOffchainWebsiteBasesForHost,
  resolveOffchainWebsiteUrl,
  resolveOffchainWebsiteUrlForBase,
} from "../../../shared/offchain/site";

describe("off-chain website helpers", () => {
  it("exposes canonical constants", () => {
    assertEquals(OFFCHAIN_WEBSITE_CANONICAL_BASE, "https://dynamic.capital");
    assertEquals(
      [...OFFCHAIN_WEBSITE_FALLBACK_BASES],
      [
        "https://dynamic-capital.vercel.app",
        "https://dynamic-capital.lovable.app",
        "https://dynamic-capital.ondigitalocean.app",
        "https://dynamic-capital-qazf2.ondigitalocean.app",
      ],
    );
    assertEquals(OFFCHAIN_WEBSITE_CANONICAL_HOST, "dynamic.capital");
    assertEquals(
      [...OFFCHAIN_WEBSITE_BASES],
      [
        "https://dynamic.capital",
        "https://dynamic-capital.vercel.app",
        "https://dynamic-capital.lovable.app",
        "https://dynamic-capital.ondigitalocean.app",
        "https://dynamic-capital-qazf2.ondigitalocean.app",
      ],
    );
    assertEquals(
      [...OFFCHAIN_WEBSITE_HOSTS],
      [
        "dynamic.capital",
        "dynamic-capital.vercel.app",
        "dynamic-capital.lovable.app",
        "dynamic-capital.ondigitalocean.app",
        "dynamic-capital-qazf2.ondigitalocean.app",
      ],
    );
    assertEquals(OFFCHAIN_WEBSITE_CANONICAL_URL, "https://dynamic.capital");
  });

  describe("resolveOffchainWebsiteUrl", () => {
    const cases: Array<{ name: string; path?: string; expected: string }>
      = [
        {
          name: "defaults to the canonical origin",
          expected: "https://dynamic.capital",
        },
        {
          name: "trims whitespace and resolves nested paths",
          path: " nested//app ",
          expected: "https://dynamic.capital/nested/app",
        },
        {
          name: "preserves query strings and hashes",
          path: "/docs?page=1#section",
          expected: "https://dynamic.capital/docs?page=1#section",
        },
      ];

    for (const { name, path, expected } of cases) {
      it(name, () => {
        assertEquals(resolveOffchainWebsiteUrl(path), expected);
      });
    }
  });

  it("resolves URLs relative to a provided base", () => {
    assertEquals(
      resolveOffchainWebsiteUrlForBase("https://dynamic-capital.vercel.app", "docs"),
      "https://dynamic-capital.vercel.app/docs",
    );
  });

  describe("resolveOffchainWebsiteBasesForHost", () => {
    it("prioritises the matching host", () => {
      const bases = resolveOffchainWebsiteBasesForHost(
        "dynamic-capital.lovable.app",
      );
      assertEquals(
        bases[0],
        "https://dynamic-capital.lovable.app",
      );
      assertEquals(
        bases.slice(1),
        [
          "https://dynamic.capital",
          "https://dynamic-capital.vercel.app",
          "https://dynamic-capital.ondigitalocean.app",
          "https://dynamic-capital-qazf2.ondigitalocean.app",
        ],
      );
    });

    it("falls back to canonical ordering when host is unknown", () => {
      assertEquals(
        resolveOffchainWebsiteBasesForHost("unknown.example"),
        [
          "https://dynamic.capital",
          "https://dynamic-capital.vercel.app",
          "https://dynamic-capital.lovable.app",
          "https://dynamic-capital.ondigitalocean.app",
          "https://dynamic-capital-qazf2.ondigitalocean.app",
        ],
      );
    });
  });

  it("resolves the first base for a host", () => {
    assertEquals(
      resolveOffchainWebsiteBaseForHost("dynamic-capital.vercel.app"),
      "https://dynamic-capital.vercel.app",
    );
    assertEquals(
      resolveOffchainWebsiteBaseForHost(null),
      "https://dynamic.capital",
    );
  });
});
