import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Banknote, CreditCard } from "@/lib/lucide";
import Image from "next/image";

interface PaymentOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  processingTime: string;
  isPopular?: boolean;
}

interface PaymentOptionsProps {
  selectedMethod: string | null;
  onSelect: (method: string) => void;
  currency: string;
}

export function PaymentOptions(
  { selectedMethod, onSelect, currency }: PaymentOptionsProps,
) {
  const paymentOptions: PaymentOption[] = [
    {
      id: "bank_transfer",
      name: "Bank Transfer",
      icon: (
        <div className="flex items-center gap-1">
          <Image
            src="/icons/bank.svg"
            alt="Bank"
            width={20}
            height={20}
            className="h-5 w-5"
          />
          <div className="flex gap-1 text-xs">
            <span className="px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
              BML
            </span>
            <span className="px-1 py-0.5 bg-green-100 text-green-800 rounded text-xs">
              MIB
            </span>
          </div>
        </div>
      ),
      description: "Direct bank transfer - most secure",
      processingTime: "1-3 business days",
      isPopular: currency === "MVR",
    },
    {
      id: "crypto",
      name: "Cryptocurrency",
      icon: (
        <div className="flex items-center gap-1">
          <Image
            src="/icons/usdt.svg"
            alt="USDT"
            width={20}
            height={20}
            className="h-5 w-5"
          />
          <Image
            src="/icons/trc20.svg"
            alt="TRC20"
            width={16}
            height={16}
            className="h-4 w-4"
          />
          <span className="text-xs text-green-600 font-medium">USDT</span>
        </div>
      ),
      description: "USDT (TRC20) - instant processing",
      processingTime: "5-30 minutes",
      isPopular: currency === "USD",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {paymentOptions.map((option) => (
        <Card
          key={option.id}
          className={`glass-card cursor-pointer transition-all duration-300 hover:scale-105 ${
            selectedMethod === option.id
              ? "border-primary shadow-lg ring-2 ring-primary/20 glass-active"
              : "border-white/10 hover:border-primary/50"
          }`}
          onClick={() => onSelect(option.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    selectedMethod === option.id
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-muted"
                  }`}
                >
                  {option.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{option.name}</h3>
                    {option.isPopular && (
                      <Badge variant="secondary" className="text-xs">
                        Popular
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Processing: {option.processingTime}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
