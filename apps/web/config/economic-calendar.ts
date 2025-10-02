import { optionalEnvVar } from "@/utils/env";

export const DEFAULT_ECONOMIC_CALENDAR_URL =
  "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

export function getEconomicCalendarUrl(): string {
  return optionalEnvVar("NEXT_PUBLIC_ECONOMIC_CALENDAR_URL", [
    "ECONOMIC_CALENDAR_URL",
  ]) ?? DEFAULT_ECONOMIC_CALENDAR_URL;
}

export function getEconomicCalendarApiKey(): string | undefined {
  return optionalEnvVar("NEXT_PUBLIC_ECONOMIC_CALENDAR_API_KEY", [
    "ECONOMIC_CALENDAR_API_KEY",
  ]);
}
