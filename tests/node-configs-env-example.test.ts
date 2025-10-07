import test from "node:test";
import {
  deepEqual as assertDeepEqual,
  equal as assertEqual,
} from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseDotenv } from "dotenv";

const EXPECTED_NODE_IDS = [
  "dynamic-hedge",
  "human-analysis",
  "ton-execution-planner",
  "ton-feature-engineer",
  "ton-liquidity-ingestion",
  "ton-network-health",
  "ton-ops-briefing",
  "ton-wallet-audit",
].sort();

test(".env.example node config samples stay parseable", async () => {
  const envPath = resolve(process.cwd(), ".env.example");
  const file = readFileSync(envPath, "utf8");
  const parsed = parseDotenv(file);

  const nodeConfigEntries = Object.entries(parsed).filter(([key]) =>
    key.startsWith("NODE_CONFIG__")
  );
  const snapshot = Object.fromEntries(nodeConfigEntries);

  const { loadNodeConfigsFromEnv } = await import(
    "../apps/web/config/node-configs.ts"
  );
  const { configs, errors } = loadNodeConfigsFromEnv({ snapshot });

  assertEqual(
    errors.length,
    0,
    `Expected node config samples to parse without errors, got ${
      errors.map((error) => `${error.key}: ${error.message}`).join("; ")
    }`,
  );

  const parsedIds = configs.map((config) => config.nodeId).sort();
  assertEqual(
    parsedIds.length,
    nodeConfigEntries.length,
    "All node config sample keys should produce configs",
  );
  assertDeepEqual(parsedIds, EXPECTED_NODE_IDS);
});
