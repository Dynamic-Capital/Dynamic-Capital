import { getServiceClient } from "../_shared/client.ts";
import {
  corsHeaders,
  jsonResponse,
  methodNotAllowed,
} from "../_shared/http.ts";
import { createLogger } from "../_shared/logger.ts";
import { registerHandler } from "../_shared/serve.ts";

const FUNCTION_NAME = "collect-market-news";
const NEWSAPI_ENDPOINT = "https://newsapi.org/v2/top-headlines";

interface NewsApiArticle {
  title?: string | null;
  description?: string | null;
  author?: string | null;
  source?: { name?: string | null } | null;
  publishedAt?: string | null;
}

interface MarketHeadline {
  id: number;
  source: string;
  headline: string;
  event_time: string;
  impact: string | null;
  currency: string | null;
  forecast: string | null;
  actual: string | null;
  created_at: string;
}

function stableHeadlineId(
  source: string,
  headline: string,
  publishedAt: string,
) {
  const data = `${source}|${headline}|${publishedAt}`;
  let hash = 1469598103934665603n;
  const prime = 1099511628211n;
  for (let i = 0; i < data.length; i++) {
    hash ^= BigInt(data.charCodeAt(i));
    hash = (hash * prime) & 0xffffffffffffffffn;
  }
  return Number(hash);
}

function clampImpact(article: NewsApiArticle): string | null {
  const title = article.title?.toLowerCase() ?? "";
  if (
    title.includes("surge") || title.includes("plunge") ||
    title.includes("crash")
  ) {
    return "high";
  }
  if (title.includes("steady") || title.includes("flat")) {
    return "low";
  }
  return "medium";
}

function parsePublishedAt(article: NewsApiArticle): string | null {
  if (!article.publishedAt) return null;
  try {
    return new Date(article.publishedAt).toISOString();
  } catch {
    return null;
  }
}

function mapArticle(article: NewsApiArticle): MarketHeadline | null {
  const publishedAt = parsePublishedAt(article);
  const title = article.title?.trim();
  if (!publishedAt || !title) {
    return null;
  }
  const source = article.source?.name?.trim() || article.author?.trim() ||
    "newsapi";
  const id = stableHeadlineId(source, title, publishedAt);
  return {
    id,
    source,
    headline: title,
    event_time: publishedAt,
    impact: clampImpact(article),
    currency: null,
    forecast: null,
    actual: null,
    created_at: new Date().toISOString(),
  };
}

async function fetchTopHeadlines(logger: ReturnType<typeof createLogger>) {
  const apiKey = Deno.env.get("NEWSAPI_API_KEY");
  if (!apiKey) {
    logger.warn("NEWSAPI_API_KEY missing; skipping market news collection");
    return [] as MarketHeadline[];
  }
  const params = new URLSearchParams({
    category: Deno.env.get("NEWSAPI_CATEGORY") ?? "business",
    language: Deno.env.get("NEWSAPI_LANGUAGE") ?? "en",
    pageSize: Deno.env.get("NEWSAPI_PAGE_SIZE") ?? "50",
  });
  const url = `${NEWSAPI_ENDPOINT}?${params.toString()}`;
  const response = await fetch(url, {
    headers: { "X-Api-Key": apiKey },
  });
  if (!response.ok) {
    logger.error("NewsAPI request failed", {
      status: response.status,
      statusText: response.statusText,
    });
    return [] as MarketHeadline[];
  }
  const body = await response.json() as { articles?: NewsApiArticle[] | null };
  const articles = Array.isArray(body.articles) ? body.articles : [];
  return articles
    .map((article) => mapArticle(article))
    .filter((headline): headline is MarketHeadline => headline !== null);
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders(req, "GET,POST,OPTIONS") },
    });
  }
  if (req.method !== "POST" && req.method !== "GET") {
    return methodNotAllowed(req);
  }
  const logger = createLogger({
    function: FUNCTION_NAME,
    requestId: req.headers.get("sb-request-id") ||
      req.headers.get("x-request-id") ||
      crypto.randomUUID(),
  });
  try {
    const headlines = await fetchTopHeadlines(logger);
    if (headlines.length === 0) {
      return jsonResponse({ inserted: 0 }, { status: 200 }, req);
    }
    const supabase = getServiceClient();
    const { error } = await supabase
      .from("market_news")
      .upsert(headlines, { onConflict: "id" });
    if (error) {
      logger.error("Failed to upsert market news", error);
      return jsonResponse({ message: "failed_to_store_market_news" }, {
        status: 500,
      }, req);
    }
    logger.info("Persisted market news", { count: headlines.length });
    return jsonResponse({ inserted: headlines.length }, { status: 200 }, req);
  } catch (error) {
    logger.error("Unexpected error in collect-market-news", error);
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ message }, { status: 500 }, req);
  }
});

export default handler;
