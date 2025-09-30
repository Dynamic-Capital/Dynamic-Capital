import { assertEquals } from "std/testing/asserts.ts";
import { getFlag, setConfig } from "../_shared/config.ts";

type PaymentMethod = "crypto" | "bank_transfer";
type PaymentStatus = "pending" | "completed" | "awaiting_admin";
type FeatureFlagName = `auto_approve_${PaymentMethod}`;

const scenarios = [
  { method: "crypto", flag: "auto_approve_crypto" },
  { method: "bank_transfer", flag: "auto_approve_bank_transfer" },
] as const satisfies ReadonlyArray<
  { method: PaymentMethod; flag: FeatureFlagName }
>;

async function resolveStatus(method: PaymentMethod): Promise<PaymentStatus> {
  const flagName = `auto_approve_${method}` as FeatureFlagName;
  const enabled = await getFlag(flagName, false);
  return enabled ? "completed" : "awaiting_admin";
}

Deno.test("payments auto-approval flags respect toggles", async (t) => {
  for (const { method, flag } of scenarios) {
    await t.step(method, async () => {
      await setConfig("features:published", { data: { [flag]: true } });
      assertEquals(await resolveStatus(method), "completed");

      await setConfig("features:published", { data: { [flag]: false } });
      assertEquals(await resolveStatus(method), "awaiting_admin");
    });
  }
});
