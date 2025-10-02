export const TON_SITE_ORIGIN = "tonsite://dynamiccapital.ton";

export const PRODUCTION_ALLOWED_ORIGINS = [
  "https://dynamiccapital.ton",
  "https://www.dynamiccapital.ton",
  "https://dynamiccapital.to",
  "https://www.dynamiccapital.to",
  "https://dynamic-capital.ondigitalocean.app",
  "https://dynamic-capital-qazf2.ondigitalocean.app",
  "https://dynamic.capital",
  "https://dynamic-capital.vercel.app",
  "https://dynamic-capital.lovable.app",
  TON_SITE_ORIGIN,
];

export const PRODUCTION_ALLOWED_ORIGINS_STRING = PRODUCTION_ALLOWED_ORIGINS
  .join(",");
