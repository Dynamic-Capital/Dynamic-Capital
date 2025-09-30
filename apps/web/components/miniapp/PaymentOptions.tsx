import { ReactNode, useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import {
  type PaymentMethodDefinition,
  type PaymentMethodId,
  paymentMethodMap,
} from "./paymentMethods";

interface PaymentOption extends PaymentMethodDefinition {
  icon: ReactNode;
  isPopular?: boolean;
}

export interface PaymentOptionPresentation {
  icon: ReactNode;
  description?: string;
  processingTime?: string;
  isPopular?: boolean;
}

interface PaymentOptionsProps {
  selectedMethod: PaymentMethodId | null;
  onSelect: (method: PaymentMethodId) => void;
  methods?: PaymentMethodId[];
  presentation: Partial<Record<PaymentMethodId, PaymentOptionPresentation>>;
}

export function PaymentOptions({
  selectedMethod,
  onSelect,
  methods,
  presentation,
}: PaymentOptionsProps) {
  const paymentOptions = useMemo(() => {
    const methodIds = methods ?? ["bank_transfer", "crypto"];

    return methodIds
      .map<PaymentOption | null>((id) => {
        const definition = paymentMethodMap[id];
        const extras = presentation[id];

        if (!definition || !extras) {
          return null;
        }

        return {
          ...definition,
          icon: extras.icon,
          description: extras.description ?? definition.description,
          processingTime: extras.processingTime ?? definition.processingTime,
          isPopular: extras.isPopular ?? false,
        };
      })
      .filter((option): option is PaymentOption => option !== null);
  }, [methods, presentation]);

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
