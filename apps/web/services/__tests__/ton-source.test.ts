import { describe, expect, it } from "vitest";

import { getTonSourceConfiguration } from "../ton-source";

describe("getTonSourceConfiguration", () => {
  it("returns the published Ton Source configuration", () => {
    const configuration = getTonSourceConfiguration();

    expect(configuration.backends).toEqual([
      "https://ton-source-prod-1.herokuapp.com",
      "https://ton-source-prod-2.herokuapp.com",
      "https://ton-source-prod-3.herokuapp.com",
    ]);
    expect(configuration.backendsTestnet).toEqual([
      "https://ton-source-prod-testnet-1.herokuapp.com",
    ]);
    expect(configuration.funcVersions).toEqual([
      "0.4.6-wasmfix.0",
      "0.4.6",
      "0.4.5",
      "0.4.4-newops.1",
      "0.4.4-newops",
      "0.4.4",
      "0.4.3",
      "0.4.2",
      "0.4.1",
      "0.4.0",
      "0.3.0",
      "0.2.0",
    ]);
    expect(configuration.tactVersions).toEqual([
      "1.6.13",
      "1.6.12",
      "1.6.11",
      "1.6.10",
      "1.6.7",
      "1.6.6",
      "1.6.5",
      "1.6.4",
      "1.6.3",
      "1.6.2",
      "1.5.4",
      "1.5.3",
      "1.5.2",
      "1.5.1",
      "1.5.0",
      "1.4.4",
      "1.4.3",
      "1.4.2",
      "1.4.1",
      "1.4.0",
      "1.3.1",
      "1.3.0",
      "1.2.0",
      "1.1.5",
      "1.1.4",
      "1.1.3",
      "1.1.2",
      "1.1.1",
      "1.1.0",
      "1.0.0",
    ]);
    expect(configuration.tolkVersions).toEqual([
      "1.1.0",
      "1.0.0",
      "0.12.0",
    ]);
  });

  it("exposes frozen collections to guard against mutation", () => {
    const configuration = getTonSourceConfiguration();

    expect(Object.isFrozen(configuration)).toBe(true);
    expect(Object.isFrozen(configuration.backends)).toBe(true);
    expect(Object.isFrozen(configuration.backendsTestnet)).toBe(true);
    expect(Object.isFrozen(configuration.funcVersions)).toBe(true);
    expect(Object.isFrozen(configuration.tactVersions)).toBe(true);
    expect(Object.isFrozen(configuration.tolkVersions)).toBe(true);
  });
});
