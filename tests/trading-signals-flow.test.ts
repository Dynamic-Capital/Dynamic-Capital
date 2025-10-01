import test from "node:test";
import assert from "node:assert/strict";

import { __resetSupabaseState, createClient } from "./supabase-client-stub.ts";

function createSupabase() {
  return createClient() as {
    from(table: string): any;
    rpc(name: string, params?: Record<string, unknown>): Promise<{
      data: any;
      error: { message: string } | null;
    }>;
  };
}

test("trading signal lifecycle through RPC helpers", async () => {
  __resetSupabaseState();
  const supabase = createSupabase();

  const accountInsert = await supabase.from("trading_accounts").insert({
    id: "acct-1",
    account_code: "DEMO",
    environment: "demo",
    status: "active",
  });
  assert.equal(accountInsert.error, null);

  const signalInsert = await supabase.from("signals").insert({
    alert_id: "alert-123",
    account_id: "acct-1",
    symbol: "XAUUSD",
    direction: "long",
    payload: { entry: 2350.5 },
  });
  assert.equal(signalInsert.error, null);
  assert.ok(Array.isArray(signalInsert.data));
  const signalId = signalInsert.data[0].id as string;

  const claim = await supabase.rpc("claim_trading_signal", {
    p_worker_id: "worker-1",
    p_account_code: "DEMO",
  });
  assert.equal(claim.error, null);
  assert.ok(claim.data);
  assert.equal(claim.data.status, "claimed");

  const markProcessing = await supabase.rpc("mark_trading_signal_status", {
    p_signal_id: signalId,
    p_status: "processing",
    p_worker_id: "worker-1",
    p_dispatch_status: "processing",
  });
  assert.equal(markProcessing.error, null);
  assert.equal(markProcessing.data.status, "processing");

  const trade = await supabase.rpc("record_trade_update", {
    p_signal_id: signalId,
    p_mt5_ticket_id: "555",
    p_status: "executing",
    p_payload: {
      volume: 1,
      requested_price: 2350.5,
      opened_at: new Date().toISOString(),
    },
  });
  assert.equal(trade.error, null);
  assert.equal(trade.data.status, "executing");
  assert.equal(trade.data.mt5_ticket_id, "555");

  const markExecuted = await supabase.rpc("mark_trading_signal_status", {
    p_signal_id: signalId,
    p_status: "executed",
    p_worker_id: "worker-1",
    p_dispatch_status: "completed",
  });
  assert.equal(markExecuted.error, null);
  assert.equal(markExecuted.data.status, "executed");
  assert.ok(markExecuted.data.executed_at);

  const pending = await supabase.from("signals").select("*").eq(
    "status",
    "pending",
  );
  assert.equal(pending.error, null);
  assert.ok(Array.isArray(pending.data));
  assert.equal(pending.data.length, 0);

  const storedTrade = await supabase
    .from("trades")
    .select("*")
    .eq("mt5_ticket_id", "555")
    .maybeSingle();
  assert.equal(storedTrade.error, null);
  assert.ok(storedTrade.data);
  assert.equal(storedTrade.data.status, "executing");
});
