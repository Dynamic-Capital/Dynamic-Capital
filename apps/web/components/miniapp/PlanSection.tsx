import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MotionCard, MotionCardContainer } from "@/components/ui/motion-card";
import { Interactive3DCard, StaggeredGrid, RippleCard, LiquidCard } from "@/components/ui/interactive-cards";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Sparkles, Check, Star, TrendingUp } from "lucide-react";
import { HorizontalSnapScroll } from "@/components/ui/horizontal-snap-scroll";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import { CurrencySelector } from "./CurrencySelector";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { parentVariants, childVariants, fastParentVariants } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { callEdgeFunction } from "@/config/supabase";

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

interface ContentItem {
  content_key: string;
  content_value: string;
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
    const fetchData = async () => {
      try {
        const { callEdgeFunction } = await import('@/config/supabase');
        const [plansResult, contentResult] = await Promise.all([
          callEdgeFunction('PLANS'),
          callEdgeFunction('CONTENT_BATCH', {
            method: 'POST',
            body: { keys: ["popular_plan_id"] }
          })
        ]);

        if (plansResult.status !== 200 || contentResult.status !== 200) {
          throw new Error('Failed to load data');
        }

        setPlans((plansResult.data as any)?.plans || []);

        const contents: ContentItem[] = (contentResult.data as any)?.contents || [];
        const popularContent = contents.find((c) => c.content_key === 'popular_plan_id');

        if (popularContent) {
          setPopularPlanId(popularContent.content_value);
        }

        // Check user's selection history for most preferred plan
        const selectionCounts: Record<string, number> = JSON.parse(
          localStorage.getItem('plan_selection_counts') || '{}'
        );
        if (Object.keys(selectionCounts).length > 0) {
          const mostSelected = Object.entries(selectionCounts).reduce(
            (a, b) => (selectionCounts[a[0]] > selectionCounts[b[0]] ? a : b),
            ['', 0]
          );
          if (mostSelected[1] > 0) {
            setUserPreferredPlanId(mostSelected[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load subscription plans');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Auto-validate promo code if pre-filled from URL
  useEffect(() => {
    if (promoCode.trim() && plans.length > 0 && !promoValidation) {
      validatePromoCode();
    }
  }, [promoCode, plans.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const validatePromoCode = async () => {
    if (!promoCode.trim()) return;
    
    setValidatingPromo(true);
    try {
      // For web users without Telegram, we still allow promo validation but with fallback user ID
      const telegramUserId = isInTelegram ? window.Telegram?.WebApp?.initDataUnsafe?.user?.id : null;
      const selectedPlanId = plans[0]?.id;
      
      if (!selectedPlanId) {
        toast.error('No plans available');
        return;
      }

      const { data, status } = await callEdgeFunction('PROMO_VALIDATE', {
        method: 'POST',
        body: {
          code: promoCode,
          telegram_id: telegramUserId || 'web-user',
          plan_id: selectedPlanId
        }
      });

      if (status !== 200 || !data) {
        throw new Error('Network error');
      }

      setPromoValidation(data);

      if ((data as any).valid) {
        toast.success(`Promo code applied! ${(data as any).discount_type === 'percentage' ? (data as any).discount_value + '%' : '$' + (data as any).discount_value} discount`);
      } else {
        toast.error((data as any).reason || 'Invalid promo code');
      }
    } catch (error) {
      console.error('Promo validation error:', error);
      toast.error('Failed to validate promo code. Please try again.');
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
      // For web users, show enhanced payment section
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'checkout');
      url.searchParams.set('plan', planId);
      if (promoValidation?.valid) {
        url.searchParams.set('promo', promoCode);
      }
      window.history.pushState({}, '', url.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
      toast.info('Proceeding to payment options');
    }
  };

  if (loading) {
    return (
      <MotionCard variant="glass" animate={true}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading plans...</div>
        </CardContent>
      </MotionCard>
    );
  }

  return (
    <FadeInOnView>
      <div className="ui-stack-base">
        <LiquidCard className="liquid-glass" color="hsl(var(--primary))">
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
            <FadeInOnView delay={200} animation="slide-in-right">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Have a promo code?</span>
                  {!isInTelegram && (
                    <Badge variant="outline" className="text-xs">
                      Web Preview
                    </Badge>
                  )}
                </div>
                 <div className="flex gap-2">
                   <input
                     type="text"
                     placeholder="Enter promo code"
                     value={promoCode}
                     onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                     className={cn(
                       "flex-1 min-h-[44px] px-4 py-2 ui-rounded-lg border transition-all duration-200",
                       "placeholder:text-muted-foreground font-medium",
                       promoValidation?.valid === true && "border-green-500 ring-2 ring-green-500/20",
                      promoValidation?.valid === false && "border-dc-brand ring-2 ring-dc-brand/20",
                       !promoValidation && "border-border hover:border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20"
                     )}
                   />
                   <Button 
                     onClick={validatePromoCode} 
                     disabled={!promoCode.trim() || validatingPromo}
                     isLoading={validatingPromo}
                     className="min-h-[44px] px-6 font-semibold"
                   >
                     {validatingPromo ? "..." : "Apply"}
                   </Button>
                 </div>
                {promoValidation && (
                  <div className={`text-xs p-2 rounded transition-all duration-300 ${promoValidation.valid ? 'bg-green-500/10 text-green-600' : 'bg-dc-brand/10 text-dc-brand-dark'}`}>
                    {promoValidation.valid 
                      ? `${promoValidation.discount_type === 'percentage' ? promoValidation.discount_value + '%' : '$' + promoValidation.discount_value} discount applied!`
                      : promoValidation.reason
                    }
                  </div>
                )}
              </div>
            </FadeInOnView>

            {!isInTelegram && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="text-sm text-blue-600 text-center">
                  💡 For the full experience with instant payments and account management, 
                  <a 
                    href="https://t.me/Dynamic_VIP_BOT" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline ml-1 hover:text-blue-800"
                  >
                    open in Telegram
                  </a>
                </div>
              </div>
            )}

            {/* Plans */}
            <motion.div
              variants={parentVariants}
              initial="hidden"
              animate="visible"
            >
              <StaggeredGrid columns={1} staggerDelay={0.2} className="!grid-cols-1">
                {plans.map((plan, index) => (
                  <Interactive3DCard
                    key={plan.id}
                    intensity={0.1}
                    scale={1.03}
                    glowEffect={true}
                    onClick={() => handleSelectPlan(plan.id)}
                    className="group cursor-pointer"
                  >
                    <motion.div 
                      className="flex justify-between items-start ui-mb-base"
                      variants={childVariants}
                    >
                      <div className="ui-stack-xs">
                        <div className="flex items-center gap-2">
                          <motion.h4 
                            className="font-semibold text-heading font-sf-pro text-foreground"
                            whileHover={{ scale: 1.05 }}
                          >
                            {plan.name}
                          </motion.h4>
                          <AnimatePresence>
                            {(plan.id === userPreferredPlanId || (plan.id === popularPlanId && !userPreferredPlanId)) && (
                              <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 180 }}
                                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                              >
                                <Badge className="bg-gradient-to-r from-orange-500 to-dc-brand text-white text-xs animate-pulse ui-p-xs">
                                  <motion.div
                                    animate={{ rotate: [0, 15, -15, 0] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                  >
                                    <Star className="icon-xs ui-mr-xs" />
                                  </motion.div>
                                  Most Popular
                                </Badge>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          {plan.id !== popularPlanId && index === 0 && (
                            <motion.div
                              initial={{ scale: 0, y: -10 }}
                              animate={{ scale: 1, y: 0 }}
                              transition={{ delay: 0.5 }}
                            >
                              <Badge variant="outline" className="text-xs ui-p-xs">
                                <TrendingUp className="icon-xs ui-mr-xs" />
                                Best Value
                              </Badge>
                            </motion.div>
                          )}
                        </div>
                        <motion.p
                          className="text-body-sm text-muted-foreground font-sf-pro"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.1 + 0.3 }}
                        >
                          {plan.is_lifetime ? 'Lifetime access' : `${plan.duration_months} month${plan.duration_months > 1 ? 's' : ''}`}
                        </motion.p>
                        <motion.p
                          className="text-body-xs text-muted-foreground mt-1"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.1 + 0.35 }}
                        >
                          Priority signals, VIP chat access & daily analysis
                        </motion.p>
                      </div>
                      <motion.div 
                        className="text-right ui-stack-xs"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 + 0.2 }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <motion.div 
                          className="text-title font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent"
                          animate={{ 
                            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                          }}
                          transition={{ 
                            duration: 3, 
                            repeat: Infinity,
                            ease: "linear"
                          }}
                          style={{ backgroundSize: "200% 200%" }}
                        >
                          {currency === "MVR" ? "Rf" : "$"}{promoValidation?.valid && promoValidation.final_amount ? 
                            (currency === "MVR" ? Math.round(promoValidation.final_amount * exchangeRate) : promoValidation.final_amount) : 
                            getDisplayPrice(plan)}
                        </motion.div>
                        <AnimatePresence>
                          {promoValidation?.valid && promoValidation.final_amount !== plan.price && (
                            <motion.div 
                              className="text-body-sm text-muted-foreground line-through"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                            >
                              {currency === "MVR" ? "Rf" : "$"}{getDisplayPrice(plan)}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <div className="text-caption text-muted-foreground font-medium">{currency}</div>
                        {currency === "MVR" && (
                          <div className="text-caption text-muted-foreground">
                            ≈ ${Math.round(plan.price)} USD
                          </div>
                        )}
                      </motion.div>
                    </motion.div>

                    {plan.features && plan.features.length > 0 && (
                      <motion.div 
                        className="ui-mb-base"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 + 0.4 }}
                      >
                        <div className="ui-stack-sm">
                          {plan.features.slice(0, 3).map((feature, idx) => (
                            <motion.div 
                              key={idx} 
                              className="flex items-center gap-3"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 + 0.5 + idx * 0.1 }}
                              whileHover={{ x: 5 }}
                            >
                              <motion.div
                                whileHover={{ scale: 1.2, rotate: 360 }}
                                transition={{ duration: 0.3 }}
                              >
                                <Check className="icon-xs text-green-500" />
                              </motion.div>
                              <span className="text-body-sm text-foreground">{feature}</span>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Button 
                        className="w-full liquid-glass-button text-foreground hover:scale-105 transition-all duration-300 ui-rounded-full text-body-sm font-medium font-sf-pro"
                      >
                        {isInTelegram ? 'Select Plan' : 'Open in Telegram'}
                      </Button>
                    </motion.div>
                  </Interactive3DCard>
                ))}
              </StaggeredGrid>
            </motion.div>

            <FadeInOnView delay={800} animation="bounce-in">
              <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-dc-brand-light/10 rounded-lg">
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
        </LiquidCard>
      </div>
    </FadeInOnView>
  );
}