import test from "node:test";
import {
  deepEqual as assertDeepEqual,
  equal as assertEqual,
  ok as assertOk,
} from "node:assert/strict";
import process from "node:process";

import { freshImport } from "./utils/freshImport.ts";

type EnvMap = Record<string, string | undefined>;

async function withEnv(vars: EnvMap, run: () => Promise<void>) {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    await run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

const importNodeConfigs = () =>
  freshImport(new URL("../apps/web/config/node-configs.ts", import.meta.url));

test("loadNodeConfigsFromEnv parses valid environment payloads", async () => {
  await withEnv(
    {
      NODE_CONFIG__FUSION: JSON.stringify({
        node_id: " Fusion ",
        type: "Processing",
        enabled: "false",
        interval_sec: "60",
        dependencies: [" ticks ", "Fusion", "ticks"],
        outputs: [" Signals ", "signals"],
        metadata: { source: "fusion" },
        weight: "0.8",
      }),
      NODE_CONFIG__TREASURY_SNAPSHOT: JSON.stringify({
        type: "processing",
        interval_sec: 900,
        outputs: ["treasury"],
      }),
    },
    async () => {
      const mod = await importNodeConfigs();
      const result = mod.loadNodeConfigsFromEnv();

      assertEqual(result.errors.length, 0);
      assertEqual(result.configs.length, 2);

      const [fusion, treasury] = result.configs;
      assertEqual(fusion.nodeId, "Fusion");
      assertEqual(fusion.type, "processing");
      assertEqual(fusion.enabled, false);
      assertEqual(fusion.intervalSec, 60);
      assertDeepEqual(fusion.dependencies, ["ticks", "Fusion"]);
      assertDeepEqual(fusion.outputs, ["Signals", "signals"]);
      assertDeepEqual(fusion.metadata, { source: "fusion" });
      assertEqual(fusion.weight, 0.8);

      assertEqual(treasury.nodeId, "treasury-snapshot");
      assertEqual(treasury.enabled, true);
      assertEqual(treasury.intervalSec, 900);
      assertDeepEqual(treasury.outputs, ["treasury"]);
      assertEqual(treasury.weight, null);
    },
  );
});

test("loadNodeConfigsFromEnv captures parse errors", async () => {
  await withEnv(
    {
      NODE_CONFIG__BROKEN_JSON: "{not-valid}",
      NODE_CONFIG__MISSING_FIELDS: JSON.stringify({
        type: "unknown",
        interval_sec: 0,
      }),
    },
    async () => {
      const mod = await importNodeConfigs();
      const result = mod.loadNodeConfigsFromEnv();

      assertEqual(result.configs.length, 0);
      assertEqual(result.errors.length, 2);
      assertOk(
        result.errors.some((error: { key: string; message: string }) =>
          error.key.endsWith("BROKEN_JSON") &&
          error.message.includes("Invalid JSON")
        ),
      );
      assertOk(
        result.errors.some((error: { key: string; message: string }) =>
          error.key.endsWith("MISSING_FIELDS") &&
          error.message.includes("unsupported type")
        ),
      );
    },
  );
});
