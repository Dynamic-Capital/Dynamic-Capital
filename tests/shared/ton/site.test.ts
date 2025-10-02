import { describe, expect, it } from "vitest";

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
    expect(TON_SITE_DOMAIN).toBe("dynamiccapital.ton");
    expect(TON_SITE_GATEWAY_ORIGIN).toBe("https://ton.site/dynamiccapital.ton");
    expect(TON_SITE_GATEWAY_URL).toBe(TON_SITE_GATEWAY_ORIGIN);
    expect(TON_SITE_ICON_URL).toBe("https://ton.site/dynamiccapital.ton/icon.png");
    expect(TON_SITE_SOCIAL_PREVIEW_URL).toBe(
      "https://ton.site/dynamiccapital.ton/social/social-preview.svg",
    );
  });

  it("normalises input paths", () => {
    expect(resolveTonSiteUrl()).toBe(TON_SITE_GATEWAY_ORIGIN);
    expect(resolveTonSiteUrl("/")).toBe(TON_SITE_GATEWAY_ORIGIN);
    expect(resolveTonSiteUrl("icon.png")).toBe(TON_SITE_ICON_URL);
    expect(resolveTonSiteUrl("/app")).toBe(
      "https://ton.site/dynamiccapital.ton/app",
    );
    expect(resolveTonSiteUrl("/nested/path")).toBe(
      "https://ton.site/dynamiccapital.ton/nested/path",
    );
    expect(resolveTonSiteUrl("/nested//path//")).toBe(
      "https://ton.site/dynamiccapital.ton/nested/path",
    );
    expect(resolveTonSiteUrl(" nested//path ?q=1 ")).toBe(
      "https://ton.site/dynamiccapital.ton/nested/path?q=1",
    );
    expect(resolveTonSiteUrl("/path//with#hash")).toBe(
      "https://ton.site/dynamiccapital.ton/path/with#hash",
    );
  });
});
