export const CTA_LINKS = {
  telegram: "https://t.me/dynamiccapital",
  invest: "https://app.dynamic.capital",
} as const;

export const LANDING_SECTION_IDS = {
  hero: "hero",
  highlights: "highlights",
  rhythm: "rhythm",
  stakeholders: "stakeholders",
  join: "join",
} as const;

export type LandingSectionId =
  (typeof LANDING_SECTION_IDS)[keyof typeof LANDING_SECTION_IDS];
