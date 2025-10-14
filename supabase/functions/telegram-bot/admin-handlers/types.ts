export interface BotUser {
  telegram_id: string;
  first_name?: string;
  username?: string;
  is_admin: boolean;
  is_vip: boolean;
  created_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_months: number;
  is_lifetime: boolean;
  features?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface PlanChannel {
  plan_id: string;
  channel_name: string;
  channel_type: string;
  invite_link: string;
  is_active: boolean;
}

export interface EducationPackage {
  id: string;
  name: string;
  currency: string;
  price: number;
  duration_weeks: number;
  is_active: boolean;
  is_featured: boolean;
  current_students: number;
  max_students?: number | null;
  created_at: string;
}

export interface Promotion {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  auto_created?: boolean | null;
  generated_via?: string | null;
  valid_until?: string | null;
  is_active: boolean;
}
