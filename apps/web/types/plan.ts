export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_months: number;
  is_lifetime: boolean;
  features: string[];
  base_price?: number;
  dynamic_price_usdt?: number | null;
  ton_amount?: number | null;
  dct_amount?: number;
  pricing_formula?: string | null;
  last_priced_at?: string | null;
  performance_snapshot?: Record<string, unknown> | null;
  pricing?: PlanPricingDetails;
}

export interface PlanPricingDetails {
  basePrice: number;
  displayPrice: number;
  dynamicPrice?: number | null;
  lastPricedAt?: string | null;
  formula?: string | null;
  tonAmount?: number | null;
  dctAmount?: number;
  performanceSnapshot?: Record<string, unknown> | null;
}
