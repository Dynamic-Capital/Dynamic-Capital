import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { fetchFromStorage } from "./storage.ts";

Deno.test("fetchFromStorage handles success", async () => {
  const mock = {
    storage: {
      from() {
        return {
          download: async () => ({ data: new Blob([new Uint8Array([1, 2, 3])]), error: null }),
        };
      },
    },
  };
  const arr = await fetchFromStorage(mock, "bucket", "key");
  assert(arr);
  assertEquals(arr!.length, 3);
});

Deno.test("fetchFromStorage returns null on error", async () => {
  const mock = {
    storage: {
      from() {
        return { download: async () => ({ data: null, error: "bad" }) };
      },
    },
  };
  const arr = await fetchFromStorage(mock, "bucket", "key");
  assertEquals(arr, null);
});

