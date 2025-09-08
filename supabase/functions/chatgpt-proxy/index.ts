import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireEnv } from "../_shared/env.ts";

const { OPENAI_API_KEY } = requireEnv(["OPENAI_API_KEY"] as const);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, test } = await req.json().catch(() => ({}));

    if (test) {
      return new Response(
        JSON.stringify({ success: true, message: "chatgpt-proxy OK" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "OpenAI error");
    }

    const answer = data.choices[0].message.content as string;

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("chatgpt-proxy error:", err);
    let details = "Unknown error";
    if (err instanceof Error) details = err.message;
    return new Response(
      JSON.stringify({ error: "Failed to get AI response", details }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

