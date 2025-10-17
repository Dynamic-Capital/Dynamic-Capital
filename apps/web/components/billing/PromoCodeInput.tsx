"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/integrations/supabase/client";
import logger from "@/utils/logger";
import {
  Check,
  DollarSign,
  Loader2,
  Percent,
  Sparkles,
  Tag,
  X,
} from "lucide-react";

interface PromoCodeInputProps {
  planId: string;
  onApplied?: (promoCode: string, validationData: PromoValidation) => void;
}

interface PromoValidation {
  ok?: boolean;
  valid?: boolean;
  type?: "percentage" | "fixed";
  discount_type?: "percentage" | "fixed";
  value?: number;
  discount_value?: number;
  final_amount?: number;
  reason?: string;
}

const PromoCodeInput = ({ planId, onApplied }: PromoCodeInputProps) => {
  const [promoCode, setPromoCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<PromoValidation | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const { toast } = useToast();

  const validatePromoCode = async () => {
    if (!promoCode.trim()) return;

    setIsValidating(true);
    try {
      // Use UUID validation to ensure we pass a valid plan_id
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const apiPlanId = uuidRegex.test(planId)
        ? planId
        : "6e07f718-606e-489d-9626-2a5fa3e84eec";

      // Try using Telegram data first, fall back to demo user
      const telegramId =
        (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id
          ?.toString() || "123456789";

      const { data, error } = await supabase.functions.invoke(
        "promo-validate",
        {
          body: {
            code: promoCode.trim().toUpperCase(),
            telegram_id: telegramId,
            plan_id: apiPlanId,
          },
        },
      );

      logger.log("Promo validation response:", { data, error });

      if (error) {
        console.error("Promo validation error:", error);
        throw error;
      }

      setValidation(data);

      if (data.valid) {
        setFeedback("success");
        setAppliedPromo(promoCode.trim().toUpperCase());
        onApplied?.(promoCode.trim().toUpperCase(), {
          ok: true,
          type: data.discount_type === "percentage" ? "percentage" : "fixed",
          value: data.discount_value,
          final_amount: data.final_amount,
        });
        toast({
          title: "Promo code applied! 🎉",
          description: `You saved ${
            data.discount_type === "percentage"
              ? `${data.discount_value}%`
              : `$${data.discount_value}`
          }`,
        });
      } else {
        setFeedback("error");
        toast({
          title: "Invalid promo code",
          description: data.reason || "This promo code is not valid",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Promo validation error:", error);
      toast({
        title: "Error",
        description: "Failed to validate promo code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
      setTimeout(() => setFeedback("idle"), 500);
    }
  };

  const clearPromoCode = () => {
    setPromoCode("");
    setValidation(null);
    setAppliedPromo(null);
  };

  const getDiscountBadge = () => {
    if (!validation?.valid) return null;

    return (
      <Badge
        variant="secondary"
        className="bg-primary/10 text-primary border-primary/20"
      >
        <Sparkles className="w-3 h-3 mr-1" />
        {validation.discount_type === "percentage"
          ? `${validation.discount_value}% OFF`
          : `$${validation.discount_value} OFF`}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Promo Input */}
      <div className="space-y-3">
        <motion.div
          className="flex gap-2"
          animate={feedback === "success"
            ? { scale: [1, 1.05, 1] }
            : feedback === "error"
            ? { x: [0, -8, 8, -8, 8, 0] }
            : {}}
        >
          <div className="flex-1">
            <Input
              placeholder="Enter promo code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              leading={
                <Tag
                  className="w-4 h-4 text-muted-foreground"
                  aria-hidden="true"
                />
              }
              inputClassName="font-mono"
              disabled={isValidating || !!appliedPromo}
            />
          </div>

          {appliedPromo
            ? (
              <Button
                variant="outline"
                size="default"
                onClick={clearPromoCode}
                className="shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )
            : (
              <Button
                onClick={validatePromoCode}
                disabled={!promoCode.trim() || isValidating}
                className="shrink-0"
              >
                {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  "Apply"
                )}
              </Button>
            )}
        </motion.div>

        {/* Popular Promo Codes */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Try:</span>
          {["TEST10", "SAVE20", "WELCOME10", "LIFETIME50"].map((code) => (
            <Button
              key={code}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs font-mono hover:bg-primary/10"
              onClick={() => setPromoCode(code)}
              disabled={!!appliedPromo}
            >
              {code}
            </Button>
          ))}
        </div>
      </div>

      {/* Validation Result */}
      {validation && (
        <Card
          className={`border transition-all duration-300 ${
            validation.valid
              ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20"
              : "border-destructive/50 bg-destructive/5"
          }`}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              {validation.valid
                ? <Check className="w-4 h-4 text-green-600" />
                : <X className="w-4 h-4 text-destructive" />}
              <span className="font-medium">
                {validation.valid ? "Promo code applied" : "Invalid code"}
              </span>
              {validation.valid && getDiscountBadge()}
            </div>

            {validation.valid && validation.final_amount !== undefined && (
              <div className="space-y-2">
                <Separator />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Original price:</span>
                  <span className="line-through">$49.00</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="text-green-600 font-medium">
                    -{validation.discount_type === "percentage"
                      ? `${validation.discount_value}%`
                      : `$${validation.discount_value}`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Final price:</span>
                  <span className="text-primary">
                    ${validation.final_amount}
                  </span>
                </div>
              </div>
            )}

            {!validation.valid && validation.reason && (
              <p className="text-sm text-muted-foreground mt-1">
                {validation.reason}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Promo Features */}
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="space-y-1">
          <Percent className="w-5 h-5 mx-auto text-primary/70" />
          <p className="text-xs text-muted-foreground">Up to 50% off</p>
        </div>
        <div className="space-y-1">
          <DollarSign className="w-5 h-5 mx-auto text-primary/70" />
          <p className="text-xs text-muted-foreground">Instant savings</p>
        </div>
      </div>
    </div>
  );
};

export default PromoCodeInput;
