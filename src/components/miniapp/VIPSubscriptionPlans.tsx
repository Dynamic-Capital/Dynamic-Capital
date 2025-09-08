import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Interactive3DCard } from '@/components/ui/interactive-cards';
import { FadeInOnView } from '@/components/ui/fade-in-on-view';
import { 
  Crown, 
  Star, 
  TrendingUp, 
  Shield, 
  Zap, 
  Award,
  CheckCircle,
  Gift,
  Sparkles
} from 'lucide-react';
import { ThreeDEmoticon } from '@/components/ui/three-d-emoticons';
import { cn } from '@/lib/utils';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_months: number;
  is_lifetime: boolean;
  features: string[];
  popular?: boolean;
  savings?: string;
}

interface VIPSubscriptionPlansProps {
  onSelectPlan?: (planId: string) => void;
  compact?: boolean;
}

export function VIPSubscriptionPlans({ onSelectPlan, compact = false }: VIPSubscriptionPlansProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      
      // Import supabase client
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Try fetching from the plans edge function first
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke("plans");
      
      if (!edgeError && edgeData?.plans) {
        const mappedPlans = edgeData.plans.map((plan: any, index: number) => ({
          id: plan.id,
          name: plan.name,
          price: plan.price,
          duration_months: plan.duration_months,
          is_lifetime: plan.is_lifetime || false,
          currency: plan.currency || 'USD',
          features: plan.features || [],
          popular: index === 1, // Make second plan popular
          savings: plan.duration_months >= 6 ? '25% OFF' : plan.duration_months >= 3 ? '15% OFF' : undefined
        }));
        setPlans(mappedPlans);
        setLoading(false);
        return;
      }
      
      // Fallback to direct Supabase query
      const { data: plans, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (plans) {
        // Add popular and savings info
        const enhancedPlans = plans.map((plan: any, index: number) => ({
          ...plan,
          popular: index === 1, // Make second plan popular
          savings: plan.duration_months >= 6 ? '25% OFF' : plan.duration_months >= 3 ? '15% OFF' : undefined
        }));
        setPlans(enhancedPlans);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (planId: string) => {
    if (onSelectPlan) {
      onSelectPlan(planId);
    } else {
      // Default navigation
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'plan');
      url.searchParams.set('selected', planId);
      window.history.pushState({}, '', url.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const getPlanIcon = (index: number) => {
    switch (index) {
      case 0: return <Star className="h-6 w-6" />;
      case 1: return <Crown className="h-6 w-6" />;
      case 2: return <Award className="h-6 w-6" />;
      default: return <TrendingUp className="h-6 w-6" />;
    }
  };

  const getPlanColor = (index: number, popular: boolean) => {
    if (popular) return 'from-dc-brand to-dc-brand-dark';
    switch (index) {
      case 0: return 'from-blue-500 to-blue-600';
      case 1: return 'from-dc-brand to-dc-brand-dark';
      case 2: return 'from-red-500 to-red-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3"></div>
              <div className="h-8 bg-muted rounded w-1/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-4 bg-muted rounded w-full"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.slice(0, 3).map((plan, index) => (
          <Interactive3DCard
            key={plan.id}
            intensity={0.1}
            scale={1.02}
            className="relative overflow-hidden"
          >
            <Card className="h-full border-0">
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-dc-brand to-dc-brand-dark text-white text-center py-1 text-xs font-medium">
                  MOST POPULAR
                </div>
              )}
              <CardHeader className={cn("text-center", plan.popular && "pt-8")}>
                <div className={`w-12 h-12 mx-auto rounded-full bg-gradient-to-r ${getPlanColor(index, plan.popular)} flex items-center justify-center text-white mb-2`}>
                  {getPlanIcon(index)}
                </div>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-dc-brand">${plan.price}</div>
                  <div className="text-sm text-muted-foreground">
                    {plan.is_lifetime ? 'One-time payment' : `${plan.duration_months} month${plan.duration_months > 1 ? 's' : ''}`}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => handleSelectPlan(plan.id)}
                  className={cn(
                    "w-full",
                    plan.popular && "bg-dc-brand hover:bg-dc-brand-dark"
                  )}
                >
                  Choose Plan
                </Button>
              </CardContent>
            </Card>
          </Interactive3DCard>
        ))}
      </div>
    );
  }

  return (
    <FadeInOnView delay={100} animation="fade-in-up">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ThreeDEmoticon emoji="👑" size={32} intensity={0.4} animate={true} />
            <h2 className="text-2xl font-bold bg-gradient-to-r from-dc-brand to-dc-brand-dark bg-clip-text text-transparent">
              VIP Subscription Plans
            </h2>
            <ThreeDEmoticon emoji="✨" size={28} intensity={0.3} animate={true} />
          </div>
          <p className="text-muted-foreground">
            Choose the perfect plan to elevate your trading journey
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Interactive3DCard
                  intensity={plan.popular ? 0.15 : 0.1}
                  scale={plan.popular ? 1.03 : 1.02}
                  glowEffect={plan.popular}
                  className="relative overflow-hidden group"
                >
                  <Card className={cn(
                    "h-full border-2 transition-all duration-300",
                    plan.popular ? "border-dc-brand shadow-lg shadow-dc-brand/20" : "border-border hover:border-dc-brand-light"
                  )}>
                    {/* Popular Badge */}
                    {plan.popular && (
                      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-dc-brand to-dc-brand-dark text-white text-center py-2 font-medium">
                        <div className="flex items-center justify-center gap-1">
                          <Crown className="h-4 w-4" />
                          MOST POPULAR
                          <Sparkles className="h-4 w-4" />
                        </div>
                      </div>
                    )}

                    {/* Savings Badge */}
                    {plan.savings && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge className="bg-green-500 text-white">
                          <Gift className="h-3 w-3 mr-1" />
                          {plan.savings}
                        </Badge>
                      </div>
                    )}

                    <CardHeader className={cn(
                      "text-center relative",
                      plan.popular && "pt-12"
                    )}>
                      {/* Plan Icon */}
                      <motion.div 
                        className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-r ${getPlanColor(index, plan.popular)} flex items-center justify-center text-white mb-4 shadow-lg`}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      >
                        {getPlanIcon(index)}
                      </motion.div>

                      <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                      
                      {/* Pricing */}
                      <div className="space-y-1">
                        <div className="text-3xl font-bold text-dc-brand">
                          ${plan.price}
                          <span className="text-base text-muted-foreground ml-1">
                            {plan.currency}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {plan.is_lifetime 
                            ? 'Lifetime Access' 
                            : `${plan.duration_months} month${plan.duration_months > 1 ? 's' : ''}`
                          }
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Features */}
                      <div className="space-y-2">
                        {plan.features.map((feature, fIndex) => (
                          <motion.div
                            key={fIndex}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: (index * 0.1) + (fIndex * 0.05) }}
                            className="flex items-center gap-2 text-sm"
                          >
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span>{feature}</span>
                          </motion.div>
                        ))}
                      </div>

                      {/* CTA Button */}
                      <Button 
                        onClick={() => handleSelectPlan(plan.id)}
                        className={cn(
                          "w-full font-semibold transition-all duration-300 group-hover:shadow-lg",
                          plan.popular 
                            ? "bg-dc-brand hover:bg-dc-brand-dark shadow-dc-brand/20"
                            : "hover:bg-dc-brand hover:text-white"
                        )}
                        size="lg"
                      >
                        {plan.popular ? (
                          <motion.div 
                            className="flex items-center gap-2"
                            whileHover={{ scale: 1.05 }}
                          >
                            <Crown className="h-4 w-4" />
                            Choose This Plan
                            <Zap className="h-4 w-4" />
                          </motion.div>
                        ) : (
                          "Select Plan"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </Interactive3DCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Features Summary */}
        <div className="mt-8 p-6 bg-gradient-to-r from-dc-brand/10 to-dc-brand-dark/10 rounded-lg border border-dc-brand/20">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Shield className="h-6 w-6 text-dc-brand" />
              <h3 className="text-lg font-semibold">All Plans Include</h3>
              <Shield className="h-6 w-6 text-dc-brand" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>24/7 Support</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Money Back Guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Instant Access</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>No Hidden Fees</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FadeInOnView>
  );
}