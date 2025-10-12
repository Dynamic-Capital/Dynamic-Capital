import { assertEquals } from "std/assert/mod.ts";
import { extractTelegramUserId } from "../_shared/telegram.ts";

Deno.test("extractTelegramUserId parses id from initData", () => {
  const user = { id: 42, first_name: "Alice" };
  const initData = `user=${encodeURIComponent(JSON.stringify(user))}`;
  assertEquals(extractTelegramUserId(initData), "42");
});

Deno.test("extractTelegramUserId returns empty string on malformed input", () => {
  const initData = "user=%7Bbad json";
  assertEquals(extractTelegramUserId(initData), "");
});
