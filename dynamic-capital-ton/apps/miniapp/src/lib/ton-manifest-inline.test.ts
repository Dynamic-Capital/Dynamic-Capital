import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  TON_MANIFEST_FALLBACK_DATA_URL,
  getTonManifestFallbackJson,
} from "./ton-manifest-inline";

describe("ton-manifest-inline", () => {
  it("exposes a data URL that encodes the bundled manifest", () => {
    const json = getTonManifestFallbackJson();
    const decoded = decodeURIComponent(
      TON_MANIFEST_FALLBACK_DATA_URL.replace("data:application/json,", ""),
    );

    assert.equal(decoded, json);
    assert.doesNotThrow(() => JSON.parse(decoded));
  });
});
