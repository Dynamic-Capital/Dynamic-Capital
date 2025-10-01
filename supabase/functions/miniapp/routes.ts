import { verifyInitDataAndGetUser } from "../_shared/telegram.ts";
import { extractTelegramUserId } from "../shared/telegram.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import type { SupabaseClient } from "../_shared/client.ts";

export async function handleApiRoutes(
  req: Request,
  path: string,
  supabase: SupabaseClient,
): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // POST /api/admin-check - Check admin status
  if (path === "/api/admin-check" && req.method === "POST") {
    try {
      const body = await req.json();
      const u = await verifyInitDataAndGetUser(body.initData || "");
      if (!u) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }
      const telegram_user_id = String(u.id);

      // Check admin status in database
      const { data: user, error } = await supabase
        .from("bot_users")
        .select("is_admin")
        .eq("telegram_id", telegram_user_id)
        .single();

      if (error) {
        console.error("Admin check error:", error);
        return new Response(JSON.stringify({ is_admin: false }), {
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          is_admin: user?.is_admin || false,
          telegram_user_id,
        }),
        {
          headers: { ...corsHeaders, "content-type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Admin check error:", error);
      return new Response(JSON.stringify({ is_admin: false }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
  }

  // POST /api/subscription-status - Get subscription status
  if (path === "/api/subscription-status" && req.method === "POST") {
    try {
      const body = await req.json();
      const u = await verifyInitDataAndGetUser(body.initData || "");
      if (!u) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }
      const telegram_user_id = String(u.id);

      // Get user subscription status
      const { data: statusData, error: statusError } = await supabase
        .rpc("get_user_subscription_status", { telegram_user_id });

      if (statusError) {
        console.error("Subscription status error:", statusError);
        return new Response(
          JSON.stringify({
            subscription: null,
            available_plans: [],
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "content-type": "application/json" },
          },
        );
      }

      // Get available plans
      const { data: plans, error: plansError } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price", { ascending: true });

      return new Response(
        JSON.stringify({
          subscription: statusData?.[0] || null,
          available_plans: plans || [],
        }),
        {
          headers: { ...corsHeaders, "content-type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Subscription status error:", error);
      return new Response(
        JSON.stringify({
          subscription: null,
          available_plans: [],
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "content-type": "application/json" },
        },
      );
    }
  }

  // POST /api/sync-user - Sync Telegram user with database
  if (path === "/api/sync-user" && req.method === "POST") {
    try {
      const body = await req.json();
      const { initData } = body;

      if (!initData) {
        return new Response(JSON.stringify({ error: "initData required" }), {
          status: 400,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }

      const telegram_user_id = extractTelegramUserId(initData);
      if (!telegram_user_id) {
        return new Response(JSON.stringify({ error: "Invalid initData" }), {
          status: 400,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }

      // Parse user data from initData
      const params = new URLSearchParams(initData);
      const userStr = params.get("user");
      let userData = null;
      if (userStr) {
        userData = JSON.parse(userStr);
      }

      // Upsert user in bot_users table
      const { data: user, error } = await supabase
        .from("bot_users")
        .upsert({
          telegram_id: telegram_user_id,
          first_name: userData?.first_name || null,
          last_name: userData?.last_name || null,
          username: userData?.username || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "telegram_id",
        })
        .select()
        .single();

      if (error) {
        console.error("User sync error:", error);
        return new Response(JSON.stringify({ error: "Failed to sync user" }), {
          status: 500,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          ok: true,
          user: {
            telegram_id: user.telegram_id,
            is_admin: user.is_admin,
            is_vip: user.is_vip,
          },
        }),
        {
          headers: { ...corsHeaders, "content-type": "application/json" },
        },
      );
    } catch (error) {
      console.error("User sync error:", error);
      return new Response(JSON.stringify({ error: "Failed to sync user" }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
  }

  // GET /api/vip-dashboard - Get VIP dashboard data
  if (path === "/api/vip-dashboard" && req.method === "GET") {
    try {
      const url = new URL(req.url);
      const telegram_user_id = url.searchParams.get("telegram_user_id");

      if (!telegram_user_id) {
        return new Response(
          JSON.stringify({ error: "telegram_user_id required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "content-type": "application/json" },
          },
        );
      }

      // Check if user is VIP
      const { data: user, error: userError } = await supabase
        .from("bot_users")
        .select("is_vip, subscription_expires_at")
        .eq("telegram_id", telegram_user_id)
        .single();

      if (userError || !user?.is_vip) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }

      // Get VIP analytics
      const { data: analytics, error: analyticsError } = await supabase
        .from("daily_analytics")
        .select("*")
        .order("date", { ascending: false })
        .limit(30);

      // Get recent interactions
      const { data: interactions, error: interactionsError } = await supabase
        .from("user_interactions")
        .select("*")
        .eq("telegram_user_id", telegram_user_id)
        .order("created_at", { ascending: false })
        .limit(10);

      return new Response(
        JSON.stringify({
          user: {
            is_vip: user.is_vip,
            subscription_expires_at: user.subscription_expires_at,
          },
          analytics: analytics || [],
          recent_interactions: interactions || [],
        }),
        {
          headers: { ...corsHeaders, "content-type": "application/json" },
        },
      );
    } catch (error) {
      console.error("VIP dashboard error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to load dashboard" }),
        {
          status: 500,
          headers: { ...corsHeaders, "content-type": "application/json" },
        },
      );
    }
  }

  // POST /api/receipt - Receipt upload
  if (path === "/api/receipt" && req.method === "POST") {
    try {
      const form = await req.formData();
      const initData = String(form.get("initData") || "");
      const file = form.get("image");

      if (!(file instanceof File)) {
        return new Response(JSON.stringify({ error: "image required" }), {
          status: 400,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }

      const u = await verifyInitDataAndGetUser(initData);
      if (!u) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }

      const allowed = ["image/png", "image/jpeg"];
      if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: "Invalid file" }), {
          status: 400,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }

      const ext = file.name.split(".").pop();
      const userId = String(u.id);
      const path = `receipts/${userId}/${crypto.randomUUID()}${
        ext ? `.${ext}` : ""
      }`;

      try {
        const { error } = await supabase.storage.from("payment-receipts")
          .upload(path, file);
        if (error) throw error;

        return new Response(
          JSON.stringify({
            ok: true,
            bucket: "payment-receipts",
            path,
          }),
          {
            headers: { ...corsHeaders, "content-type": "application/json" },
          },
        );
      } catch (uploadError) {
        console.error("Upload error:", uploadError);
        return new Response(
          JSON.stringify({
            error: "Failed to upload receipt",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "content-type": "application/json" },
          },
        );
      }
    } catch (error) {
      console.error("Receipt upload error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to submit receipt. Please try again later.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "content-type": "application/json" },
        },
      );
    }
  }

  // GET /api/receipts - Get receipts
  if (path.startsWith("/api/receipts") && req.method === "GET") {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const status = url.searchParams.get("status");
    const initData = url.searchParams.get("initData") || "";

    const u = await verifyInitDataAndGetUser(initData);
    if (!u) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    let query = supabase
      .from("receipts")
      .select("*")
      .eq("telegram_id", String(u.id))
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) query = query.eq("verdict", status);

    const { data, error } = await query;
    if (error) {
      console.error("Receipts fetch error:", error);
      return new Response(JSON.stringify({ receipts: [] }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ receipts: data || [] }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  // POST /api/receipt/:id/approve - Approve receipt
  const approveMatch = path.match(/^\/api\/receipt\/([^/]+)\/approve$/);
  if (approveMatch && req.method === "POST") {
    const id = approveMatch[1];
    // Mock approval
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  // POST /api/receipt/:id/reject - Reject receipt
  const rejectMatch = path.match(/^\/api\/receipt\/([^/]+)\/reject$/);
  if (rejectMatch && req.method === "POST") {
    const id = rejectMatch[1];
    // Mock rejection
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  // POST /api/intent - Create payment intent
  if (path === "/api/intent" && req.method === "POST") {
    try {
      const schema = z.object({
        initData: z.string(),
        type: z.enum(["bank", "crypto"]),
        amount: z.number().positive().optional(),
        currency: z.string().optional(),
        bank: z.string().optional(),
        network: z.string().optional(),
      });
      const body = schema.parse(await req.json());

      const u = await verifyInitDataAndGetUser(body.initData || "");
      if (!u) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }

      const pay_code = crypto.randomUUID().replace(/-/g, "").slice(0, 6)
        .toUpperCase();
      const currency = body.currency === "MVR" ? "MVR" : "USD";
      const expected = body.amount || 0;

      let userId: string | undefined;
      const { data: bu } = await supabase
        .from("bot_users")
        .select("id")
        .eq("telegram_id", String(u.id))
        .limit(1);
      userId = bu?.[0]?.id as string | undefined;
      if (!userId) {
        const { data: ins } = await supabase
          .from("bot_users")
          .insert({ telegram_id: String(u.id) })
          .select("id")
          .single();
        userId = ins?.id as string | undefined;
      }

      const { error: intentErr } = await supabase.from("payment_intents")
        .insert({
          user_id: userId ?? crypto.randomUUID(),
          method: body.type,
          expected_amount: expected,
          currency,
          pay_code,
          status: "pending",
          notes: body.type === "bank"
            ? body.bank || null
            : body.network || null,
        });
      if (intentErr) {
        console.error("miniapp intent insert error", intentErr);
        return new Response(
          JSON.stringify({ error: "Failed to create payment intent" }),
          {
            status: 500,
            headers: { ...corsHeaders, "content-type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ ok: true, pay_code }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    } catch (error) {
      console.error("miniapp intent error", error);
      return new Response(
        JSON.stringify({ error: "Failed to create payment intent" }),
        {
          status: 500,
          headers: { ...corsHeaders, "content-type": "application/json" },
        },
      );
    }
  }

  // POST /api/crypto-txid - Submit crypto transaction
  if (path === "/api/crypto-txid" && req.method === "POST") {
    try {
      const body = await req.json();

      return new Response(
        JSON.stringify({
          ok: true,
          txid: body.txid,
        }),
        {
          headers: { ...corsHeaders, "content-type": "application/json" },
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Failed to submit transaction",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "content-type": "application/json" },
        },
      );
    }
  }

  // API route not found
  return new Response(JSON.stringify({ error: "API endpoint not found" }), {
    status: 404,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}
