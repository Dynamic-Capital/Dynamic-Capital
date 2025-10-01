import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, Gift, Sparkles, Star, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PromoPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPromo: (promoCode: string) => void;
}

export const VipLaunchPromoPopup = (
  { isOpen, onClose, onApplyPromo }: PromoPopupProps,
) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const promoCode = "VIPBOTLAUNCH";
  const discountPercent = 50;
  const validUntil = "2025-01-31";

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(promoCode);
      setCopied(true);
      toast({
        title: "Promo code copied!",
        description: "The code has been copied to your clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleApplyNow = () => {
    onApplyPromo(promoCode);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="liquid-glass border-primary/40 max-w-md mx-auto animate-scale-in">
        <DialogHeader className="relative">
          <DialogClose className="absolute right-0 top-0 p-1 opacity-70 hover:opacity-100 transition-opacity">
            <X className="h-4 w-4" />
          </DialogClose>
          <DialogTitle className="text-center pt-2">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Gift className="h-6 w-6 text-primary animate-bounce" />
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  VIP Bot Launch!
                </span>
              </div>
              <div className="flex items-center justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 text-yellow-500 fill-current animate-pulse"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <CardContent className="ui-stack-lg prose">
          <div className="text-center ui-stack-base">
            <div className="relative">
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white ui-p-base text-heading font-bold animate-pulse-glow">
                {discountPercent}% OFF
              </Badge>
              <div className="absolute -top-1 -right-1">
                <Sparkles className="icon-xs text-yellow-500 animate-spin" />
              </div>
            </div>

            <p className="text-muted-foreground text-body-sm leading-relaxed">
              🎉 Celebrate our VIP bot launch with an exclusive{" "}
              <strong className="text-foreground">
                {discountPercent}% discount
              </strong>{" "}
              on all subscription plans!
            </p>
          </div>

          <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 ui-rounded-lg ui-p-base ui-stack-base">
            <div className="text-center ui-stack-sm">
              <p className="text-body-sm font-medium text-foreground">
                Your exclusive promo code:
              </p>
              <div
                onClick={handleCopyCode}
                className="bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 ui-rounded-lg ui-p-base cursor-pointer hover:from-primary/30 hover:to-accent/30 transition-all duration-300 group"
              >
                <code className="text-heading font-mono font-bold text-primary group-hover:scale-105 transition-transform inline-block">
                  {promoCode}
                </code>
                <p className="text-caption text-muted-foreground ui-mt-xs">
                  {copied ? "✓ Copied!" : "Tap to copy"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-body-sm text-muted-foreground">
              <Clock className="icon-xs" />
              <span>
                Valid until {new Date(validUntil).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="ui-stack-base">
            <Button
              onClick={handleApplyNow}
              className="w-full liquid-glass-button bg-gradient-to-r from-primary/20 to-accent/20 hover:from-primary/30 hover:to-accent/30 text-foreground font-semibold ui-p-base animate-pulse-glow"
            >
              <Gift className="icon-xs ui-mr-xs" />
              Apply & Choose Plan
            </Button>

            <Button
              onClick={onClose}
              variant="outline"
              className="w-full liquid-glass-button"
            >
              Maybe Later
            </Button>
          </div>

          <div className="text-center text-caption text-muted-foreground">
            ⚡ Limited time offer • 🔒 Secure checkout • 📱 Instant activation
          </div>
        </CardContent>
      </DialogContent>
    </Dialog>
  );
};
