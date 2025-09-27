import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { optionalEnv, requireEnv } from "../_shared/env.ts";
import { createClient } from "../_shared/client.ts";

const { OPENAI_API_KEY } = requireEnv(["OPENAI_API_KEY"] as const);
const GROK_API_KEY = optionalEnv("GROK_API_KEY");
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

type LanguageCode = "dv" | "en";

type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string };

const SYSTEM_PROMPTS: Record<LanguageCode, string> = {
  en:
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

Always end responses with: "💡 Need more help? Contact @DynamicCapital_Support or check our VIP plans!"`,
  dv: `ތިބާ Dynamic Capital ގެ AI އެސިސްޓަންޓެއްކަށް ދިވެހި ބަހުގައި (ތާނައިން) ޖަވާބުތައް ލިޔާނެ. އެންމެން މަގުމަގު:
- ސުވާލުތަކުގެ ޖަވާބު ރިސްކް މިނިގްމެންޓް، ޓްރޭޑިން މަޢުލޫމާތް، Dynamic Capital ސަރވިސްތައް އެކުލެވޭނެ.
- މަދުކޮށްފި ކުރިޔަށް ބެލެވޭނެ، ބަދަލު މިންވަރު ބޮޑު ނުކުރެވޭނެ (ބައެއް 300 ބައި ނުދެވޭނެ).
- ބަދަލުގައި ކަލާތްތަކުގެ އެމޮޖީތައް ލިޔާނެ.
- ފައިނޭންޝަލް އެޑްވައިސް ނުދެވޭނެ؛ ތިބާގެ ޖަވާބުތަކު ތިރީގެ އެޑިކޭޝަންއަށް ދިޔުނެ.
- Dynamic Capital ގެ ސަރވިސްތައް ހުރިހާނެއެވެ.
- ހުރިހާ ޖަވާބުގައި ރިސްކް ޑިސްކްލޭމަރެއް ލިޔާނެ.

Dynamic Capital ގެ ސަރވިސްތައް:
- XAUUSD, EURUSD, GBPUSD އަށް ވާހަކަ ޕްރިމިއަމް ސިގްނަލްތައް
- ފައިނެންސް އެނަލިސިސްގައި އިތުރު އިންތިޒާރުކުރުން ވިޕީ ކޮމިޔުނިޓީއަށް ޑޮކެސްސް
- އެޑިކޭޝަން ރިސޯސްތައްއާއި މެންޓޯރޝިޕް
- ބެންކު ޓްރާންސްފާރއާއި ކްރިޕްޓޯ ޕޭމަންޓްތަކުގެ އިޢުލާން
- 24/7 ސަޕޯޓް @DynamicCapital_Support

މި މަގުމަގުތަކާއި ބައިވެރި ސަރވިސްތައް އެނގޭނެ. ހުރިހާ ޖަވާބުތަކުގައި ރިސްކް ޑިސްކްލޭމަރެއް ލިޔާނެ، ސަރވިސްތައް މަޢުލޫމާތްތަކަށް އަދި އިތުރެއްގައި މައްސަލަތައް ލިޔާނެ.

ހުރިހާ ޖަވާބުތަކުގައި ދިވެހި ބަހުގައި ނަގާނެ. ނައްސަ ބަދަލުތަކަށް އެމޮޖީތަކާއި ޓިޕްތައް ދެއްވާލެވޭ.

ހުރިހާ ޖަވާބުތަކުގައި މި ތަފާތުގެ އިންސްޓްރަކްޝަން ބޮޑަށްފި ބޭނުން.

ނައްސައިންސްޓްރަކްޝަން: "💡 އިތުރަށް ބައެއް ހުރިހާނެ؟ @DynamicCapital_Support އަށް ގުޅޭނެ، VIP ޕްލެންތައް ބަލާ!"`,
};

async function callOpenAI(messages: ChatMessage[]): Promise<string> {
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

  const answer = data.choices?.[0]?.message?.content;
  if (typeof answer !== "string" || answer.trim() === "") {
    throw new Error("OpenAI returned empty response");
  }
  return answer;
}

async function callGrok(messages: ChatMessage[]): Promise<string> {
  if (!GROK_API_KEY) {
    throw new Error("Grok API key not configured");
  }

  const response = await fetchWithTimeout(
    "https://api.x.ai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-1",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
      retries: 2,
    },
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Grok service error");
  }
  const answer = data.choices?.[0]?.message?.content;
  if (typeof answer !== "string" || answer.trim() === "") {
    throw new Error("Grok returned empty response");
  }
  return answer;
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
    const { question, test, language: rawLanguage } = await req
      .json()
      .catch(() => ({}));

    const language: LanguageCode = rawLanguage === "en" ? "en" : "dv";

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

    const questionEmbedding = await getEmbedding(question);

    const { data: matches, error: matchError } = await supabase.rpc(
      "match_faq",
      {
        query_embedding: questionEmbedding,
        match_count: 3,
        match_language: language,
      },
    );

    if (matchError) console.error("match_faq error", matchError);

    const topMatch = matches?.[0];
    if (topMatch && topMatch.distance < 0.3) {
      return new Response(
        JSON.stringify({ answer: topMatch.answer, language }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const faqContext = matches
      ?.map((m) => `Q: ${m.question}\nA: ${m.answer}`)
      .join("\n\n");

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPTS[language] },
    ];
    if (faqContext) {
      messages.push({
        role: "system",
        content: `FAQ context:\n${faqContext}`,
      });
    }
    messages.push({ role: "user", content: question });

    let answer: string;
    try {
      answer = language === "dv"
        ? await callGrok(messages)
        : await callOpenAI(messages);
    } catch (err) {
      if (language === "dv") {
        console.warn("Grok request failed, falling back to OpenAI", err);
        answer = await callOpenAI(messages);
      } else {
        throw err;
      }
    }

    const { error: insertError } = await supabase.from("faq_embeddings").insert(
      {
        question,
        answer,
        embedding: questionEmbedding,
        language,
      },
    );
    if (insertError) console.error("insert faq_embeddings", insertError);

    return new Response(JSON.stringify({ answer, language }), {
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
