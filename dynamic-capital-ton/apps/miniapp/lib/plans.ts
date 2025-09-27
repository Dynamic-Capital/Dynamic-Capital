"use client";

export const PLAN_IDS = [
  "vip_bronze",
  "vip_silver",
  "vip_gold",
  "mentorship",
] as const;

export type Plan = (typeof PLAN_IDS)[number];

export type PlanOption = {
  id: Plan;
  name: string;
  price: string;
  cadence: string;
  description: string;
  highlights: string[];
  meta: {
    currency: string;
    amount: number | null;
    tonAmount: number | null;
    dctAmount: number | null;
    updatedAt: string | null;
  };
};

export type RawPlan = {
  id?: string | null;
  name?: string | null;
  price?: number | string | null;
  base_price?: number | string | null;
  dynamic_price_usdt?: number | string | null;
  currency?: string | null;
  duration_months?: number | string | null;
  is_lifetime?: boolean | null;
  features?: unknown;
  last_priced_at?: string | null;
  ton_amount?: number | string | null;
  dct_amount?: number | string | null;
};

const FALLBACK_PLAN_OPTIONS: PlanOption[] = [
  {
    id: "vip_bronze",
    name: "VIP Bronze",
    price: "120 TON",
    cadence: "3 month horizon",
    description:
      "Entry tier that mirrors the desk's base auto-invest strategy.",
    highlights: [
      "Desk monitored entries",
      "Weekly strategy calls",
      "Capital preservation guardrails",
    ],
    meta: {
      currency: "TON",
      amount: 120,
      tonAmount: 120,
      dctAmount: null,
      updatedAt: null,
    },
  },
  {
    id: "vip_silver",
    name: "VIP Silver",
    price: "220 TON",
    cadence: "6 month horizon",
    description:
      "Expanded allocation with leverage-managed exposure and mid-cycle rotations.",
    highlights: [
      "Dual momentum + carry blend",
      "Priority support window",
      "Quarterly performance briefing",
    ],
    meta: {
      currency: "TON",
      amount: 220,
      tonAmount: 220,
      dctAmount: null,
      updatedAt: null,
    },
  },
  {
    id: "vip_gold",
    name: "VIP Gold",
    price: "420 TON",
    cadence: "12 month horizon",
    description:
      "Full desk collaboration with access to structured products and vault strategies.",
    highlights: [
      "Structured product desk",
      "Liquidity provisioning slots",
      "Desk escalation on demand",
    ],
    meta: {
      currency: "TON",
      amount: 420,
      tonAmount: 420,
      dctAmount: null,
      updatedAt: null,
    },
  },
  {
    id: "mentorship",
    name: "Mentorship Circle",
    price: "650 TON",
    cadence: "12 month horizon",
    description:
      "One-on-one mentorship with the desk's senior PMs and quarterly onsite reviews.",
    highlights: [
      "Dedicated mentor queue",
      "Quarterly onsite review",
      "Capital introduction pathway",
    ],
    meta: {
      currency: "TON",
      amount: 650,
      tonAmount: 650,
      dctAmount: null,
      updatedAt: null,
    },
  },
];

const FALLBACK_PLAN_LOOKUP: Record<Plan, PlanOption> = Object.fromEntries(
  FALLBACK_PLAN_OPTIONS.map((option) => [option.id, option]),
) as Record<Plan, PlanOption>;

export function getFallbackPlans(): PlanOption[] {
  return [...FALLBACK_PLAN_OPTIONS];
}

export function isSupportedPlan(value: string | null | undefined): value is Plan {
  if (!value) return false;
  return PLAN_IDS.includes(value as Plan);
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatPlanLabel(
  currency: string,
  amount: number,
  isLifetime: boolean,
  durationMonths: number,
): string {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  });
  const formatted = formatter.format(amount);
  if (isLifetime) {
    return `${formatted} lifetime`;
  }
  if (durationMonths <= 1) {
    return `${formatted} / month`;
  }
  if (durationMonths >= 12 && durationMonths % 12 === 0) {
    const years = durationMonths / 12;
    return `${formatted} / ${years} yr${years > 1 ? "s" : ""}`;
  }
  return `${formatted} / ${durationMonths} mo`;
}

export function normalisePlanOptions(plans: RawPlan[]): PlanOption[] {
  const nextOptions: PlanOption[] = [];

  for (const raw of plans) {
    if (!raw || !isSupportedPlan(raw.id ?? undefined)) {
      continue;
    }

    const fallback = FALLBACK_PLAN_LOOKUP[raw.id];
    const name = typeof raw.name === "string" && raw.name.trim().length > 0
      ? raw.name
      : fallback.name;
    const currency =
      typeof raw.currency === "string" && raw.currency.trim().length > 0
        ? raw.currency.toUpperCase()
        : fallback.meta.currency ?? "USD";
    const amount = coerceNumber(raw.price) ??
      coerceNumber(raw.base_price) ??
      coerceNumber(raw.dynamic_price_usdt);
    const isLifetime = raw.is_lifetime === true;
    const duration = coerceNumber(raw.duration_months) ?? 0;
    const priceLabel = amount !== null
      ? formatPlanLabel(currency, amount, isLifetime, duration)
      : fallback.price;
    const highlights = Array.isArray(raw.features)
      ? raw.features.filter((feature): feature is string =>
        typeof feature === "string" && feature.trim().length > 0
      )
      : fallback.highlights;

    const tonAmount = coerceNumber(raw.ton_amount);
    const dctAmount = coerceNumber(raw.dct_amount);
    const cadence = isLifetime
      ? "Lifetime access"
      : duration >= 12 && duration % 12 === 0
      ? `${duration / 12} year${duration / 12 > 1 ? "s" : ""} runway`
      : duration > 1
      ? `${duration} month${duration > 1 ? "s" : ""} runway`
      : fallback.cadence;

    nextOptions.push({
      id: raw.id,
      name,
      price: priceLabel,
      cadence,
      description: fallback.description,
      highlights: highlights.length > 0 ? highlights : fallback.highlights,
      meta: {
        currency,
        amount,
        tonAmount,
        dctAmount,
        updatedAt: raw.last_priced_at ?? fallback.meta.updatedAt,
      },
    });
  }

  return nextOptions.length > 0 ? nextOptions : [...FALLBACK_PLAN_OPTIONS];
}

export function resolvePlanUpdatedAt(options: PlanOption[]): string | undefined {
  let latest: Date | undefined;
  for (const option of options) {
    const timestamp = option.meta.updatedAt;
    if (!timestamp) continue;
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) continue;
    if (!latest || parsed > latest) {
      latest = parsed;
    }
  }

  return latest?.toISOString();
}
