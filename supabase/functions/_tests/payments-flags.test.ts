import { assertEquals } from "std/testing/asserts.ts";
import { getFlag, setConfig } from "../_shared/config.ts";

async function applyAutoApprove(payment: {
  method: string;
  status: string;
}) {
  const flag = await getFlag(`auto_approve_${payment.method}`, false);
  payment.status = flag ? "completed" : "awaiting_admin";
}

Deno.test("crypto auto-approval flag", async () => {
  await setConfig("features:published", {
    data: { auto_approve_crypto: true },
  });
  const p1 = { method: "crypto", status: "pending" };
  await applyAutoApprove(p1);
  assertEquals(p1.status, "completed");

  await setConfig("features:published", {
    data: { auto_approve_crypto: false },
  });
  const p2 = { method: "crypto", status: "pending" };
  await applyAutoApprove(p2);
  assertEquals(p2.status, "awaiting_admin");
});

Deno.test("bank transfer auto-approval flag", async () => {
  await setConfig("features:published", {
    data: { auto_approve_bank_transfer: true },
  });
  const p1 = { method: "bank_transfer", status: "pending" };
  await applyAutoApprove(p1);
  assertEquals(p1.status, "completed");

  await setConfig("features:published", {
    data: { auto_approve_bank_transfer: false },
  });
  const p2 = { method: "bank_transfer", status: "pending" };
  await applyAutoApprove(p2);
  assertEquals(p2.status, "awaiting_admin");
});
