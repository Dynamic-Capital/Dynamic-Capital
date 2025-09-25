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
type SupabaseClient = typeof supabase;

interface Dependencies {
  supabase: SupabaseClient;
}

const defaultDeps: Dependencies = { supabase };

export async function handler(
  req: Request,
  deps: Dependencies = defaultDeps,
) {
  try {
    const body = (await req.json()) as LinkWalletBody;
    if (!body.telegram_id || !body.address) {
      return new Response("Bad Request", { status: 400 });
    }

    const { data: user, error: userError } = await deps.supabase
      .from("users")
      .upsert({ telegram_id: body.telegram_id }, { onConflict: "telegram_id" })
      .select()
      .single();

    if (userError) {
      console.error(userError);
      throw new Error("Failed to upsert user");
    }

    const {
      data: addressOwner,
      error: addressLookupError,
    } = await deps.supabase
      .from("wallets")
      .select("id,user_id")
      .eq("address", body.address)
      .maybeSingle();

    if (addressLookupError) {
      console.error(addressLookupError);
      throw new Error("Failed to verify wallet ownership");
    }

    if (
      addressOwner && addressOwner.user_id && addressOwner.user_id !== user.id
    ) {
      return new Response("Address already linked to another user", {
        status: 409,
      });
    }

    const { data: existingWallet, error: existingWalletError } = await deps
      .supabase
      .from("wallets")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingWalletError) {
      console.error(existingWalletError);
      throw new Error("Failed to load existing wallet");
    }

    if (existingWallet && existingWallet.id) {
      const { error: updateError } = await deps.supabase
        .from("wallets")
        .update({
          address: body.address,
          public_key: body.publicKey,
        })
        .eq("id", existingWallet.id);

      if (updateError) {
        console.error(updateError);
        throw new Error("Failed to update wallet");
      }
    } else {
      const { error: insertError } = await deps.supabase.from("wallets").insert(
        {
          user_id: user.id,
          address: body.address,
          public_key: body.publicKey,
        },
      );

      if (insertError) {
        console.error(insertError);
        throw new Error("Failed to create wallet");
      }
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
}

if (import.meta.main) {
  serve((req) => handler(req));
}
