export type DashboardViewKey =
  | "welcome"
  | "config"
  | "packages"
  | "support"
  | "analytics"
  | "promos"
  | "admin";

export interface DashboardStats {
  totalUsers: number;
  vipMembers: number;
  totalRevenue: number;
  pendingPayments: number;
  lastUpdated: string;
}

export type NavigateToView = (view: DashboardViewKey) => void;

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_months: number | null;
  is_lifetime: boolean | null;
  features: string[] | null;
  created_at?: string;
}

export interface Promotion {
  code: string;
  description?: string | null;
  discount_type?: string | null;
  discount_value?: number | null;
  valid_until?: string | null;
  max_uses?: number | null;
  usage_count?: number | null;
}

export interface ContactLink {
  id?: string;
  display_name: string;
  url: string;
  icon_emoji?: string | null;
  platform?: string | null;
}

export interface PackagePerformanceEntry {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  currency: string;
}

export interface AnalyticsData {
  timeframe: string;
  total_revenue: number;
  currency: string;
  comparison?: {
    revenue_change?: number;
    sales_change?: number;
  };
  package_performance: PackagePerformanceEntry[];
  generated_at: string;
  total_users?: number;
  vip_users?: number;
  pending_payments?: number;
  error?: string;
}
