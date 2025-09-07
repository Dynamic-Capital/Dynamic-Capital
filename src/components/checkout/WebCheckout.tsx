import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, 
  Shield, 
  Clock, 
  Users, 
  Sparkles, 
  Check,
  AlertCircle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_months: number;
  is_lifetime: boolean;
  features: string[];
}

interface WebCheckoutProps {
  selectedPlanId?: string;
  promoCode?: string;
}

export const WebCheckout: React.FC<WebCheckoutProps> = ({ 
  selectedPlanId, 
  promoCode: initialPromoCode 
}) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [promoCode, setPromoCode] = useState(initialPromoCode || "");
  const [promoValidation, setPromoValidation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [validatingPromo, setValidatingPromo] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (selectedPlanId && plans.length > 0) {
      const plan = plans.find(p => p.id === selectedPlanId);
      setSelectedPlan(plan || plans[0]);
    }
  }, [selectedPlanId, plans]);

  const fetchPlans = async () => {
    try {
      const response = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/plans');
      const data = await response.json();
      setPlans(data.plans || []);
      if (data.plans?.length > 0 && !selectedPlan) {
        setSelectedPlan(data.plans[0]);
      }
    } catch (error) {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const validatePromoCode = async () => {
    if (!promoCode.trim() || !selectedPlan) return;
    
    setValidatingPromo(true);
    try {
      const response = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/promo-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCode,
          plan_id: selectedPlan.id
        })
      });
      
      const data = await response.json();
      setPromoValidation(data);
      
      if (data.valid) {
        toast.success(`Promo code applied! ${data.discount_type === 'percentage' ? data.discount_value + '%' : '$' + data.discount_value} discount`);
      } else {
        toast.error(data.reason || 'Invalid promo code');
      }
    } catch (error) {
      toast.error('Failed to validate promo code');
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedPlan) return;

    setProcessingCheckout(true);
    try {
      // For demo purposes, redirect to Telegram bot
      const botUsername = "Dynamic_VIP_BOT";
      const telegramUrl = `https://t.me/${botUsername}?start=plan_${selectedPlan.id}${promoValidation?.valid ? `_promo_${promoCode}` : ''}`;
      
      // In a real implementation, this would call a Stripe checkout edge function
      // const response = await supabase.functions.invoke('create-checkout', {
      //   body: { planId: selectedPlan.id, promoCode: promoValidation?.valid ? promoCode : undefined }
      // });
      
      window.open(telegramUrl, '_blank');
      toast.success('Redirecting to Telegram to complete purchase');
    } catch (error) {
      toast.error('Failed to initiate checkout');
    } finally {
      setProcessingCheckout(false);
    }
  };

  const calculateFinalPrice = () => {
    if (!selectedPlan) return 0;
    if (!promoValidation?.valid) return selectedPlan.price;
    
    if (promoValidation.discount_type === 'percentage') {
      return selectedPlan.price * (1 - promoValidation.discount_value / 100);
    } else {
      return Math.max(0, selectedPlan.price - promoValidation.discount_value);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading checkout...
        </div>
      </div>
    );
  }

  if (!selectedPlan) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No plan selected. Please select a plan to continue.
        </AlertDescription>
      </Alert>
    );
  }

  const finalPrice = calculateFinalPrice();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <Badge variant="secondary" className="mb-2">
          <Shield className="h-3 w-3 mr-1" />
          Secure Checkout
        </Badge>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Complete Your Purchase
        </h1>
        <p className="text-muted-foreground">
          Join thousands of traders using our premium tools
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {selectedPlan.name}
              </CardTitle>
              <CardDescription>
                {selectedPlan.is_lifetime ? 'Lifetime access' : `${selectedPlan.duration_months} month subscription`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-lg">
                <span>Price:</span>
                <div className="text-right">
                  <div className="font-bold text-primary">
                    ${finalPrice.toFixed(2)}
                  </div>
                  {promoValidation?.valid && finalPrice !== selectedPlan.price && (
                    <div className="text-sm text-muted-foreground line-through">
                      ${selectedPlan.price}
                    </div>
                  )}
                </div>
              </div>
              
              {selectedPlan.features && selectedPlan.features.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Included features:</h4>
                  <div className="space-y-1">
                    {selectedPlan.features.map((feature, idx) => (
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

          {/* Trust Indicators */}
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

        {/* Checkout Form */}
        <div className="space-y-4">
          {/* Plan Selection */}
          {plans.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Choose Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {plans.map((plan) => (
                  <Button
                    key={plan.id}
                    variant={selectedPlan.id === plan.id ? "default" : "outline"}
                    className="w-full justify-between h-auto p-4"
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <div className="text-left">
                      <div className="font-medium">{plan.name}</div>
                      <div className="text-xs opacity-75">
                        {plan.is_lifetime ? 'Lifetime' : `${plan.duration_months} months`}
                      </div>
                    </div>
                    <div className="font-bold">${plan.price}</div>
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Promo Code */}
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
                  {validatingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
              {promoValidation && (
                <div className={cn(
                  "text-xs p-2 rounded",
                  promoValidation.valid 
                    ? "bg-green-500/10 text-green-600 border border-green-500/20" 
                    : "bg-red-500/10 text-red-600 border border-red-500/20"
                )}>
                  {promoValidation.valid 
                    ? `${promoValidation.discount_type === 'percentage' ? promoValidation.discount_value + '%' : '$' + promoValidation.discount_value} discount applied!`
                    : promoValidation.reason
                  }
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />
          
          {/* Checkout Button */}
          <div className="space-y-4">
            <Button 
              onClick={handleCheckout}
              disabled={processingCheckout}
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {processingCheckout ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <CreditCard className="h-5 w-5 mr-2" />
              )}
              Complete Purchase - ${finalPrice.toFixed(2)}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              By proceeding, you agree to our Terms of Service and Privacy Policy.
              For the full experience, complete purchase in Telegram.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebCheckout;