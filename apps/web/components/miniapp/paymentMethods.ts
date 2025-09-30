export type PaymentMethodId =
  | "bank_transfer"
  | "mobile_banking"
  | "crypto"
  | "card";

export interface PaymentMethodDefinition {
  id: PaymentMethodId;
  name: string;
  description: string;
  processingTime: string;
  fees?: string;
}

export const paymentMethodDefinitions: PaymentMethodDefinition[] = [
  {
    id: "bank_transfer",
    name: "Bank Transfer",
    description: "Direct bank transfer (MVR/USD)",
    processingTime: "2-24 hours",
    fees: "No fees",
  },
  {
    id: "mobile_banking",
    name: "Mobile Banking",
    description: "BML Mobile, Ooredoo Money",
    processingTime: "Instant",
    fees: "No fees",
  },
  {
    id: "crypto",
    name: "USDT (TRC20)",
    description: "Cryptocurrency payment",
    processingTime: "10-30 minutes",
    fees: "Network fees apply",
  },
  {
    id: "card",
    name: "Credit/Debit Card",
    description: "Visa, Mastercard (Coming Soon)",
    processingTime: "Instant",
    fees: "2.9% + $0.30",
  },
];

export const paymentMethodMap = paymentMethodDefinitions.reduce<
  Record<PaymentMethodId, PaymentMethodDefinition>
>((map, method) => {
  map[method.id] = method;
  return map;
}, {} as Record<PaymentMethodId, PaymentMethodDefinition>);
