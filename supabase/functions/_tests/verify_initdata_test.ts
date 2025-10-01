import { assert, assertEquals } from "std/assert/mod.ts";
import { makeTelegramInitData, setTestEnv } from "./helpers.ts";
import { verifyFromRaw } from "../verify-initdata/index.ts";

Deno.test("verify-initdata: accepts valid signature", async () => {
  setTestEnv({ TELEGRAM_BOT_TOKEN: "test-token" });
  const initData = await makeTelegramInitData(
    { id: 123, username: "alice" },
    "test-token",
  );
  const ok = await verifyFromRaw(initData, 900);
  assert(ok);
});

Deno.test("verify-initdata: rejects bad signature", async () => {
  setTestEnv({ TELEGRAM_BOT_TOKEN: "test-token" });
  const initData = await makeTelegramInitData({ id: 123 }, "other-token");
  const ok = await verifyFromRaw(initData, 900);
  assertEquals(ok, false);
});
