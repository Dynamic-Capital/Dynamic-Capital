import { getServiceClient } from "../_shared/client.ts";
import {
  corsHeaders,
  jsonResponse,
  methodNotAllowed,
} from "../_shared/http.ts";
import { createLogger } from "../_shared/logger.ts";
import { registerHandler } from "../_shared/serve.ts";

const FUNCTION_NAME = "fundamental-positioning-highlights";
const DEFAULT_LIMIT = 8;

interface FundamentalRow {
  id: string;
  asset: string;
  sector: string;
  positioning: string;
  summary: string;
  catalysts: string[] | null;
  risk_controls: string;
  metrics: Array<{ label: string; value: string }> | null;
  updated_at: string;
}

interface FundamentalHighlight {
  id: string;
  asset: string;
  sector: string;
  positioning: string;
  summary: string;
  catalysts: string[];
  riskControls: string;
  metrics: Array<{ label: string; value: string }>;
  updatedAt: string;
}

function mapRow(row: FundamentalRow): FundamentalHighlight | null {
  if (!row?.id || !row.asset) {
    return null;
  }
  return {
    id: row.id,
    asset: row.asset,
    sector: row.sector,
    positioning: row.positioning,
    summary: row.summary,
    catalysts: row.catalysts ?? [],
    riskControls: row.risk_controls,
    metrics: row.metrics ?? [],
    updatedAt: row.updated_at,
  };
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders(req, "GET,OPTIONS"),
        "access-control-max-age": "86400",
      },
    });
  }

  if (req.method !== "GET") {
    return methodNotAllowed(req);
  }

  const logger = createLogger({
    function: FUNCTION_NAME,
    requestId: req.headers.get("sb-request-id") ||
      req.headers.get("x-request-id") ||
      crypto.randomUUID(),
  });

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("fundamental_positioning")
      .select(
        "id, asset, sector, positioning, summary, catalysts, risk_controls, metrics, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(DEFAULT_LIMIT);

    if (error) {
      logger.error("Failed to load fundamental positioning highlights", error);
      return jsonResponse({ error: "failed_to_load_fundamental_positioning" }, {
        status: 500,
        headers: corsHeaders(req, "GET,OPTIONS"),
      });
    }

    const payload = (data ?? [])
      .map(mapRow)
      .filter((entry): entry is FundamentalHighlight => entry !== null);

    return jsonResponse({ data: payload }, {
      status: 200,
      headers: corsHeaders(req, "GET,OPTIONS"),
    });
  } catch (error) {
    logger.error(
      "Unexpected error in fundamental-positioning-highlights",
      error,
    );
    return jsonResponse({ error: "unexpected_error" }, {
      status: 500,
      headers: corsHeaders(req, "GET,OPTIONS"),
    });
  }
});
