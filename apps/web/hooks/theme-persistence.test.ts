function assertEquals<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message ?? `Expected ${expected} but received ${actual}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

import { createThemeModeSetter } from "./theme-persistence.ts";

declare const Deno: {
  test: (name: string, fn: () => void | Promise<void>) => void;
};

Deno.test("toggling theme after session refresh persists to Supabase", async () => {
  const calls: Array<{ name: string; payload: unknown }> = [];
  let session: { access_token?: string | null } | null = null;
  let preference: "light" | "dark" | "system" = "system";

  const setThemeMode = createThemeModeSetter({
    setDynamicUiTheme: (value) => {
      preference = value;
    },
    persistPreference: () => {
      /* noop */
    },
    getSession: () => session,
    callRemote: async (name, payload) => {
      calls.push({ name, payload });
      return {};
    },
    getTelegramWebApp: () => undefined,
    getCurrentPreference: () => preference,
  });

  await setThemeMode("dark");
  assertEquals(calls.length, 0, "theme save should not run without a session");

  session = { access_token: "supabase-token" };
  await setThemeMode("light");

  assertEquals(calls.length, 1, "theme save should run once after session set");
  const [{ name, payload }] = calls;
  assertEquals(name, "THEME_SAVE");
  const request = payload as {
    method?: string;
    token?: string;
    body?: { mode?: string };
  };

  assertEquals(request.method, "POST");
  assertEquals(request.token, "supabase-token");
  assert(request.body?.mode === "light", "expected light mode payload");

  await setThemeMode("light");
  assertEquals(calls.length, 1, "repeat selection should skip remote save");
});
