import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Banknote, Bitcoin } from "lucide-react";

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

export function PaymentOptions({ selectedMethod, onSelect, currency }: PaymentOptionsProps) {
  const paymentOptions: PaymentOption[] = [
    {
      id: "bank_transfer",
      name: "Bank Transfer",
      icon: <Banknote className="h-5 w-5" />,
      description: "Direct bank transfer - most secure",
      processingTime: "1-3 business days",
      isPopular: currency === "MVR"
    },
    {
      id: "crypto",
      name: "Cryptocurrency",
      icon: <Bitcoin className="h-5 w-5" />,
      description: "USDT (TRC20) - instant processing",
      processingTime: "5-30 minutes",
      isPopular: currency === "USD"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {paymentOptions.map((option) => (
        <Card 
          key={option.id}
          className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
            selectedMethod === option.id 
              ? 'border-primary shadow-lg ring-2 ring-primary/20' 
              : 'hover:border-primary/50'
          }`}
          onClick={() => onSelect(option.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedMethod === option.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
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
                  <p className="text-sm text-muted-foreground">{option.description}</p>
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