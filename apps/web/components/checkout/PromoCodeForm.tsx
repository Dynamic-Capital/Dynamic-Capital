"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "@/lib/lucide";
import { cn } from "@/utils";

interface PromoCodeFormProps {
  promoCode: string;
  setPromoCode: (code: string) => void;
  validatePromoCode: () => void;
  validatingPromo: boolean;
  promoValidation: any;
}

export const PromoCodeForm: React.FC<PromoCodeFormProps> = (
  {
    promoCode,
    setPromoCode,
    validatePromoCode,
    validatingPromo,
    promoValidation,
  },
) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg">
        <Sparkles className="h-5 w-5" />
        Promo Code
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Enter promo code"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          className="flex-1"
        />
        <Button
          onClick={validatePromoCode}
          disabled={!promoCode.trim() || validatingPromo}
          size="sm"
        >
          {validatingPromo
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : "Apply"}
        </Button>
      </div>
      {promoValidation && (
        <div
          className={cn(
            "text-xs p-2 rounded",
            promoValidation.valid
              ? "bg-green-500/10 text-green-600 border border-green-500/20"
              : "bg-dc-brand/10 text-dc-brand-dark border border-dc-brand/20",
          )}
        >
          {promoValidation.valid
            ? `${
              promoValidation.discount_type === "percentage"
                ? promoValidation.discount_value + "%"
                : "$" + promoValidation.discount_value
            } discount applied!`
            : promoValidation.reason}
        </div>
      )}
    </CardContent>
  </Card>
);

export default PromoCodeForm;
