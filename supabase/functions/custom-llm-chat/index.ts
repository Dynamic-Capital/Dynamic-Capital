import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Provider configurations
const PROVIDERS = {
  openai: {
    defaultUrl: "https://api.openai.com/v1/chat/completions",
    authHeader: (key: string) => ({ Authorization: `Bearer ${key}` }),
    supportsStreaming: true,
  },
  anthropic: {
    defaultUrl: "https://api.anthropic.com/v1/messages",
    authHeader: (key: string) => ({
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    }),
    supportsStreaming: true,
  },
  ollama: {
    defaultUrl: "http://localhost:11434/api/chat",
    authHeader: () => ({}),
    supportsStreaming: true,
  },
  lovable: {
    defaultUrl: "https://ai.gateway.lovable.dev/v1/chat/completions",
    authHeader: (key: string) => ({ Authorization: `Bearer ${key}` }),
    supportsStreaming: true,
  },
  custom: {
    defaultUrl: "",
    authHeader: (key: string) => ({ Authorization: `Bearer ${key}` }),
    supportsStreaming: true,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      messages,
      provider = "openai",
      model,
      stream = true,
      baseUrl,
      apiKey,
      sessionId,
      systemPrompt,
      temperature,
      maxTokens,
    } = await req.json();

    // Get Supabase client for chat history
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = supabaseUrl && supabaseKey
      ? createClient(supabaseUrl, supabaseKey)
      : null;

    // Determine API configuration
    const providerConfig = PROVIDERS[provider as keyof typeof PROVIDERS] ||
      PROVIDERS.custom;
    const apiUrl = baseUrl || Deno.env.get("CUSTOM_LLM_BASE_URL") ||
      providerConfig.defaultUrl;
    const apiKeyToUse = apiKey ||
      Deno.env.get("CUSTOM_LLM_API_KEY") ||
      Deno.env.get("OPENAI_API_KEY") ||
      Deno.env.get("LOVABLE_API_KEY") ||
      "";

    if (!apiUrl) {
      throw new Error(`No API URL configured for provider: ${provider}`);
    }

    // Build request body based on provider
    const requestBody: any = {
      model: model || Deno.env.get("CUSTOM_LLM_MODEL") || "gpt-5-2025-08-07",
      messages: systemPrompt
        ? [{ role: "system", content: systemPrompt }, ...messages]
        : messages,
      stream,
    };

    // Add parameters based on model and provider
    if (provider === "openai") {
      // GPT-5 and newer models use max_completion_tokens
      if (
        requestBody.model.includes("gpt-5") ||
        requestBody.model.includes("o3") || requestBody.model.includes("o4")
      ) {
        if (maxTokens) requestBody.max_completion_tokens = maxTokens;
        // Don't add temperature for these models
      } else {
        if (maxTokens) requestBody.max_tokens = maxTokens;
        if (temperature !== undefined) requestBody.temperature = temperature;
      }
    } else if (provider === "anthropic") {
      if (maxTokens) requestBody.max_tokens = maxTokens || 4096;
      if (temperature !== undefined) requestBody.temperature = temperature;
    } else {
      if (maxTokens) requestBody.max_tokens = maxTokens;
      if (temperature !== undefined) requestBody.temperature = temperature;
    }

    console.log(`Calling ${provider} API:`, {
      url: apiUrl,
      model: requestBody.model,
      stream,
    });

    // Make API request
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...providerConfig.authHeader(apiKeyToUse),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${provider} API error:`, response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again later.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Payment required. Please check your API credits.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          error: `API error: ${response.status}`,
          details: errorText,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // If streaming is enabled, return the stream directly
    if (stream) {
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Non-streaming response
    const data = await response.json();

    // Save to chat history if session provided
    if (sessionId && supabase) {
      const assistantMessage = provider === "anthropic"
        ? data.content[0].text
        : data.choices[0].message.content;

      await supabase.from("chat_messages").insert([
        {
          session_id: sessionId,
          role: "user",
          content: messages[messages.length - 1].content,
        },
        { session_id: sessionId, role: "assistant", content: assistantMessage },
      ]);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in custom-llm-chat:", error);
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
