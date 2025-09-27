"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { cn, formatPrice } from "@/utils";
import type { PromoValidationResult } from "./types";

interface PromoCodeFormProps {
  promoCode: string;
  setPromoCode: (code: string) => void;
  validatePromoCode: () => void;
  validatingPromo: boolean;
  promoValidation: PromoValidationResult | null;
  currency: string;
}

export const PromoCodeForm: React.FC<PromoCodeFormProps> = ({
  promoCode,
  setPromoCode,
  validatePromoCode,
  validatingPromo,
  promoValidation,
  currency,
}) => {
  const renderMessage = () => {
    if (!promoValidation) return null;

    if (promoValidation.valid) {
      const discountLabel = promoValidation.discountType === "percentage"
        ? `${promoValidation.discountValue ?? 0}%`
        : formatPrice(promoValidation.discountValue ?? 0, currency, "en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        });

      return (
        <div
          className={cn(
            "text-xs p-2 rounded",
            "bg-green-500/10 text-green-600 border border-green-500/20",
          )}
        >
          {`${discountLabel} discount applied!`}
        </div>
      );
    }

    return (
      <div
        className={cn(
          "text-xs p-2 rounded",
          "bg-dc-brand/10 text-dc-brand-dark border border-dc-brand/20",
        )}
      >
        {promoValidation.reason || "Invalid promo code"}
      </div>
    );
  };

  return (
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
        {renderMessage()}
      </CardContent>
    </Card>
  );
};

export default PromoCodeForm;
