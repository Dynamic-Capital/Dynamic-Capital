import { registerHandler } from "../_shared/serve.ts";
import { createLogger } from "../_shared/logger.ts";
import {
  buildAgsSystemPrompt,
  buildDynamicAgsPlaybook,
  type BuildPlaybookOptions,
  type PlaybookPayload,
} from "../_shared/ags-playbook.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PlaybookResponse extends PlaybookPayload {
  system_prompt: string;
}

function respondJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

registerHandler(async (req: Request): Promise<Response> => {
  const logger = createLogger({
    function: "dynamic-ags-playbook",
    requestId: crypto.randomUUID(),
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return respondJson({ error: "Method not allowed" }, 405);
    }

    let options: BuildPlaybookOptions = {};

    if (req.method === "GET") {
      const url = new URL(req.url);
      options.language = url.searchParams.get("language");
    } else {
      options = await req.json() as BuildPlaybookOptions;
    }

    const payload = buildDynamicAgsPlaybook(options);
    const response: PlaybookResponse = {
      ...payload,
      system_prompt: buildAgsSystemPrompt(payload),
    };

    logger.info("Playbook generated", {
      language: response.language,
      entries: response.entries.length,
    });

    return respondJson(response);
  } catch (error) {
    logger.error("Failed to build AGS playbook", error);

    if (
      error instanceof Error && error.message.includes("Unsupported language")
    ) {
      return respondJson({ error: error.message }, 400);
    }

    return respondJson({
      error: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});
