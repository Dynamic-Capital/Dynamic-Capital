import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { optionalEnv } from "../_shared/env.ts";
import { json, mna } from "../_shared/http.ts";
import { version } from "../_shared/version.ts";
import { registerHandler } from "../_shared/serve.ts";

const OPENAI_API_KEY = optionalEnv("OPENAI_API_KEY");
const OPENAI_BASE_URL = optionalEnv("OPENAI_BASE_URL") ??
  "https://api.openai.com/v1";

const ensureTrailingSlash = (value: string) =>
  value.endsWith("/") ? value : `${value}/`;

const chatCompletionsUrl = new URL(
  "chat/completions",
  ensureTrailingSlash(OPENAI_BASE_URL),
).toString();

const buildOpenAIHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (OPENAI_API_KEY) {
    headers["Authorization"] = `Bearer ${OPENAI_API_KEY}`;
  }
  return headers;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return json({}, 200, corsHeaders);
  }
  const v = version(req, "trade-helper");
  if (v) return v;
  if (req.method !== "POST") return mna();

  try {
    const { instrument, command, context: _context, test } = await req
      .json()
      .catch(() => ({}));

    if (test) {
      return json(
        { success: true, message: "trade-helper OK" },
        200,
        corsHeaders,
      );
    }

    if (!instrument) {
      return json({ error: "Instrument is required" }, 400, corsHeaders);
    }

    const systemPrompt =
      `You are a professional trading analyst providing educational market analysis for Dynamic Capital.

CRITICAL DISCLAIMERS:
- This is EDUCATIONAL content only, NOT financial advice
- Trading involves significant risk of loss
- Past performance doesn't guarantee future results
- Users should do their own research and risk management

ANALYSIS FRAMEWORK:
- Provide technical analysis insights
- Discuss market fundamentals when relevant
- Include both bullish and bearish scenarios
- Mention key support/resistance levels if applicable
- Discuss risk factors and considerations
- Keep educational and objective

INSTRUMENTS WE COVER:
- XAUUSD (Gold)
- EURUSD, GBPUSD, USDJPY (Major Forex)
- Oil, Silver, major indices
- Cryptocurrencies (Bitcoin, Ethereum)

FORMAT REQUIREMENTS:
- Start with current market context
- Provide educational technical view
- Include risk considerations
- End with educational summary
- Use trading emojis appropriately
- Keep under 400 words

Always include: "⚠️ This is educational analysis only. Always use proper risk management and consider your financial situation before trading."`;

    const userPrompt =
      `Provide an educational trading analysis for ${instrument.toUpperCase()}.

Command context: ${command}

Please analyze:
1. Current market sentiment and context
2. Key technical levels to watch
3. Potential scenarios (both bullish and bearish)
4. Important risk factors
5. Educational trading considerations

Remember to keep this educational and include proper risk disclaimers.`;

    const response = await fetch(chatCompletionsUrl, {
      method: "POST",
      headers: buildOpenAIHeaders(),
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 600,
        temperature: 0.6,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "AI service error");
    }

    const analysis = data.choices[0].message.content;

    return json({ analysis }, 200, corsHeaders);
  } catch (error) {
    console.error("Error in trade-helper function:", error);
    return json(
      {
        error: "Failed to get trading analysis",
        details: (error as Error).message,
      },
      500,
      corsHeaders,
    );
  }
}

registerHandler(handler);

export default handler;
