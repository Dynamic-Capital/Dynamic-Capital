export type PaymentMethod = "bank_transfer" | "crypto" | "telegram";
export type CheckoutStep = "method" | "instructions" | "upload" | "pending";

export interface BankAccount {
  bank_name: string;
  account_name: string;
  account_number: string;
  currency: string;
}

export interface PromoValidationResult {
  valid: boolean;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  finalAmount?: number;
  reason?: string;
}
