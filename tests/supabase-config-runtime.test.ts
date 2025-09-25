import test from "node:test";
import {
  deepEqual as assertDeepEqual,
  equal as assertEqual,
} from "node:assert/strict";

import { freshImport } from "./utils/freshImport.ts";

const CONFIG_MODULE = new URL(
  "../apps/web/config/supabase.ts",
  import.meta.url,
);

type EnvShape = Record<string, string | undefined>;

async function withEnv(env: EnvShape, run: () => Promise<void>) {
  const processEnv = typeof process !== "undefined" ? process.env : undefined;
  const denoEnv = typeof Deno !== "undefined" ? Deno.env : undefined;

  const originalEntries: Array<
    { scope: "process" | "deno"; key: string; value: string | undefined }
  > = [];

  for (const [key, value] of Object.entries(env)) {
    if (processEnv) {
      originalEntries.push({ scope: "process", key, value: processEnv[key] });
      if (value === undefined) {
        delete processEnv[key];
      } else {
        processEnv[key] = value;
      }
    }

    if (denoEnv) {
      originalEntries.push({
        scope: "deno",
        key,
        value: denoEnv.get(key) ?? undefined,
      });
      if (value === undefined) {
        denoEnv.delete(key);
      } else {
        denoEnv.set(key, value);
      }
    }
  }

  try {
    await run();
  } finally {
    for (const entry of originalEntries.reverse()) {
      if (entry.scope === "process" && processEnv) {
        if (entry.value === undefined) delete processEnv[entry.key];
        else processEnv[entry.key] = entry.value;
      }

      if (entry.scope === "deno" && denoEnv) {
        if (entry.value === undefined) denoEnv.delete(entry.key);
        else denoEnv.set(entry.key, entry.value);
      }
    }
  }
}

test("supabase config falls back to baked defaults", async () => {
  await withEnv(
    {
      CRYPTO_DEPOSIT_ADDRESS: undefined,
      CRYPTO_SUPPORTED_CURRENCIES: undefined,
      USDT_TRC20_ADDRESS: undefined,
      CRYPTO_NETWORK: undefined,
      TELEGRAM_BOT_URL: undefined,
      MINI_APP_URL: undefined,
      NEXT_PUBLIC_MINI_APP_URL: undefined,
      NEXT_PUBLIC_TELEGRAM_WEBHOOK_SECRET: undefined,
    },
    async () => {
      const mod = await freshImport(CONFIG_MODULE);
      const { CRYPTO_CONFIG, TELEGRAM_CONFIG } =
        mod as typeof import("../apps/web/config/supabase.ts");

      assertDeepEqual(CRYPTO_CONFIG.SUPPORTED_CURRENCIES, [
        "BTC",
        "ETH",
        "USDT",
        "LTC",
      ]);
      assertEqual(
        CRYPTO_CONFIG.DEPOSIT_ADDRESS,
        "TQn9Y2khEsLMWD1N4wZ7Eh6V8c8aL5Q1R4",
      );
      assertEqual(
        CRYPTO_CONFIG.USDT_TRC20_ADDRESS,
        "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      );
      assertEqual(CRYPTO_CONFIG.NETWORK, "mainnet");

      assertEqual(TELEGRAM_CONFIG.BOT_URL, "https://t.me/your_bot");
      assertEqual(
        TELEGRAM_CONFIG.MINI_APP_URL,
        "https://your-miniapp.supabase.co",
      );
      assertEqual(TELEGRAM_CONFIG.WEBHOOK_SECRET, "");
    },
  );
});

test("supabase config respects env overrides", async () => {
  await withEnv(
    {
      CRYPTO_DEPOSIT_ADDRESS: "tron-deposit",
      CRYPTO_SUPPORTED_CURRENCIES: "btc,sol , usdt",
      USDT_TRC20_ADDRESS: "tron-usdt",
      CRYPTO_NETWORK: " testnet ",
      TELEGRAM_BOT_URL: "https://t.me/custom_bot",
      NEXT_PUBLIC_MINI_APP_URL: "https://mini.example.com",
      NEXT_PUBLIC_TELEGRAM_WEBHOOK_SECRET: "public-secret",
    },
    async () => {
      const mod = await freshImport(CONFIG_MODULE);
      const { CRYPTO_CONFIG, TELEGRAM_CONFIG } =
        mod as typeof import("../apps/web/config/supabase.ts");

      assertDeepEqual(CRYPTO_CONFIG.SUPPORTED_CURRENCIES, [
        "BTC",
        "SOL",
        "USDT",
      ]);
      assertEqual(CRYPTO_CONFIG.DEPOSIT_ADDRESS, "tron-deposit");
      assertEqual(CRYPTO_CONFIG.USDT_TRC20_ADDRESS, "tron-usdt");
      assertEqual(CRYPTO_CONFIG.NETWORK, "testnet");

      assertEqual(TELEGRAM_CONFIG.BOT_URL, "https://t.me/custom_bot");
      assertEqual(TELEGRAM_CONFIG.MINI_APP_URL, "https://mini.example.com");
      assertEqual(TELEGRAM_CONFIG.WEBHOOK_SECRET, "public-secret");
    },
  );
});

test("supabase config ignores null-like env values", async () => {
  await withEnv(
    {
      CRYPTO_DEPOSIT_ADDRESS: " null ",
      CRYPTO_SUPPORTED_CURRENCIES: " , ",
      CRYPTO_NETWORK: "undefined",
      NEXT_PUBLIC_TELEGRAM_WEBHOOK_SECRET: " Null ",
    },
    async () => {
      const mod = await freshImport(CONFIG_MODULE);
      const { CRYPTO_CONFIG, TELEGRAM_CONFIG } =
        mod as typeof import("../apps/web/config/supabase.ts");

      assertDeepEqual(CRYPTO_CONFIG.SUPPORTED_CURRENCIES, [
        "BTC",
        "ETH",
        "USDT",
        "LTC",
      ]);
      assertEqual(
        CRYPTO_CONFIG.DEPOSIT_ADDRESS,
        "TQn9Y2khEsLMWD1N4wZ7Eh6V8c8aL5Q1R4",
      );
      assertEqual(CRYPTO_CONFIG.NETWORK, "mainnet");
      assertEqual(TELEGRAM_CONFIG.WEBHOOK_SECRET, "");
    },
  );
});
