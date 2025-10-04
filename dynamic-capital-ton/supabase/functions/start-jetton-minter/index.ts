import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createStartJettonMinterHandler,
  determineConfiguredNetwork,
  numericFromRow,
  type JettonMinterRow,
  type JettonMinterStore,
} from "./handler.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function createSupabaseJettonMinterStore(client: typeof supabase): JettonMinterStore {
  return {
    async fetchRun(network) {
      const { data, error } = await client
        .from("jetton_minter_runs")
        .select(
          "id, network, status, initiator, note, tx_hash, target_supply, started_at, completed_at, updated_at",
        )
        .eq("network", network)
        .maybeSingle<JettonMinterRow>();
      if (error) {
        throw error;
      }
      return data ?? null;
    },
    async upsertRun(payload) {
      const { data, error } = await client
        .from("jetton_minter_runs")
        .upsert(payload, { onConflict: "network" })
        .select()
        .single<JettonMinterRow>();
      if (error) {
        throw error;
      }
      return data;
    },
    async logStart(record) {
      try {
        await client.from("tx_logs").insert({
          kind: "jetton_minter_start",
          ref_id: record.id,
          meta: {
            network: record.network,
            initiator: record.initiator,
            tx_hash: record.tx_hash,
            target_supply: numericFromRow(record.target_supply),
          },
        });
      } catch (error) {
        console.error("[start-jetton-minter] Failed to log tx", error);
      }
    },
  } satisfies JettonMinterStore;
}

const configuredNetwork = determineConfiguredNetwork(Deno.env.get("JETTON_MINTER_NETWORK"));

const handler = createStartJettonMinterHandler({
  store: createSupabaseJettonMinterStore(supabase),
  configuredNetwork,
});

serve(handler);
