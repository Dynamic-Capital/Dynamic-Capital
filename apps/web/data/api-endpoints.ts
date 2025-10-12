export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"
  | "HEAD";

export interface PublicApiEndpointDescriptor {
  readonly method: HttpMethod;
  readonly path: string;
  readonly description: string;
}

const DYNAMIC_REST_RESOURCES: readonly PublicApiEndpointDescriptor[] = [
  {
    method: "GET",
    path: "/api/dynamic-rest/resources/instruments",
    description:
      "List curated trading instruments grouped by asset class with sample coverage across FX and commodities.",
  },
  {
    method: "GET",
    path: "/api/dynamic-rest/resources/trading-desk",
    description:
      "Fetch trading desk plan snapshots, including execution context, confidence, and risk bands.",
  },
  {
    method: "GET",
    path: "/api/dynamic-rest/resources/bond-yields",
    description:
      "Summaries of sovereign yield coverage, supported tenors, and data-feed capabilities.",
  },
  {
    method: "GET",
    path: "/api/dynamic-rest/resources/open-source",
    description:
      "Catalog of Dynamic Capital open-source helpers, adapters, toolkits, and language models.",
  },
  {
    method: "GET",
    path: "/api/dynamic-rest/resources/market-advisories",
    description:
      "Narrative advisories synthesising desk bias, automation cues, and hedge notes for partners.",
  },
  {
    method: "GET",
    path: "/api/dynamic-rest/resources/dex-screener",
    description:
      "Latest Dex Screener token profiles and boost activity summaries for TON market monitoring.",
  },
] as const;

export const PUBLIC_API_ENDPOINTS: readonly PublicApiEndpointDescriptor[] = [
  {
    method: "GET",
    path: "/api/dynamic-rest",
    description:
      "Retrieve aggregated Dynamic Capital datasets for public consumption with cache-aware headers.",
  },
  ...DYNAMIC_REST_RESOURCES,
  {
    method: "GET",
    path: "/api/dex-screener",
    description:
      "Mirror the latest TON token profiles and boost activity from Dex Screener with cache-friendly metadata.",
  },
  {
    method: "POST",
    path: "/api/dynamic-ai/chat",
    description:
      "Authenticated co-pilot conversations that sync Telegram, admin desk, and Supabase interaction history.",
  },
  {
    method: "POST",
    path: "/api/dynamic-ai/voice-to-text",
    description:
      "Transcribe Telegram voice notes into Supabase-ready transcripts with Dynamic AI safeguards.",
  },
  {
    method: "GET",
    path: "/api/tonconnect/manifest",
    description:
      "Serve the TonConnect manifest powering wallet onboarding across the Telegram Mini App.",
  },
] as const;
