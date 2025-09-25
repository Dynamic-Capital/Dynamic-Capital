import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type LinkWalletBody = {
  telegram_id: string;
  address: string;
  publicKey?: string;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    const body = (await req.json()) as LinkWalletBody;
    if (!body.telegram_id || !body.address) {
      return new Response("Bad Request", { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .upsert({ telegram_id: body.telegram_id }, { onConflict: "telegram_id" })
      .select()
      .single();

    if (userError) {
      console.error(userError);
      throw new Error("Failed to upsert user");
    }

    const { error: walletError } = await supabase.from("wallets").upsert(
      {
        user_id: user.id,
        address: body.address,
        public_key: body.publicKey,
      },
      { onConflict: "address" },
    );

    if (walletError) {
      console.error(walletError);
      throw new Error("Failed to upsert wallet");
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(message, { status: 500 });
  }
});
