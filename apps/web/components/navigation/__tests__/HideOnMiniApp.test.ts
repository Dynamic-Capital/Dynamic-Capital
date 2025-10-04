import { describe, expect, it } from "vitest";

import { __internal_isMiniAppPath } from "../HideOnMiniApp";

describe("HideOnMiniApp path detection", () => {
  it("identifies direct miniapp routes", () => {
    expect(__internal_isMiniAppPath("/miniapp/dynamic-hq")).toBe(true);
    expect(__internal_isMiniAppPath("/miniapp/dynamic-signals"))
      .toBe(true);
  });

  it("identifies preview miniapp routes", () => {
    expect(
      __internal_isMiniAppPath("/_sites/demo/miniapp/dynamic-pool-trading"),
    ).toBe(true);
    expect(
      __internal_isMiniAppPath(
        "/_sites/preview.dynamic.capital/miniapp/dynamic-hq",
      ),
    ).toBe(true);
  });

  it("ignores non-miniapp routes", () => {
    expect(__internal_isMiniAppPath("/work"))
      .toBe(false);
    expect(__internal_isMiniAppPath("/_sites/demo/work"))
      .toBe(false);
    expect(__internal_isMiniAppPath("/"))
      .toBe(false);
  });

  it("handles trailing slashes", () => {
    expect(__internal_isMiniAppPath("/miniapp/"))
      .toBe(true);
    expect(__internal_isMiniAppPath("/_sites/demo/miniapp/"))
      .toBe(true);
  });
});
