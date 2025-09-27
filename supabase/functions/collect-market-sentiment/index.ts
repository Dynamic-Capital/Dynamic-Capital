import { getServiceClient } from "../_shared/client.ts";
import {
  corsHeaders,
  jsonResponse,
  methodNotAllowed,
} from "../_shared/http.ts";
import { createLogger } from "../_shared/logger.ts";
import { registerHandler } from "../_shared/serve.ts";

const FUNCTION_NAME = "collect-market-sentiment";
const ALTERNATIVE_ENDPOINT = "https://api.alternative.me/fng/";
const FINNHUB_ENDPOINT = "https://finnhub.io/api/v1/news-sentiment";
const REDDIT_BASE = "https://www.reddit.com";
const TWITTER_ENDPOINT = "https://api.twitter.com/2/tweets/search/recent";

interface SentimentSignal {
  source: string;
  symbol: string;
  sentiment: number;
  long_percent: number;
  short_percent: number;
  created_at: string;
}

interface FinnhubResponse {
  sentiment?: { bullishPercent?: number; bearishPercent?: number };
  companyNewsScore?: number;
}

interface RedditListing {
  data?: {
    children?:
      | Array<{ data?: { title?: string; selftext?: string } } | null>
      | null;
  } | null;
}

interface TwitterPayload {
  data?: Array<{ text?: string | null }> | null;
}

const BULLISH_KEYWORDS = ["bull", "breakout", "long", "buy", "call", "rally"];
const BEARISH_KEYWORDS = ["bear", "breakdown", "short", "sell", "put", "dump"];

function clampPercent(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 10000) / 10000));
}

function combineScores(
  bullish: number,
  bearish: number,
): { long: number; short: number } {
  const total = Math.max(bullish + bearish, 1);
  return {
    long: clampPercent(bullish / total * 100),
    short: clampPercent(bearish / total * 100),
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

async function fetchAlternative(
  logger: ReturnType<typeof createLogger>,
): Promise<SentimentSignal | null> {
  try {
    const response = await fetch(`${ALTERNATIVE_ENDPOINT}?limit=1`);
    if (!response.ok) {
      logger.warn("Alternative.me request failed", { status: response.status });
      return null;
    }
    const body = await response.json() as {
      data?: Array<{ value?: string; timestamp?: string }>;
    };
    const entry = body.data?.[0];
    if (!entry?.value) return null;
    const value = clampPercent(Number.parseFloat(entry.value));
    const timestamp =
      entry.timestamp && Number.isFinite(Number.parseInt(entry.timestamp, 10))
        ? new Date(Number.parseInt(entry.timestamp, 10) * 1000).toISOString()
        : nowIso();
    return {
      source: "alternative.me",
      symbol: "FNG",
      sentiment: value,
      long_percent: value,
      short_percent: clampPercent(100 - value),
      created_at: timestamp,
    };
  } catch (error) {
    logger.error("Failed to collect Alternative.me data", error);
    return null;
  }
}

function parseSymbolList(
  value: string | undefined,
  fallback: string[],
): string[] {
  if (!value) return fallback;
  return value.split(/[,\n]/).map((token) => token.trim()).filter((token) =>
    token.length > 0
  );
}

async function fetchFinnhub(
  logger: ReturnType<typeof createLogger>,
  symbols: string[],
): Promise<SentimentSignal[]> {
  const apiKey = Deno.env.get("FINNHUB_API_KEY");
  if (!apiKey) {
    logger.warn("FINNHUB_API_KEY missing; skipping Finnhub sentiment");
    return [];
  }
  const signals: SentimentSignal[] = [];
  for (const symbol of symbols) {
    try {
      const url = new URL(FINNHUB_ENDPOINT);
      url.searchParams.set("symbol", symbol);
      url.searchParams.set("token", apiKey);
      const response = await fetch(url.toString());
      if (!response.ok) {
        logger.warn("Finnhub request failed", {
          symbol,
          status: response.status,
        });
        continue;
      }
      const body = await response.json() as FinnhubResponse;
      const bullish = typeof body.sentiment?.bullishPercent === "number"
        ? clampPercent(body.sentiment.bullishPercent)
        : undefined;
      const bearish = typeof body.sentiment?.bearishPercent === "number"
        ? clampPercent(body.sentiment.bearishPercent)
        : undefined;
      let longPercent = bullish;
      let shortPercent = bearish;
      let sentiment = bullish ?? null;
      if (sentiment === null) {
        const score = typeof body.companyNewsScore === "number"
          ? clampPercent(body.companyNewsScore * 100)
          : 50;
        sentiment = score;
        if (longPercent === undefined) longPercent = score;
        if (shortPercent === undefined) {
          shortPercent = clampPercent(100 - score);
        }
      }
      if (longPercent === undefined) longPercent = sentiment ?? 50;
      if (shortPercent === undefined) {
        shortPercent = clampPercent(100 - longPercent);
      }
      signals.push({
        source: "finnhub",
        symbol,
        sentiment: sentiment ?? 50,
        long_percent: longPercent,
        short_percent: shortPercent,
        created_at: nowIso(),
      });
    } catch (error) {
      logger.error("Unexpected Finnhub error", { symbol, error });
    }
  }
  return signals;
}

function classify(text: string): { bull: number; bear: number } {
  const normalized = text.toLowerCase();
  const bull = BULLISH_KEYWORDS.some((keyword) => normalized.includes(keyword))
    ? 1
    : 0;
  const bear = BEARISH_KEYWORDS.some((keyword) => normalized.includes(keyword))
    ? 1
    : 0;
  return { bull, bear };
}

async function fetchReddit(
  logger: ReturnType<typeof createLogger>,
  symbols: string[],
): Promise<SentimentSignal[]> {
  const subreddits = parseSymbolList(Deno.env.get("REDDIT_SUBREDDITS"), [
    "wallstreetbets",
    "forex",
  ]);
  const signals: SentimentSignal[] = [];
  const posts: Array<{ title: string; selftext: string }> = [];
  const clientId = Deno.env.get("REDDIT_CLIENT_ID");
  const clientSecret = Deno.env.get("REDDIT_CLIENT_SECRET");
  let accessToken: string | null = null;
  if (clientId && clientSecret) {
    try {
      const basic = btoa(`${clientId}:${clientSecret}`);
      const tokenResponse = await fetch(
        "https://www.reddit.com/api/v1/access_token",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${basic}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": Deno.env.get("REDDIT_USER_AGENT") ??
              "dynamic-capital/1.0",
          },
          body: "grant_type=client_credentials",
        },
      );
      if (tokenResponse.ok) {
        const tokenBody = await tokenResponse.json() as {
          access_token?: string;
        };
        if (typeof tokenBody.access_token === "string") {
          accessToken = tokenBody.access_token;
        }
      } else {
        logger.warn("Reddit token request failed", {
          status: tokenResponse.status,
        });
      }
    } catch (error) {
      logger.error("Failed to negotiate Reddit token", error);
    }
  }
  for (const subreddit of subreddits) {
    try {
      const base = accessToken ? "https://oauth.reddit.com" : REDDIT_BASE;
      const path = accessToken
        ? `/r/${subreddit}/new`
        : `/r/${subreddit}/new.json`;
      const url = new URL(path, base);
      url.searchParams.set("limit", Deno.env.get("REDDIT_LIMIT") ?? "50");
      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent": Deno.env.get("REDDIT_USER_AGENT") ??
            "dynamic-capital/1.0",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      if (!response.ok) {
        logger.warn("Reddit request failed", {
          subreddit,
          status: response.status,
        });
        continue;
      }
      const body = await response.json() as RedditListing;
      const children = body.data?.children ?? [];
      for (const child of children) {
        const title = child?.data?.title ?? "";
        const selftext = child?.data?.selftext ?? "";
        posts.push({ title, selftext });
      }
    } catch (error) {
      logger.error("Unexpected Reddit error", { subreddit, error });
    }
  }
  if (posts.length === 0) {
    return signals;
  }
  for (const symbol of symbols) {
    let bullish = 0;
    let bearish = 0;
    let mentions = 0;
    const token = symbol.toUpperCase();
    for (const post of posts) {
      const content = `${post.title} ${post.selftext}`;
      const upper = content.toUpperCase();
      if (!upper.includes(token) && !upper.includes(`$${token}`)) {
        continue;
      }
      mentions += 1;
      const { bull, bear } = classify(content);
      bullish += bull;
      bearish += bear;
    }
    if (mentions === 0) continue;
    const { long, short } = combineScores(bullish, bearish);
    const sentiment = long > 0 ? long : 50;
    signals.push({
      source: "reddit",
      symbol,
      sentiment,
      long_percent: long,
      short_percent: short,
      created_at: nowIso(),
    });
  }
  return signals;
}

async function fetchTwitter(
  logger: ReturnType<typeof createLogger>,
  symbols: string[],
): Promise<SentimentSignal[]> {
  const bearer = Deno.env.get("TWITTER_BEARER_TOKEN");
  if (!bearer) {
    logger.warn("TWITTER_BEARER_TOKEN missing; skipping Twitter sentiment");
    return [];
  }
  const query = Deno.env.get("TWITTER_SENTIMENT_QUERY") ??
    "(forex OR crypto) lang:en";
  try {
    const url = new URL(TWITTER_ENDPOINT);
    url.searchParams.set("query", query);
    url.searchParams.set("max_results", Deno.env.get("TWITTER_LIMIT") ?? "50");
    url.searchParams.set("tweet.fields", "created_at,text");
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${bearer}` },
    });
    if (!response.ok) {
      logger.warn("Twitter request failed", { status: response.status });
      return [];
    }
    const body = await response.json() as TwitterPayload;
    const tweets = body.data ?? [];
    const signals: SentimentSignal[] = [];
    for (const symbol of symbols) {
      let bullish = 0;
      let bearish = 0;
      let mentions = 0;
      const token = symbol.toUpperCase();
      for (const tweet of tweets) {
        const text = tweet?.text ?? "";
        const upper = text.toUpperCase();
        if (!upper.includes(token) && !upper.includes(`$${token}`)) {
          continue;
        }
        mentions += 1;
        const { bull, bear } = classify(text);
        bullish += bull;
        bearish += bear;
      }
      if (mentions === 0) continue;
      const { long, short } = combineScores(bullish, bearish);
      const sentiment = long > 0 ? long : 50;
      signals.push({
        source: "twitter",
        symbol,
        sentiment,
        long_percent: long,
        short_percent: short,
        created_at: nowIso(),
      });
    }
    return signals;
  } catch (error) {
    logger.error("Unexpected Twitter error", error);
    return [];
  }
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
    const symbols = parseSymbolList(
      Deno.env.get("SENTIMENT_SYMBOLS"),
      ["BTCUSD", "ETHUSD", "EURUSD"],
    );
    const collected: SentimentSignal[] = [];
    const alternative = await fetchAlternative(logger);
    if (alternative) collected.push(alternative);
    collected.push(...await fetchFinnhub(logger, symbols));
    collected.push(...await fetchReddit(logger, symbols));
    collected.push(...await fetchTwitter(logger, symbols));

    if (collected.length === 0) {
      return jsonResponse({ inserted: 0 }, { status: 200 }, req);
    }

    const supabase = getServiceClient();
    const { error } = await supabase
      .from("sentiment")
      .upsert(collected, { onConflict: "source,symbol" });
    if (error) {
      logger.error("Failed to upsert sentiment rows", error);
      return jsonResponse({ message: "failed_to_store_sentiment" }, {
        status: 500,
      }, req);
    }

    logger.info("Persisted sentiment signals", { count: collected.length });
    return jsonResponse({ inserted: collected.length }, { status: 200 }, req);
  } catch (error) {
    logger.error("Unexpected error in collect-market-sentiment", error);
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ message }, { status: 500 }, req);
  }
});

export default handler;
