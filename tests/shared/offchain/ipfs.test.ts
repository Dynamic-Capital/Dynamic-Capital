import { describe, it } from "std/testing/bdd.ts";
import { assertEquals, assertStrictEquals } from "std/assert/mod.ts";

import {
  isIpfsUri,
  OFFCHAIN_IPFS_GATEWAY_BASE,
  resolveOffchainIpfsGatewayUrl,
} from "../../../shared/offchain/ipfs";

describe("off-chain IPFS helpers", () => {
  it("exposes the canonical gateway base", () => {
    assertStrictEquals(OFFCHAIN_IPFS_GATEWAY_BASE, "https://ipfs.io");
  });

  describe("resolveOffchainIpfsGatewayUrl", () => {
    const cases: Array<{ input: string; expected: string }> = [
      {
        input: "ipfs://bafy123",
        expected: "https://ipfs.io/ipfs/bafy123",
      },
      {
        input: "ipfs://bafy123/path/asset.png",
        expected: "https://ipfs.io/ipfs/bafy123/path/asset.png",
      },
      {
        input: " ipfs://bafy123/path?q=1#hash ",
        expected: "https://ipfs.io/ipfs/bafy123/path?q=1#hash",
      },
      {
        input: "bafy123",
        expected: "https://ipfs.io/ipfs/bafy123",
      },
      {
        input: "/ipfs/bafy123",
        expected: "https://ipfs.io/ipfs/bafy123",
      },
      {
        input: "https://example.com/resource.json",
        expected: "https://example.com/resource.json",
      },
      {
        input: "",
        expected: "https://ipfs.io/ipfs",
      },
    ];

    for (const { input, expected } of cases) {
      it(`normalises ${JSON.stringify(input)}`, () => {
        assertEquals(resolveOffchainIpfsGatewayUrl(input), expected);
      });
    }
  });

  describe("isIpfsUri", () => {
    const positives = [
      "ipfs://bafy123",
      " /ipfs/bafy123 ",
      "ipfs/bafy123",
    ];
    for (const value of positives) {
      it(`detects ${JSON.stringify(value)} as IPFS`, () => {
        assertStrictEquals(isIpfsUri(value), true);
      });
    }

    const negatives = [
      "",
      undefined,
      null,
      "https://example.com",
    ];
    for (const value of negatives) {
      it(`treats ${JSON.stringify(value)} as non-IPFS`, () => {
        assertStrictEquals(isIpfsUri(value as string), false);
      });
    }
  });
});
