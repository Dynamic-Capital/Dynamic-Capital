import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard,
  Check,
  Star,
  Zap,
  Users,
  TrendingUp,
  ArrowLeft,
  Loader2,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatPrice } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { HorizontalSnapScroll } from "@/components/ui/horizontal-snap-scroll";
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

const Plans: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data } = await callEdgeFunction('PLANS');

      if ((data as any)?.plans) {
        setPlans((data as any).plans);
      } else {
        setError('No plans available');
      }
    } catch (error) {
      setError('Failed to load plans');
      toast.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

    const handleSelectPlan = (planId: string) => {
      navigate(`/checkout?plan=${planId}`);
    };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <div className="max-w-4xl mx-auto">
          <Alert className="max-w-md mx-auto mt-20">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const popularPlanId = plans.length > 1 ? plans[1].id : plans[0]?.id;

  const peelVariants = {
    hidden: { opacity: 0, rotateX: -15, y: 40 },
    visible: {
      opacity: 1,
      rotateX: 0,
      y: 0,
      transition: { type: "spring", stiffness: 260, damping: 24 }
    }
  };

  const renderPlanCard = (plan: Plan, index: number) => {
    const isPopular = plan.id === popularPlanId;
    const isLifetime = plan.is_lifetime;

    return (
      <motion.div
        key={plan.id}
        variants={peelVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        transition={{ delay: index * 0.1 }}
        className="h-full"
      >
        <Card
          className={cn(
            "relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 h-full",
            isPopular && "border-primary shadow-lg scale-105"
          )}
        >
          {isPopular && (
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs font-medium py-2 text-center">
              Most Popular
            </div>
          )}

          <CardHeader className={cn("text-center", isPopular && "pt-8")}> 
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                {isLifetime && <Star className="h-5 w-5 text-yellow-500" />}
                {plan.name}
              </CardTitle>
              <CardDescription>
                {isLifetime ? "One-time payment, lifetime access" : `${plan.duration_months} month subscription`}
              </CardDescription>
            </div>

            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary flex items-baseline justify-center gap-1">
                {formatPrice(plan.price, plan.currency)}
                {!isLifetime && (
                  <span className="text-lg text-muted-foreground">/mo</span>
                )}
              </div>
              {isLifetime && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  <Star className="h-3 w-3 mr-1" />
                  Lifetime Deal
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {plan.features && plan.features.length > 0 && (
              <div className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <Check className="h-4 w-4 text-green-500" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={() => handleSelectPlan(plan.id)}
              className={cn(
                "w-full h-12 text-lg font-semibold transition-all duration-300",
                isPopular
                  ? "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl"
                  : "hover:scale-105"
              )}
              size="lg"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Get Started
              {isLifetime && <Zap className="h-4 w-4 ml-2 text-yellow-300" />}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
            aria-label="Go back to previous page"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            VIP Trading Plans
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Choose Your Trading Edge
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Get access to premium signals, exclusive analysis, and our community of successful traders.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="sr-only">Loading plans...</span>
          </div>
        )}

        {/* Plans Grid */}
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="relative overflow-hidden">
                  <CardHeader className="space-y-4">
                    <Skeleton className="h-7 w-3/4 mx-auto" />
                    <Skeleton className="h-4 w-1/2 mx-auto" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-1/2 mx-auto" />
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="h-4 w-4 rounded-full" />
                          <Skeleton className="h-4 flex-1" />
                        </div>
                      ))}
                    </div>
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="md:hidden">
                <HorizontalSnapScroll
                  itemWidth="clamp(280px,85vw,340px)"
                  gap="1rem"
                  showArrows={plans.length > 1}
                  className="pb-4"
                >
                  {plans.map((plan, index) => renderPlanCard(plan, index))}
                </HorizontalSnapScroll>
              </div>
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan, index) => renderPlanCard(plan, index))}
              </div>
            </>
          )}
        </div>

        {/* Why VIP Section */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                Why Choose VIP?
              </CardTitle>
              <CardDescription className="text-lg">
                Join our community of successful traders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">Premium Signals</h3>
                  <p className="text-sm text-muted-foreground">
                    Get high-quality trading signals with detailed analysis and entry/exit points.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">Exclusive Community</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect with like-minded traders and learn from experienced professionals.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">24/7 Support</h3>
                  <p className="text-sm text-muted-foreground">
                    Get instant support and guidance whenever you need it.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Support */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold">Need Help Choosing?</h3>
          <p className="text-muted-foreground">
            Our team is here to help you select the perfect plan for your trading needs.
          </p>
          <Button 
            variant="outline" 
            onClick={() => window.open('https://t.me/Dynamic_VIP_BOT', '_blank')}
            className="hover:scale-105 transition-transform duration-200"
          >
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Plans;
