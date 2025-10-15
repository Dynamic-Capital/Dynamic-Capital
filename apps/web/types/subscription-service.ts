export interface SubscriptionPlanRecord {
  id?: string | null;
  name?: string | null;
  price?: number | string | null;
  base_price?: number | string | null;
  dynamic_price_usdt?: number | string | null;
  currency?: string | null;
  duration_months?: number | string | null;
  is_lifetime?: boolean | null;
  features?: unknown;
  created_at?: string | null;
  pricing_formula?: string | null;
  last_priced_at?: string | null;
  performance_snapshot?: Record<string, unknown> | null;
  ton_amount?: number | string | null;
  dct_amount?: number | string | null;
}

export interface EducationPackageRecord {
  id?: string | null;
  name?: string | null;
  price?: number | string | null;
  currency?: string | null;
  duration_weeks?: number | string | null;
  is_lifetime?: boolean | null;
  ton_amount?: number | string | null;
  dct_amount?: number | string | null;
  description?: string | null;
  features?: unknown;
}

export interface TonRateRecord {
  rate?: number | string | null;
  source?: string | null;
  updatedAt?: string | null;
}

export interface ServicePricingRecord {
  blueprint?: unknown;
  computed_at?: string | null;
  education_packages?: EducationPackageRecord[] | null;
}

export interface PlansFunctionResponse {
  ok?: boolean;
  plans?: SubscriptionPlanRecord[] | null;
  tonRate?: TonRateRecord | null;
  service_pricing?: ServicePricingRecord | null;
}

export interface PromotionRecord {
  code: string;
  description: string | null;
  discount_type: string | null;
  discount_value: number | string | null;
  valid_until: string | null;
  max_uses?: number | string | null;
  usage_count?: number | string | null;
  plan_ids?: string[] | null;
}
