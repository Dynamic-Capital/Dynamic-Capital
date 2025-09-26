"use client";

import { useQuery } from "@tanstack/react-query";

import type { ProviderSummary } from "@/services/llm/types";

interface ProvidersResponse {
  providers?: ProviderSummary[] | null;
}

const QUERY_KEY = ["multi-llm-providers"] as const;

function normalizeProviders(
  providers: ProvidersResponse["providers"],
): ProviderSummary[] {
  if (!Array.isArray(providers)) {
    return [];
  }

  return providers.filter((provider): provider is ProviderSummary =>
    provider !== null && typeof provider === "object" &&
    typeof provider.id === "string" && provider.id.trim().length > 0
  );
}

async function fetchProviders(): Promise<ProviderSummary[]> {
  const response = await fetch("/api/tools/multi-llm/providers", {
    method: "GET",
    headers: { "accept": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load provider metadata (${response.status}).`);
  }

  const payload = (await response.json()) as ProvidersResponse;
  return normalizeProviders(payload.providers);
}

export function useMultiLlmProviders() {
  return useQuery<ProviderSummary[], Error>({
    queryKey: QUERY_KEY,
    queryFn: fetchProviders,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
