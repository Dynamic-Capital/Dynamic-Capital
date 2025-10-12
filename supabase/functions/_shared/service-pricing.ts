function log1p(value: number): number {
  return Math.log1p(value);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

class SeededRandom {
  private state: number;

  constructor(seed?: number | null) {
    if (typeof seed === "number" && Number.isFinite(seed)) {
      this.state = seed >>> 0;
    } else {
      const buffer = new Uint32Array(1);
      crypto.getRandomValues(buffer);
      this.state = buffer[0] ?? 0;
    }
  }

  next(): number {
    // Mulberry32 PRNG – fast and deterministic for seeded usage.
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  choice<T>(values: readonly T[]): T {
    if (values.length === 0) {
      throw new Error("Cannot choose from an empty sequence");
    }
    const index = Math.floor(this.next() * values.length);
    return values[index]!;
  }

  shuffle<T>(values: T[]): void {
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
  }
}

const BASE_PERKS = [
  "Concierge onboarding",
  "Priority customer support",
  "Dedicated account strategist",
  "Quarterly business reviews",
  "Early access to features",
  "Exclusive event invitations",
  "White-glove migration",
  "Custom analytics dashboard",
  "Advanced security reporting",
  "Flexible contract terms",
  "Service-level guarantee upgrade",
] as const;

const VIP_TIER_NAMES = [
  "Insider",
  "Elite",
  "Premier",
  "Executive",
  "Signature",
  "Legend",
] as const;

const MENTORSHIP_TIERS = [
  "Focus Sprint",
  "Growth Pod",
  "Transformation Studio",
  "Mentor Council",
] as const;

const MENTORSHIP_SUPPORT_LEVELS = [
  "48h turnaround",
  "Next-day strategist",
  "Same-day strategist",
  "Embedded operator",
] as const;

const MENTORSHIP_RESOURCES = [
  "Accountability dashboard",
  "Weekly office hours",
  "Voice note reviews",
  "Trade journal audits",
  "Systems blueprint library",
  "Personalised roadmap",
  "Live cohort workshops",
] as const;

const PROMO_NAMES = [
  "Launch Surge",
  "Loyalty Boost",
  "Win-back Revival",
  "Seasonal Spotlight",
] as const;

const PROMO_SEGMENTS = [
  "New signups",
  "VIP alumni",
  "Dormant accounts",
  "Community advocates",
] as const;

export interface VipPackage {
  name: string;
  price: number;
  perks: string[];
  promoCode: string;
  discountPct: number;
}

export interface MentorshipPackage {
  name: string;
  sessions: number;
  price: number;
  mentorHours: number;
  asyncSupport: string;
  resources: string[];
  promoCode: string;
  discountPct: number;
}

export interface PromoIncentive {
  name: string;
  price: number;
  promoCode: string;
  discountPct: number;
  durationDays: number;
  targetSegment: string;
}

export interface PricingBlueprintSummary {
  vip: string;
  mentorship: string[];
  promos: string[];
}

export interface PricingBlueprint {
  vipPackages: VipPackage[];
  mentorshipPackages: MentorshipPackage[];
  promoOffers: PromoIncentive[];
  analytics: {
    vipAveragePrice: number;
    mentorshipAveragePrice: number;
    strongestPromoCode: string;
    strongestPromoDiscount: number;
  };
  summary: PricingBlueprintSummary;
}

interface VipConfig {
  basePrice: number;
  tiers: number;
  demandIndex: number;
  loyaltyScore: number;
  churnRisk: number;
  seed?: number | null;
}

interface MentorshipConfig {
  baseSessionRate: number;
  programWeeks: number;
  sessionsPerWeek: number;
  mentorExperience: number;
  menteeIntensity: number;
  loyaltyScore: number;
  tiers: number;
  seed?: number | null;
}

interface PromoConfig {
  basePrice: number;
  urgencyIndex: number;
  loyaltyScore: number;
  inventoryPressure: number;
  count: number;
  seed?: number | null;
}

interface BlueprintConfig {
  vip: VipConfig;
  mentorship: MentorshipConfig;
  promo: PromoConfig;
  seed?: number | null;
}

function pickVipName(index: number): string {
  if (index < VIP_TIER_NAMES.length) return VIP_TIER_NAMES[index]!;
  return `Tier ${index + 1}`;
}

function generateCode(
  name: string,
  rng: SeededRandom,
  discountPct: number,
  tokenPool: readonly string[] = ["VIP", "GROK", "XAI"],
  uniqueHint?: number | string | null,
): string {
  const source = uniqueHint === undefined || uniqueHint === null
    ? name
    : `${name}:${uniqueHint}`;
  const checksum = Math.floor(
    ([...source].reduce((sum, char) => sum + char.charCodeAt(0), 0) *
      (discountPct + 1)) % 997,
  );
  const suffix = checksum.toString().padStart(3, "0");
  const token = rng.choice(tokenPool);
  return `${token}-${name.slice(0, 3).toUpperCase()}-${suffix}`;
}

function scaleVipPrice(
  basePrice: number,
  tierIndex: number,
  demandIndex: number,
  loyaltyScore: number,
  churnRisk: number,
): number {
  const ladder = 1 + tierIndex * 0.35;
  const demandFactor = 1 + clamp(demandIndex, -1, 2) * 0.25;
  const loyaltyBoost = 1 + clamp(loyaltyScore, 0, 1) * 0.15;
  const churnModifier = 1 - clamp(churnRisk, 0, 1) * 0.2;
  const exploratoryMarkup = 1 + log1p(tierIndex) * 0.05;
  const price = basePrice * ladder * demandFactor * loyaltyBoost *
    churnModifier *
    exploratoryMarkup;
  return round(price, 2);
}

function pickPerks(rng: SeededRandom, tierIndex: number): string[] {
  const perkCount = Math.min(BASE_PERKS.length, 3 + tierIndex);
  const choices = [...BASE_PERKS];
  rng.shuffle(choices);
  return choices.slice(0, perkCount).sort();
}

function vipDiscount(
  tierIndex: number,
  loyaltyScore: number,
  churnRisk: number,
): number {
  const base = 0.05 + tierIndex * 0.02;
  const loyaltyBonus = clamp(loyaltyScore, 0, 1) * 0.05;
  const churnBonus = clamp(churnRisk, 0, 1) * 0.03;
  return round(clamp(base + loyaltyBonus + churnBonus, 0, 0.35), 3);
}

function normaliseInt(value: number, minimum: number): number {
  const parsed = Math.trunc(value);
  if (!Number.isFinite(parsed) || parsed < minimum) {
    throw new Error(`value must be at least ${minimum}`);
  }
  return parsed;
}

function mentorshipSessionCount(
  programWeeks: number,
  sessionsPerWeek: number,
  tierIndex: number,
): number {
  const baseSessions = programWeeks * sessionsPerWeek;
  const multiplier = 1 + tierIndex * 0.35;
  return Math.max(1, Math.ceil(baseSessions * multiplier));
}

function mentorshipDiscount(
  tierIndex: number,
  loyaltyScore: number,
  mentorExperience: number,
): number {
  const base = 0.04 + tierIndex * 0.015;
  const loyalty = clamp(loyaltyScore, 0, 1) * 0.04;
  const experience = clamp(mentorExperience, 0, 1) * 0.02;
  return round(clamp(base + loyalty + experience, 0, 0.25), 3);
}

export function generateVipPackages(config: VipConfig): VipPackage[] {
  const { basePrice, tiers, demandIndex, loyaltyScore, churnRisk, seed } =
    config;

  if (!(basePrice > 0)) {
    throw new Error("`basePrice` must be positive");
  }
  const tierCount = normaliseInt(tiers, 1);
  const rng = new SeededRandom(seed);

  const packages: VipPackage[] = [];
  for (let tierIndex = 0; tierIndex < tierCount; tierIndex++) {
    const name = pickVipName(tierIndex);
    const price = scaleVipPrice(
      basePrice,
      tierIndex,
      demandIndex,
      loyaltyScore,
      churnRisk,
    );
    const discount = vipDiscount(tierIndex, loyaltyScore, churnRisk);
    const promoCode = generateCode(
      name,
      rng,
      discount,
      ["VIP", "GROK", "XAI"],
      tierIndex,
    );
    packages.push({
      name,
      price,
      perks: pickPerks(rng, tierIndex),
      promoCode,
      discountPct: discount,
    });
  }
  return packages;
}

export function describePackages(packages: readonly VipPackage[]): string {
  return packages.map((pkg) => {
    const discountPercent = Math.round(pkg.discountPct * 100);
    return `${pkg.name}: $${
      pkg.price.toFixed(2)
    } | ${discountPercent}% off | Promo ${pkg.promoCode} | Perks: ${
      pkg.perks.join(", ")
    }`;
  }).join("\n");
}

export function generateMentorshipPackages(
  config: MentorshipConfig,
): MentorshipPackage[] {
  const {
    baseSessionRate,
    programWeeks,
    sessionsPerWeek,
    mentorExperience,
    menteeIntensity,
    loyaltyScore,
    tiers,
    seed,
  } = config;

  if (!(baseSessionRate > 0)) {
    throw new Error("`baseSessionRate` must be positive");
  }

  const tierCount = normaliseInt(tiers, 1);
  const weeks = normaliseInt(programWeeks, 1);
  const sessions = normaliseInt(sessionsPerWeek, 1);
  const rng = new SeededRandom(seed);

  const mentorMultiplier = 1 + clamp(mentorExperience, 0, 1) * 0.4;
  const intensityMultiplier = 1 + clamp(menteeIntensity, 0, 1) * 0.3;

  const packages: MentorshipPackage[] = [];
  for (let tierIndex = 0; tierIndex < tierCount; tierIndex++) {
    const name = tierIndex < MENTORSHIP_TIERS.length
      ? MENTORSHIP_TIERS[tierIndex]!
      : `Mentorship Tier ${tierIndex + 1}`;

    const totalSessions = mentorshipSessionCount(weeks, sessions, tierIndex);
    const mentorHours = round(totalSessions * mentorMultiplier * 1.2, 1);

    const grossPrice = baseSessionRate * totalSessions * mentorMultiplier *
      intensityMultiplier * (1 + tierIndex * 0.18);

    const discount = mentorshipDiscount(
      tierIndex,
      loyaltyScore,
      mentorExperience,
    );

    const netPrice = round(grossPrice * (1 - discount), 2);
    const support = MENTORSHIP_SUPPORT_LEVELS[
      Math.min(tierIndex, MENTORSHIP_SUPPORT_LEVELS.length - 1)
    ]!;

    const resources = [...MENTORSHIP_RESOURCES];
    rng.shuffle(resources);
    const selectedResources = resources
      .slice(0, Math.min(3 + tierIndex, resources.length))
      .sort();

    const promoCode = generateCode(
      name,
      rng,
      discount,
      ["MNT", "COH", "GDL"],
      tierIndex,
    );

    packages.push({
      name,
      sessions: totalSessions,
      price: netPrice,
      mentorHours,
      asyncSupport: support,
      resources: selectedResources,
      promoCode,
      discountPct: discount,
    });
  }

  return packages;
}

export function generatePromoIncentives(
  config: PromoConfig,
): PromoIncentive[] {
  const {
    basePrice,
    urgencyIndex,
    loyaltyScore,
    inventoryPressure,
    count,
    seed,
  } = config;

  if (!(basePrice > 0)) {
    throw new Error("`basePrice` must be positive");
  }

  const offerCount = normaliseInt(count, 1);
  const rng = new SeededRandom(seed);

  const urgency = clamp(urgencyIndex, 0, 1);
  const loyalty = clamp(loyaltyScore, 0, 1);
  const pressure = clamp(inventoryPressure, 0, 1);

  const offers: PromoIncentive[] = [];
  for (let tierIndex = 0; tierIndex < offerCount; tierIndex++) {
    const name = PROMO_NAMES[tierIndex % PROMO_NAMES.length]!;
    const pace = 1 + tierIndex * 0.1;
    let discount = 0.05 + loyalty * 0.05;
    discount += urgency * 0.04 * pace;
    discount += pressure * 0.03;
    discount = round(clamp(discount, 0.02, 0.4), 3);

    const price = round(basePrice * (1 - discount), 2);
    const durationDays = Math.max(1, Math.round(5 - tierIndex + urgency * 3));
    const targetSegment = PROMO_SEGMENTS[tierIndex % PROMO_SEGMENTS.length]!;

    const promoCode = generateCode(
      name,
      rng,
      discount,
      ["PRM", "BND", "VIP"],
      tierIndex,
    );

    offers.push({
      name,
      price,
      promoCode,
      discountPct: discount,
      durationDays,
      targetSegment,
    });
  }

  return offers;
}

export function buildPricingBlueprint(
  config: BlueprintConfig,
): PricingBlueprint {
  const { vip, mentorship, promo, seed } = config;
  const rng = new SeededRandom(seed);

  const deriveSeed = () =>
    seed != null ? Math.floor(rng.next() * 2 ** 32) : null;

  const vipPackages = generateVipPackages({ ...vip, seed: deriveSeed() });
  const mentorshipPackages = generateMentorshipPackages({
    ...mentorship,
    seed: deriveSeed(),
  });
  const promoOffers = generatePromoIncentives({ ...promo, seed: deriveSeed() });

  const vipAveragePrice = vipPackages.length
    ? round(
      vipPackages.reduce((sum, pkg) => sum + pkg.price, 0) / vipPackages.length,
      2,
    )
    : 0;

  const mentorshipAveragePrice = mentorshipPackages.length
    ? round(
      mentorshipPackages.reduce((sum, pkg) => sum + pkg.price, 0) /
        mentorshipPackages.length,
      2,
    )
    : 0;

  const strongestPromo = promoOffers.reduce<PromoIncentive | null>(
    (best, current) => {
      if (!best) return current;
      return current.price < best.price ? current : best;
    },
    null,
  );

  const analytics = {
    vipAveragePrice,
    mentorshipAveragePrice,
    strongestPromoCode: strongestPromo?.promoCode ?? "",
    strongestPromoDiscount: strongestPromo?.discountPct ?? 0,
  };

  const summary: PricingBlueprintSummary = {
    vip: describePackages(vipPackages),
    mentorship: mentorshipPackages.map((pkg) =>
      `${pkg.name}: $${
        pkg.price.toFixed(2)
      } | ${pkg.sessions} sessions | ${pkg.asyncSupport}`
    ),
    promos: promoOffers.map((offer) =>
      `${offer.name}: $${offer.price.toFixed(2)} | ${
        Math.round(offer.discountPct * 100)
      }% off | ${offer.durationDays}d`
    ),
  };

  return { vipPackages, mentorshipPackages, promoOffers, analytics, summary };
}
