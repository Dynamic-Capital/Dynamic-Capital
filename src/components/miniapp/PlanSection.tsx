import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Sparkles, Check, Star, TrendingUp } from "lucide-react";
import { HorizontalSnapScroll } from "@/components/ui/horizontal-snap-scroll";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import { CurrencySelector } from "./CurrencySelector";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_months: number;
  is_lifetime: boolean;
  features: string[];
}

interface PromoValidation {
  valid: boolean;
  reason: string;
  discount_type?: string;
  discount_value?: number;
  final_amount?: number;
}

export default function PlanSection() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const { currency, setCurrency, exchangeRate } = useCurrency();
  const [popularPlanId, setPopularPlanId] = useState<string | null>(null);
  const [userPreferredPlanId, setUserPreferredPlanId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState(() => {
    // Pre-fill promo code from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('promo') || "";
  });
  const [promoValidation, setPromoValidation] = useState<PromoValidation | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  const isInTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;

  useEffect(() => {
    // Fetch plans and popular plan
    Promise.all([
      fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/plans').then(res => res.json()),
      fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/content-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: ['popular_plan_id'] })
      }).then(res => res.json())
    ]).then(([plansData, contentData]) => {
      setPlans(plansData.plans || []);
      
      const contents = contentData.contents || [];
      const popularContent = contents.find((c: any) => c.content_key === 'popular_plan_id');
      
      if (popularContent) {
        setPopularPlanId(popularContent.content_value);
      }

      // Check user's selection history for most preferred plan
      const selectionCounts = JSON.parse(localStorage.getItem('plan_selection_counts') || '{}');
      if (Object.keys(selectionCounts).length > 0) {
        const mostSelected = Object.entries(selectionCounts).reduce((a, b) => 
          (selectionCounts[a[0]] as number) > (selectionCounts[b[0]] as number) ? a : b, ['', 0]
        );
        if ((mostSelected[1] as number) > 0) {
          setUserPreferredPlanId(mostSelected[0]);
        }
      }
      
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  // Auto-validate promo code if pre-filled from URL
  useEffect(() => {
    if (promoCode.trim() && isInTelegram && !promoValidation) {
      validatePromoCode();
    }
  }, [promoCode, isInTelegram]); // eslint-disable-line react-hooks/exhaustive-deps

  const validatePromoCode = async () => {
    if (!promoCode.trim() || !isInTelegram) return;
    
    setValidatingPromo(true);
    try {
      const response = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/promo-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCode,
          telegram_id: window.Telegram?.WebApp?.initDataUnsafe?.user?.id || '',
          plan_id: plans[0]?.id // Use first plan for validation
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

  const getDisplayPrice = (plan: Plan) => {
    const basePrice = plan.price;
    if (currency === "MVR") {
      return Math.round(basePrice * exchangeRate);
    }
    return basePrice;
  };

  const handleSelectPlan = (planId: string) => {
    // Track user's selection for "Most Popular" logic
    const selectionCounts = JSON.parse(localStorage.getItem('plan_selection_counts') || '{}');
    selectionCounts[planId] = (selectionCounts[planId] || 0) + 1;
    localStorage.setItem('plan_selection_counts', JSON.stringify(selectionCounts));

    if (isInTelegram) {
      // Switch to checkout flow within mini app
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'checkout');
      url.searchParams.set('plan', planId);
      if (promoValidation?.valid) {
        url.searchParams.set('promo', promoCode);
      }
      window.history.pushState({}, '', url.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      // For web users, redirect to Telegram bot
      const botUsername = "Dynamic_VIP_BOT";
      const telegramUrl = `https://t.me/${botUsername}?start=plan_${planId}`;
      window.open(telegramUrl, '_blank');
      toast.info('Redirecting to Telegram to complete your purchase');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading plans...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <FadeInOnView>
      <div className="ui-stack-base">
        <Card className="liquid-glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-subheading">
              <CreditCard className="icon-sm animate-pulse-glow" />
              VIP Plans
            </CardTitle>
            <CardDescription className="text-body-sm">Choose your subscription plan and start trading like a pro</CardDescription>
          </CardHeader>
          <CardContent className="ui-stack-base prose">
            {/* Currency Selector */}
            <FadeInOnView delay={100}>
              <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                <div>
                  <h4 className="font-medium">Select Currency</h4>
                  <p className="text-sm text-muted-foreground">
                    Exchange rate: 1 USD = {exchangeRate} MVR
                  </p>
                </div>
                <CurrencySelector value={currency} onChange={setCurrency} />
              </div>
            </FadeInOnView>

            {/* Promo Code Section */}
            {isInTelegram && (
              <FadeInOnView delay={200} animation="slide-in-right">
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Have a promo code?</span>
                  </div>
                  <div className="flex gap-2">
                    <InputField
                      placeholder="Enter promo code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      startIcon="Sparkles"
                      state={promoValidation?.valid ? "success" : promoValidation?.valid === false ? "error" : "default"}
                      error={promoValidation?.valid === false ? promoValidation.reason : undefined}
                      success={promoValidation?.valid ? `${promoValidation.discount_type === 'percentage' ? promoValidation.discount_value + '%' : '$' + promoValidation.discount_value} discount applied!` : undefined}
                      description="Enter a promo code to get discount"
                      className="flex-1"
                    />
                    <Button 
                      onClick={validatePromoCode} 
                      disabled={!promoCode.trim() || validatingPromo}
                      isLoading={validatingPromo}
                      size="sm"
                      className="hover:scale-105 transition-transform"
                    >
                      {validatingPromo ? "..." : "Apply"}
                    </Button>
                  </div>
                  {promoValidation && (
                    <div className={`text-xs p-2 rounded transition-all duration-300 ${promoValidation.valid ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                      {promoValidation.valid 
                        ? `${promoValidation.discount_type === 'percentage' ? promoValidation.discount_value + '%' : '$' + promoValidation.discount_value} discount applied!`
                        : promoValidation.reason
                      }
                    </div>
                  )}
                </div>
              </FadeInOnView>
            )}

            {!isInTelegram && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="text-sm text-blue-600 text-center">
                  💡 For the full experience with promo codes and instant payments, open in Telegram
                </div>
              </div>
            )}

            {/* Plans */}
            <HorizontalSnapScroll 
              itemWidth="clamp(260px, 82vw, 300px)" 
              gap="clamp(0.75rem, 2vw, 1rem)"
              className="pb-4 scroll-padding-mobile"
              showArrows={plans.length > 1}
            >
              {plans.map((plan, index) => (
                 <div 
                   key={plan.id} 
                   className="liquid-glass relative ui-p-lg ui-rounded-xl hover:scale-105 transition-all duration-300 cursor-pointer group"
                   style={{ animationDelay: `${index * 150}ms` }}
                   onClick={() => handleSelectPlan(plan.id)}
                 >
                  <div className="flex justify-between items-start ui-mb-base">
                     <div className="ui-stack-xs">
                       <div className="flex items-center gap-2">
                         <h4 className="font-semibold text-heading font-sf-pro text-foreground">{plan.name}</h4>
                        {(plan.id === userPreferredPlanId || (plan.id === popularPlanId && !userPreferredPlanId)) && (
                          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs animate-pulse ui-p-xs">
                            <Star className="icon-xs ui-mr-xs" />
                            Most Popular
                          </Badge>
                        )}
                        {plan.id !== popularPlanId && index === 0 && (
                          <Badge variant="outline" className="text-xs ui-p-xs">
                            <TrendingUp className="icon-xs ui-mr-xs" />
                            Best Value
                          </Badge>
                        )}
                      </div>
                       <p className="text-body-sm text-muted-foreground font-sf-pro">
                         {plan.is_lifetime ? 'Lifetime access' : `${plan.duration_months} month${plan.duration_months > 1 ? 's' : ''}`}
                       </p>
                    </div>
                    <div className="text-right ui-stack-xs">
                      <div className="text-title font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                        {currency === "MVR" ? "Rf" : "$"}{promoValidation?.valid && promoValidation.final_amount ? 
                          (currency === "MVR" ? Math.round(promoValidation.final_amount * exchangeRate) : promoValidation.final_amount) : 
                          getDisplayPrice(plan)}
                      </div>
                      {promoValidation?.valid && promoValidation.final_amount !== plan.price && (
                        <div className="text-body-sm text-muted-foreground line-through">
                          {currency === "MVR" ? "Rf" : "$"}{getDisplayPrice(plan)}
                        </div>
                      )}
                      <div className="text-caption text-muted-foreground font-medium">{currency}</div>
                      {currency === "MVR" && (
                        <div className="text-caption text-muted-foreground">
                          ≈ ${Math.round(plan.price)} USD
                        </div>
                      )}
                    </div>
                  </div>

                  {plan.features && plan.features.length > 0 && (
                    <div className="ui-mb-base">
                      <div className="ui-stack-sm">
                        {plan.features.slice(0, 3).map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <Check className="icon-xs text-green-500" />
                            <span className="text-body-sm text-foreground">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                   <Button 
                     className="w-full liquid-glass-button text-foreground hover:scale-105 transition-all duration-300 ui-rounded-full text-body-sm font-medium font-sf-pro"
                   >
                     {isInTelegram ? 'Select Plan' : 'Open in Telegram'}
                   </Button>
                </div>
              ))}
            </HorizontalSnapScroll>

            <FadeInOnView delay={800} animation="bounce-in">
              <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg">
                <div className="text-center">
                  <Sparkles className="h-8 w-8 text-primary mx-auto mb-2 animate-pulse-glow" />
                  <h3 className="font-semibold mb-2">Why Choose VIP?</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="hover:text-primary transition-colors">• Premium signals</div>
                    <div className="hover:text-primary transition-colors">• 24/7 support</div>
                    <div className="hover:text-primary transition-colors">• Exclusive analysis</div>
                    <div className="hover:text-primary transition-colors">• Mobile app access</div>
                  </div>
                </div>
              </div>
            </FadeInOnView>
          </CardContent>
        </Card>
      </div>
    </FadeInOnView>
  );
}