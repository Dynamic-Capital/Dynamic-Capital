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
