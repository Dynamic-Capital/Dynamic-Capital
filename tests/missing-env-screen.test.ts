import { assert } from "https://deno.land/std@0.224.0/testing/asserts.ts";

Deno.test("missing Supabase env vars sets error flag", async () => {
  Deno.env.delete("SUPABASE_URL");
  Deno.env.delete("SUPABASE_ANON_KEY");
  const mod = await import(`../src/config/supabase.ts?${Date.now()}`);
  assert(mod.SUPABASE_ENV_ERROR);
});
