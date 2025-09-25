import test from "node:test";
import { equal as assertEqual } from "node:assert/strict";
import { freshImport } from "./utils/freshImport.ts";

const CONFIG_MODULE = new URL(
  "../supabase/functions/_shared/config.ts",
  import.meta.url,
);

type ConfigModule = typeof import("../supabase/functions/_shared/config.ts");

async function withCryptoEnv(
  value: string | undefined,
  run: () => Promise<void>,
) {
  const original = Deno.env.get("CRYPTO_DEPOSIT_ADDRESS");
  if (value === undefined) {
    Deno.env.delete("CRYPTO_DEPOSIT_ADDRESS");
  } else {
    Deno.env.set("CRYPTO_DEPOSIT_ADDRESS", value);
  }
  try {
    await run();
  } finally {
    if (original === undefined) {
      Deno.env.delete("CRYPTO_DEPOSIT_ADDRESS");
    } else {
      Deno.env.set("CRYPTO_DEPOSIT_ADDRESS", original);
    }
  }
}

async function withConfigModule(run: (cfg: ConfigModule) => Promise<void>) {
  const cfg = await freshImport(CONFIG_MODULE) as ConfigModule;
  const originalGetSetting = cfg.getSetting;
  const originalGetContent = cfg.getContent;
  try {
    await run(cfg);
  } finally {
    cfg.__setGetSetting(originalGetSetting);
    cfg.__setGetContent(originalGetContent);
  }
}

test("getCryptoDepositAddress prefers env values", async () => {
  await withCryptoEnv("  env-address  ", async () => {
    await withConfigModule(async (cfg) => {
      const result = await cfg.getCryptoDepositAddress();
      assertEqual(result, "env-address");
    });
  });
});

test("getCryptoDepositAddress falls back to bot setting", async () => {
  await withCryptoEnv(undefined, async () => {
    await withConfigModule(async (cfg) => {
      cfg.__setGetSetting(async () => "db-value");
      const result = await cfg.getCryptoDepositAddress();
      assertEqual(result, "db-value");
    });
  });
});

test("getCryptoDepositAddress falls back to bot content", async () => {
  await withCryptoEnv(undefined, async () => {
    await withConfigModule(async (cfg) => {
      cfg.__setGetSetting(async () => " null ");
      cfg.__setGetContent(async () => "content-value");
      const result = await cfg.getCryptoDepositAddress();
      assertEqual(result, "content-value");
    });
  });
});

test("getCryptoDepositAddress returns null when no sources configured", async () => {
  await withCryptoEnv(undefined, async () => {
    await withConfigModule(async (cfg) => {
      cfg.__setGetSetting(async () => null);
      cfg.__setGetContent(async () => null);
      const result = await cfg.getCryptoDepositAddress();
      assertEqual(result, null);
    });
  });
});
