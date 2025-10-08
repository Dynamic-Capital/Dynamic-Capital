"use client";

import { useMemo, useState } from "react";
import { Check, Clock, Gift, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils";
import { useToast } from "@/hooks/useToast";

interface VipPromoBannerProps {
  promoCode?: string;
  discountPercent?: number;
  validUntil?: string;
  onApplyPromo?: (promoCode: string) => void;
  onCopy?: (promoCode: string) => void;
  className?: string;
}

const DEFAULT_PROMO = {
  promoCode: "VIPBOTLAUNCH",
  discountPercent: 50,
  validUntil: "2025-01-31",
};

export function VipPromoBanner({
  promoCode: promoCodeProp,
  discountPercent: discountPercentProp,
  validUntil: validUntilProp,
  onApplyPromo,
  onCopy,
  className,
}: VipPromoBannerProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const promo = useMemo(() => ({
    promoCode: promoCodeProp ?? DEFAULT_PROMO.promoCode,
    discountPercent: discountPercentProp ?? DEFAULT_PROMO.discountPercent,
    validUntil: validUntilProp ?? DEFAULT_PROMO.validUntil,
  }), [promoCodeProp, discountPercentProp, validUntilProp]);

  const formattedDate = useMemo(() => {
    if (!promo.validUntil) return null;
    const parsed = new Date(promo.validUntil);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString();
  }, [promo.validUntil]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(promo.promoCode);
      setCopied(true);
      toast({
        title: "Promo code copied!",
        description: `${promo.promoCode} is ready to use.`,
        duration: 2500,
      });
      onCopy?.(promo.promoCode);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy promo code", error);
      toast({
        title: "Unable to copy promo",
        description: "Copy the code manually and try again.",
        variant: "destructive",
      });
    }
  };

  const handleApplyPromo = () => {
    onApplyPromo?.(promo.promoCode);
    toast({
      title: "Promo ready",
      description: `We'll apply ${promo.promoCode} during checkout.`,
      duration: 3000,
    });
  };

  return (
    <Card className={cn("liquid-glass border-primary/40", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            VIP Launch Offer
          </CardTitle>
          <Badge className="flex items-center gap-1 bg-primary/10 text-primary">
            <Sparkles className="h-3 w-3" />
            Limited
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Celebrate the VIP bot launch with an exclusive discount for early
          members.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
          <div className="text-sm font-medium text-muted-foreground">
            Promo code
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className="mx-auto mt-2 inline-flex items-center gap-2 rounded-md bg-background/70 px-4 py-2 font-mono text-lg font-semibold text-primary shadow-sm transition hover:scale-[1.02] hover:bg-background"
          >
            {promo.promoCode}
            <Badge variant="secondary" className="text-xs">
              {copied ? <Check className="h-3 w-3" /> : "Tap to copy"}
            </Badge>
          </button>
          <div className="mt-2 text-xs text-muted-foreground">
            Save {promo.discountPercent}% on any plan
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {formattedDate
              ? `Valid until ${formattedDate}`
              : "Limited time offer"}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button onClick={handleApplyPromo} className="sm:min-w-[180px]">
              Apply promo at checkout
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyCode}
              className="sm:min-w-[150px]"
            >
              {copied ? "Copied" : "Copy code"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
