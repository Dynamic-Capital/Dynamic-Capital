import { describe, it } from "std/testing/bdd.ts";
import { assertEquals } from "std/assert/mod.ts";

import {
  TON_SITE_DOMAIN,
  TON_SITE_GATEWAY_ORIGIN,
  TON_SITE_GATEWAY_URL,
  TON_SITE_ICON_URL,
  TON_SITE_SOCIAL_PREVIEW_URL,
  resolveTonSiteUrl,
} from "../../../shared/ton/site";

describe("ton site gateway helpers", () => {
  it("exposes canonical constants", () => {
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
  });

  it("normalises input paths", () => {
    assertEquals(resolveTonSiteUrl(), TON_SITE_GATEWAY_ORIGIN);
    assertEquals(resolveTonSiteUrl("/"), TON_SITE_GATEWAY_ORIGIN);
    assertEquals(resolveTonSiteUrl("icon.png"), TON_SITE_ICON_URL);
    assertEquals(
      resolveTonSiteUrl("/app"),
      "https://ton.site/dynamiccapital.ton/app",
    );
    assertEquals(
      resolveTonSiteUrl("/nested/path"),
      "https://ton.site/dynamiccapital.ton/nested/path",
    );
    assertEquals(
      resolveTonSiteUrl("/nested//path//"),
      "https://ton.site/dynamiccapital.ton/nested/path",
    );
    assertEquals(
      resolveTonSiteUrl(" nested//path ?q=1 "),
      "https://ton.site/dynamiccapital.ton/nested/path?q=1",
    );
    assertEquals(
      resolveTonSiteUrl("/path//with#hash"),
      "https://ton.site/dynamiccapital.ton/path/with#hash",
    );
  });
});
