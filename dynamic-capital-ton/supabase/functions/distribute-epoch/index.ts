import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async () => {
  try {
    const epochLengthMs = Number(
      Deno.env.get("EPOCH_LENGTH_MS") ?? 7 * 24 * 60 * 60 * 1000,
    );
    const epochCap = Number(Deno.env.get("EPOCH_CAP") ?? 240000);

    const epoch = Math.floor(Date.now() / epochLengthMs);

    const { data: activeStakes, error } = await supabase
      .from("stakes")
      .select("id, user_id, dct_amount, weight, status")
      .eq("status", "active");

    if (error) {
      throw new Error(error.message);
    }

    if (!activeStakes || activeStakes.length === 0) {
      return new Response("No active stakes", { status: 200 });
    }

    const totalWeight = activeStakes.reduce((sum, row) => {
      const amount = Number(row.dct_amount ?? 0);
      const weight = Number(row.weight ?? 0);
      return sum + amount * weight;
    }, 0);

    if (totalWeight <= 0) {
      return new Response("No weight", { status: 200 });
    }

    const rewards = activeStakes.map((row) => {
      const amount = Number(row.dct_amount ?? 0);
      const weight = Number(row.weight ?? 0);
      const share = (amount * weight * epochCap) / totalWeight;
      return { user_id: row.user_id, amount: share };
    });

    await supabase.from("emissions").upsert({
      epoch,
      total_reward: epochCap,
      distributed_at: new Date().toISOString(),
    });

    const { error: logError } = await supabase.from("tx_logs").insert(
      rewards.map((reward) => ({
        kind: "epoch_reward",
        amount: reward.amount,
        meta: { unit: "DCT", epoch },
      })),
    );

    if (logError) {
      throw new Error(logError.message);
    }

    return new Response(JSON.stringify({ ok: true, epoch, total: epochCap }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(message, { status: 500 });
  }
});
