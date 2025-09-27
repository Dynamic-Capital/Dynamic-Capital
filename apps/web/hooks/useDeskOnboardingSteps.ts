"use client";

import { useQuery } from "@tanstack/react-query";

import {
  DEFAULT_DESK_ONBOARDING_STEPS,
  type DeskOnboardingStepResult,
  fetchDeskOnboardingSteps,
} from "@/services/deskOnboardingSteps";

export function useDeskOnboardingSteps() {
  const query = useQuery<DeskOnboardingStepResult, Error>({
    queryKey: ["desk-onboarding-steps"],
    queryFn: () => fetchDeskOnboardingSteps(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const data = query.data;

  const steps = query.isLoading
    ? []
    : data?.steps ?? DEFAULT_DESK_ONBOARDING_STEPS;

  const isFallback = query.isLoading
    ? false
    : query.isError || data?.isFallback === true;

  return {
    steps,
    isFallback,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
