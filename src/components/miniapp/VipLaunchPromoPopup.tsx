import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Gift, Clock, X, Star, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PromoPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPromo: (promoCode: string) => void;
}

export const VipLaunchPromoPopup = ({ isOpen, onClose, onApplyPromo }: PromoPopupProps) => {
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
      console.error('Failed to copy:', error);
    }
  };

  const handleApplyNow = () => {
    onApplyPromo(promoCode);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-primary/30 max-w-md mx-auto animate-scale-in">
        <DialogHeader className="relative">
          <DialogClose className="absolute right-0 top-0 p-1 opacity-70 hover:opacity-100 transition-opacity">
            <X className="h-4 w-4" />
          </DialogClose>
          <DialogTitle className="text-center pt-2">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Gift className="h-6 w-6 text-primary animate-bounce" />
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                  VIP Bot Launch!
                </span>
              </div>
              <div className="flex items-center justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-500 fill-current animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <CardContent className="space-y-6 p-0">
          <div className="text-center space-y-3">
            <div className="relative">
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 text-lg font-bold animate-pulse-glow">
                {discountPercent}% OFF
              </Badge>
              <div className="absolute -top-1 -right-1">
                <Sparkles className="h-4 w-4 text-yellow-500 animate-spin" />
              </div>
            </div>
            
            <p className="text-muted-foreground text-sm leading-relaxed">
              🎉 Celebrate our VIP bot launch with an exclusive <strong>{discountPercent}% discount</strong> on all subscription plans!
            </p>
          </div>

          <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-lg p-4 space-y-3">
            <div className="text-center">
              <p className="text-sm font-medium mb-2">Your exclusive promo code:</p>
              <div 
                onClick={handleCopyCode}
                className="bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 rounded-lg p-3 cursor-pointer hover:from-primary/30 hover:to-purple-500/30 transition-all duration-300 group"
              >
                <code className="text-lg font-mono font-bold text-primary group-hover:scale-105 transition-transform inline-block">
                  {promoCode}
                </code>
                <p className="text-xs text-muted-foreground mt-1">
                  {copied ? "✓ Copied!" : "Tap to copy"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Valid until {new Date(validUntil).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleApplyNow}
              className="w-full bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white font-semibold py-3 animate-pulse-glow"
            >
              <Gift className="h-4 w-4 mr-2" />
              Apply & Choose Plan
            </Button>
            
            <Button 
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              Maybe Later
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            ⚡ Limited time offer • 🔒 Secure checkout • 📱 Instant activation
          </div>
        </CardContent>
      </DialogContent>
    </Dialog>
  );
};