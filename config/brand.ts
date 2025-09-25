export interface BrandIdentity {
  /** Full customer-facing brand name */
  readonly name: string;
  /** Short alias used for headlines and badges */
  readonly shortName: string;
  /** Two-letter mark used in avatars and OG cards */
  readonly abbreviation: string;
  /** Primary marketing domain without protocol */
  readonly domain: string;
  /** Primary positioning statement for metadata */
  readonly tagline: string;
  /** Extended description used across long-form copy */
  readonly description: string;
  /** Hero line describing value proposition */
  readonly heroDescription: string;
  /** Mission statement for about/landing copy */
  readonly mission: string;
}

export interface BrandSupport {
  /** Primary support email inbox */
  readonly email: string;
  /** Telegram handle for human desk escalations */
  readonly telegramHandle: string;
  /** Public URL for Telegram support channel */
  readonly telegramUrl: string;
}

export interface BrandSocialLink {
  readonly handle?: string;
  readonly url: string;
}

export interface BrandSocials {
  /** VIP automation bot exposed publicly */
  readonly telegramBot: BrandSocialLink;
  /** X (Twitter) presence */
  readonly x: BrandSocialLink;
  /** LinkedIn company profile */
  readonly linkedin: BrandSocialLink;
}

export interface BrandMetadata {
  readonly defaultTitle: string;
  readonly titleTemplate: string;
  readonly description: string;
}

export interface BrandDisclaimers {
  /** Trading risk disclaimer appended to assistant replies */
  readonly risk: string;
}

export interface BrandUrls {
  /** Canonical base URL with protocol */
  readonly base: string;
  /** Convenience URL for checkout flows */
  readonly checkout: string;
  /** mailto link for support */
  readonly supportEmail: string;
  /** Direct link to Telegram support */
  readonly supportTelegram: string;
}

export interface BrandMarketingCopy {
  readonly hero: {
    readonly badge: string;
    readonly badgeHighlight: string;
    readonly joinCta: string;
    readonly learnCta: string;
  };
  readonly newsletterTitle: string;
  readonly ctaDescription: string;
}

export interface BrandConfig {
  readonly identity: BrandIdentity;
  readonly support: BrandSupport;
  readonly socials: BrandSocials;
  readonly metadata: BrandMetadata;
  readonly disclaimers: BrandDisclaimers;
  readonly urls: BrandUrls;
  readonly marketing: BrandMarketingCopy;
}

const identity: BrandIdentity = {
  name: "Dynamic Capital",
  shortName: "Dynamic",
  abbreviation: "DC",
  domain: "dynamic.capital",
  tagline:
    "Dynamic Capital delivers institutional trading intelligence, mentorship, and automation for ambitious operators.",
  description:
    "Dynamic Capital blends clear education, human mentorship, and automation so operators always know the next step and can scale responsibly.",
  heroDescription:
    "Join thousands of successful traders with exclusive market insights, daily analysis, and premium investment opportunities.",
  mission:
    "Dynamic Capital pairs an institutional signal desk with automation guardrails so every member can graduate from guided practice to live execution with confidence.",
};

const support: BrandSupport = {
  email: "support@dynamic.capital",
  telegramHandle: "@DynamicCapital_Support",
  telegramUrl: "https://t.me/DynamicCapital_Support",
};

const socials: BrandSocials = {
  telegramBot: {
    handle: "@Dynamic_VIP_BOT",
    url: "https://t.me/Dynamic_VIP_BOT",
  },
  x: {
    handle: "@DynamicCapitalHQ",
    url: "https://x.com/dynamiccapitalhq",
  },
  linkedin: {
    url: "https://www.linkedin.com/company/dynamic-capital-ai/",
  },
};

const metadata: BrandMetadata = {
  defaultTitle: identity.name,
  titleTemplate: `%s | ${identity.name}`,
  description: identity.tagline,
};

const disclaimers: BrandDisclaimers = {
  risk: "Trading involves significant risk. Past performance does not guarantee future results. Only trade capital you can afford to lose.",
};

const urls: BrandUrls = {
  base: `https://${identity.domain}`,
  checkout: `https://${identity.domain}/checkout`,
  supportEmail: `mailto:${support.email}`,
  supportTelegram: support.telegramUrl,
};

const marketing: BrandMarketingCopy = {
  hero: {
    badge: "Premium Trading Platform",
    badgeHighlight: "Elite Trading Platform",
    joinCta: "Join VIP Now",
    learnCta: "Learn More",
  },
  newsletterTitle: `Stay in sync with ${identity.name}`,
  ctaDescription: `Join thousands of successful traders who trust ${identity.name} for premium signals and proven strategies.`,
};

export const brand: BrandConfig = {
  identity,
  support,
  socials,
  metadata,
  disclaimers,
  urls,
  marketing,
} as const;

export type { BrandConfig as DefaultBrandConfig };

export function brandUrl(path = "/"): string {
  if (!path) return urls.base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${urls.base.replace(/\/$/, "")}${normalizedPath}`;
}

export function brandSupportLine(): string {
  return `${brand.support.telegramHandle} • ${brand.support.email}`;
}

export function brandSignature(): string {
  return `${brand.identity.name} Desk`;
}
