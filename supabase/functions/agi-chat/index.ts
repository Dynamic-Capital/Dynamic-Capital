import { registerHandler } from "../_shared/serve.ts";
import { createClient } from "../_shared/client.ts";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequest {
  session_id?: string;
  message: string;
  history?: ChatMessage[];
}

registerHandler(async (req: Request): Promise<Response> => {
  const logger = createLogger({
    function: "agi-chat",
    requestId: crypto.randomUUID(),
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient("service");

    // Get authenticated user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token,
    );

    if (authError || !user) {
      logger.error("Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { session_id, message, history = [] }: ChatRequest = await req.json();

    // Get or create chat session
    let sessionId = session_id;
    if (!sessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: user.id,
          title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
        })
        .select()
        .single();

      if (sessionError) {
        logger.error("Failed to create session:", sessionError);
        return new Response(
          JSON.stringify({ error: "Failed to create chat session" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      sessionId = newSession.id;
    }

    // Save user message
    const { error: userMsgError } = await supabase
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        role: "user",
        content: message,
      });

    if (userMsgError) {
      logger.error("Failed to save user message:", userMsgError);
    }

    // Call Lovable AI Gateway
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      logger.error("Missing LOVABLE_API_KEY");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const agiMessages = [
      {
        role: "system",
        content:
          "You are Dynamic AGI, an intelligent trading assistant for Dynamic Capital. You help users with trading strategies, market analysis, and investment decisions.",
      },
      ...history,
      { role: "user", content: message },
    ];

    logger.info("Calling Lovable AI Gateway");
    const agiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: agiMessages,
        }),
      },
    );

    if (!agiResponse.ok) {
      const errorText = await agiResponse.text();
      logger.error("AGI API error:", agiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "AGI service error", details: errorText }),
        {
          status: agiResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const agiData = await agiResponse.json();
    const assistantMessage = agiData.choices?.[0]?.message?.content ||
      agiData.response || "No response from AGI";

    // Save assistant message
    const { error: assistantMsgError } = await supabase
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        role: "assistant",
        content: assistantMessage,
        metadata: { model: agiData.model, usage: agiData.usage },
      });

    if (assistantMsgError) {
      logger.error("Failed to save assistant message:", assistantMsgError);
    }

    logger.info("Chat completed successfully");

    return new Response(
      JSON.stringify({
        session_id: sessionId,
        message: assistantMessage,
        metadata: agiData.usage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    logger.error("Chat error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
