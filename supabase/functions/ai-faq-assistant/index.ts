import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireEnv } from "../_shared/env.ts";
import { createClient } from "../_shared/client.ts";

const { OPENAI_API_KEY } = requireEnv(["OPENAI_API_KEY"] as const);
const supabase = createClient("service");

async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number; retries?: number } = {},
): Promise<Response> {
  const { timeoutMs = 10_000, retries = 1, ...options } = init;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        if (attempt === retries) {
          throw new Error("Request to OpenAI timed out");
        }
      } else if (attempt === retries) {
        throw err;
      }
    } finally {
      clearTimeout(id);
    }
  }
  // Should be unreachable
  throw new Error("Failed to fetch after retries");
}

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetchWithTimeout(
    "https://api.openai.com/v1/embeddings",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
      retries: 3,
    },
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Embedding error");
  }
  return data.data[0].embedding as number[];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, test } = await req
      .json()
      .catch(() => ({}));

    if (test) {
      return new Response(
        JSON.stringify({ success: true, message: "ai-faq-assistant OK" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!question) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt =
      `You are a knowledgeable trading assistant for Dynamic Capital, a premium trading signals and education service.

IMPORTANT GUIDELINES:
- Provide helpful, educational trading information
- Be professional but friendly
- Keep responses concise but informative (max 300 words)
- Include relevant emojis for better engagement
- Focus on education, not financial advice
- Mention Dynamic Capital's services when relevant
- Always include a disclaimer about risk

DYNAMIC CAPITAL SERVICES:
- Premium trading signals for XAUUSD, EURUSD, GBPUSD
- VIP community access with live analysis
- Educational resources and mentorship
- Bank transfer and crypto payment options
- 24/7 support via @DynamicCapital_Support

COMMON TOPICS:
- Trading basics and terminology
- Risk management principles
- Technical analysis concepts
- Market fundamentals
- Account setup and verification
- Payment methods and subscription plans
- Platform usage and features

Always end responses with: "💡 Need more help? Contact @DynamicCapital_Support or check our VIP plans!"`;

    const questionEmbedding = await getEmbedding(question);

    const { data: matches, error: matchError } = await supabase.rpc(
      "match_faq",
      { query_embedding: questionEmbedding, match_count: 3 },
    );

    if (matchError) console.error("match_faq error", matchError);

    const topMatch = matches?.[0];
    if (topMatch && topMatch.distance < 0.3) {
      return new Response(JSON.stringify({ answer: topMatch.answer }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const faqContext = matches
      ?.map((m) => `Q: ${m.question}\nA: ${m.answer}`)
      .join("\n\n");

    const messages = [
      { role: "system", content: systemPrompt },
    ];
    if (faqContext) {
      messages.push({
        role: "system",
        content: `FAQ context:\n${faqContext}`,
      });
    }
    messages.push({ role: "user", content: question });

    const response = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          max_tokens: 500,
          temperature: 0.7,
        }),
        retries: 3,
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "AI service error");
    }

    const answer = data.choices[0].message.content as string;

    const { error: insertError } = await supabase.from("faq_embeddings").insert(
      {
        question,
        answer,
        embedding: questionEmbedding,
      },
    );
    if (insertError) console.error("insert faq_embeddings", insertError);

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ai-faq-assistant function:", error);
    let details = "Unknown error";
    if (error instanceof Error) {
      details = error.message;
    }
    const status = details.includes("timed out") ? 504 : 500;
    return new Response(
      JSON.stringify({
        error: "Failed to get AI response",
        details,
      }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
};

export default handler;

if (import.meta.main) {
  serve(handler);
}
