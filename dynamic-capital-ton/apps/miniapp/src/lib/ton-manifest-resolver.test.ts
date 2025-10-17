import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import { resolveTonManifestUrl } from "./ton-manifest-resolver";

describe("resolveTonManifestUrl", () => {
  it("returns the first candidate whose HEAD response looks like JSON", async () => {
    const fetchMock = mock.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(null, {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );

    const result = await resolveTonManifestUrl({
      candidates: ["https://example.ton/manifest.json"],
      fetchImplementation: fetchMock,
    });

    assert.equal(result, "https://example.ton/manifest.json");
    assert.equal(fetchMock.mock.calls.length, 1);
    const firstCall = fetchMock.mock.calls[0];
    assert.ok(firstCall);
    const [url, init] = firstCall.arguments;
    assert.equal(url, "https://example.ton/manifest.json");
    assert.equal(init?.method, "HEAD");
    assert.equal(init?.cache, "no-store");
  });

  it("falls back to GET when HEAD is rejected with 405", async () => {
    const fetchMock = mock.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "HEAD") {
        return new Response(null, { status: 405 });
      }

      return new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const result = await resolveTonManifestUrl({
      candidates: ["https://gateway.dynamic/manifest.json"],
      fetchImplementation: fetchMock,
    });

    assert.equal(result, "https://gateway.dynamic/manifest.json");
    assert.equal(fetchMock.mock.calls.length, 2);
    assert.deepEqual(
      fetchMock.mock.calls.map((call) => call.arguments[1]?.method),
      ["HEAD", "GET"],
    );
  });

  it("ignores non-JSON responses and continues to later candidates", async () => {
    const fetchMock = mock.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (input === "https://bad.example/manifest.json") {
        if (init?.method === "HEAD") {
          return new Response(null, { status: 405 });
        }

        return new Response("<html></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }

      if (init?.method === "HEAD") {
        throw new Error("network failure");
      }

      return new Response("{\"name\":\"Dynamic\"}", {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    });

    const result = await resolveTonManifestUrl({
      candidates: [
        "https://bad.example/manifest.json",
        "https://good.example/manifest.json",
      ],
      fetchImplementation: fetchMock,
    });

    assert.equal(result, "https://good.example/manifest.json");
  });

  it("returns null when every attempt fails", async () => {
    const fetchMock = mock.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "HEAD") {
        throw new Error("timeout");
      }

      return new Response("not json", {
        status: 502,
        headers: { "content-type": "text/plain" },
      });
    });

    const result = await resolveTonManifestUrl({
      candidates: ["https://unreachable.example/manifest.json"],
      fetchImplementation: fetchMock,
    });

    assert.equal(result, null);
  });
});
