"use client";

import { useQuery } from "@tanstack/react-query";

import {
  DEFAULT_DESK_PREVIEW_CARDS,
  type DeskPreviewCardResult,
  fetchDeskPreviewCards,
} from "@/services/deskPreviewCards";

export function useDeskPreviewCards() {
  const query = useQuery<DeskPreviewCardResult, Error>({
    queryKey: ["desk-preview-cards"],
    queryFn: () => fetchDeskPreviewCards(),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });

  const data = query.data;

  const cards = query.isLoading
    ? []
    : data?.cards ?? DEFAULT_DESK_PREVIEW_CARDS;

  const isFallback = query.isLoading
    ? false
    : query.isError || data?.isFallback === true;

  return {
    cards,
    isFallback,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
