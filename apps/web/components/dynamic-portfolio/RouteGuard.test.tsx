import { describe, expect, it } from "vitest";

import { normalizeRouteGuardPathname } from "./RouteGuard";

describe("normalizeRouteGuardPathname", () => {
  it("returns root for preview hosts that include dots", () => {
    expect(
      normalizeRouteGuardPathname(
        "/_sites/dynamic-capital-qazf2.ondigitalocean.app/",
      ),
    ).toBe("/");
  });

  it("preserves nested paths for preview hosts", () => {
    expect(
      normalizeRouteGuardPathname(
        "/_sites/dynamic-capital-qazf2.ondigitalocean.app/plans/",
      ),
    ).toBe("/plans");
  });

  it("deduplicates repeated slashes after the preview prefix", () => {
    expect(
      normalizeRouteGuardPathname(
        "/_sites/dynamic-capital-qazf2.ondigitalocean.app//plans//details/",
      ),
    ).toBe("/plans/details");
  });

  it("handles preview hosts without a trailing slash", () => {
    expect(
      normalizeRouteGuardPathname(
        "/_sites/dynamic-capital-qazf2.ondigitalocean.app",
      ),
    ).toBe("/");
  });

  it("ignores malformed preview hosts", () => {
    expect(
      normalizeRouteGuardPathname(
        "/_sites/dynamic-capital-qazf2.ondigitalocean.app%2Fextra/plans",
      ),
    ).toBe("/_sites/dynamic-capital-qazf2.ondigitalocean.app%2Fextra/plans");
  });

  it("ignores preview hosts with invalid labels", () => {
    expect(
      normalizeRouteGuardPathname("/_sites/-preview-/plans"),
    ).toBe("/_sites/-preview-/plans");
  });

  it("returns the original path when no preview prefix is present", () => {
    expect(normalizeRouteGuardPathname("/tools"))
      .toBe("/tools");
  });
});
