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

export const PUBLIC_API_ENDPOINTS: readonly PublicApiEndpointDescriptor[] = [
  {
    method: "GET",
    path: "/api/dynamic-rest",
    description:
      "Aggregate trading instruments, bond yields, market advisories, and Dex Screener telemetry in one payload.",
  },
  {
    method: "GET",
    path: "/api/dynamic-rest/resources/:slug",
    description:
      "Retrieve a focused Dynamic REST resource such as open-source catalogs or trading desk snapshots.",
  },
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
