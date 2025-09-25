"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, Clock, CreditCard, Shield, Users } from "lucide-react";
import type { Plan } from "@/types/plan";

interface PlanSummaryProps {
  plan: Plan;
  finalPrice: number;
  promoValidation: any;
}

export const PlanSummary: React.FC<PlanSummaryProps> = (
  { plan, finalPrice, promoValidation },
) => (
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          {plan.name}
        </CardTitle>
        <CardDescription>
          {plan.is_lifetime
            ? "Lifetime access"
            : `${plan.duration_months} month subscription`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center text-lg">
          <span>Price:</span>
          <div className="text-right">
            <div className="font-bold text-primary">
              ${finalPrice.toFixed(2)}
            </div>
            {promoValidation?.valid && finalPrice !== plan.price && (
              <div className="text-sm text-muted-foreground line-through">
                ${plan.price}
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              ≈ {(plan.pricing?.dctAmount ?? plan.dct_amount ?? plan.price)
                .toFixed(2)} DCT
              {typeof plan.pricing?.tonAmount === "number" &&
                plan.pricing.tonAmount > 0 && (
                <span className="ml-1">
                  / {plan.pricing.tonAmount.toFixed(3)} TON
                </span>
              )}
            </div>
          </div>
        </div>

        {plan.features && plan.features.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Included features:</h4>
            <div className="space-y-1">
              {plan.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <Check className="h-3 w-3 text-green-500" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    <Card className="border-dashed">
      <CardContent className="pt-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <Shield className="w-5 h-5 mx-auto text-primary" />
            <p className="text-xs text-muted-foreground">Secure</p>
          </div>
          <div className="space-y-1">
            <Clock className="w-5 h-5 mx-auto text-primary" />
            <p className="text-xs text-muted-foreground">Instant</p>
          </div>
          <div className="space-y-1">
            <Users className="w-5 h-5 mx-auto text-primary" />
            <p className="text-xs text-muted-foreground">5000+ Users</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default PlanSummary;
