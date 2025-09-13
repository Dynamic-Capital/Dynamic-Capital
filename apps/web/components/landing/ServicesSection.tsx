"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MotionStagger, MotionScrollReveal, MotionHoverCard } from "@/components/ui/motion-components";
import { 
  CreditCard, 
  Coins, 
  Crown, 
  Star, 
  Zap, 
  TrendingUp,
  Shield,
  Users,
  CheckCircle,
  ArrowRight
} from "lucide-react";

interface ServicesSectionProps {
  onSelectPlan?: (planId: string) => void;
  onBankPayment?: () => void;
  onCryptoPayment?: () => void;
}

const ServicesSection = ({ onSelectPlan, onBankPayment, onCryptoPayment }: ServicesSectionProps) => {
  const plans = [
    {
      id: "basic",
      name: "VIP Basic",
      price: "$99",
      period: "month",
      description: "Perfect for new traders",
      features: [
        "5-10 Premium Signals Daily",
        "Basic Market Analysis",
        "Telegram Bot Access",
        "Email Support"
      ],
      icon: Star,
      popular: false,
      gradient: "from-[hsl(var(--dc-secondary))] to-[hsl(var(--accent-teal))]"
    },
    {
      id: "premium",
      name: "VIP Premium",
      price: "$199",
      period: "month",
      description: "Most popular choice",
      features: [
        "15-20 Premium Signals Daily",
        "Advanced Market Analysis",
        "VIP Community Access",
        "Risk Management Tools",
        "Priority Support",
        "Webinar Access"
      ],
      icon: Crown,
      popular: true,
      gradient: "from-[hsl(var(--primary))] to-[hsl(var(--dc-accent))]"
    },
    {
      id: "elite",
      name: "VIP Elite",
      price: "$299",
      period: "month",
      description: "For serious traders",
      features: [
        "Unlimited Premium Signals",
        "1-on-1 Trading Coaching",
        "Exclusive Elite Strategies",
        "Custom Risk Analysis",
        "24/7 VIP Support",
        "Monthly Strategy Calls",
        "Portfolio Review"
      ],
      icon: Zap,
      popular: false,
      gradient: "from-[hsl(var(--accent-gold))] to-[hsl(var(--accent-pink))]"
    }
  ];

  const paymentMethods = [
    {
      title: "Bank Transfer",
      description: "Secure bank-to-bank transfer",
      icon: CreditCard,
      color: "from-[hsl(var(--accent-green))] to-[hsl(var(--accent-green-light))]",
      onClick: onBankPayment
    },
    {
      title: "Cryptocurrency",
      description: "Bitcoin, USDT, and more",
      icon: Coins,
      color: "from-[hsl(var(--accent-gold))] to-[hsl(var(--accent-yellow))]",
      onClick: onCryptoPayment
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-muted/20 via-background to-muted/10 relative">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-[hsl(var(--primary)/0.1)] to-[hsl(var(--dc-accent)/0.1)] rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-[hsl(var(--dc-secondary)/0.1)] to-[hsl(var(--accent-teal)/0.1)] rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <div className="container mx-auto px-6 relative">
        <MotionScrollReveal>
          <div className="text-center mb-16">
            <Badge className="mb-6 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.3)] text-lg px-6 py-2">
              <Crown className="w-5 h-5 mr-2" />
              VIP Subscription Plans
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 font-poppins text-foreground">
              Choose Your Trading Journey
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-inter leading-relaxed">
              Unlock premium trading signals and exclusive market insights tailored to your experience level
            </p>
          </div>
        </MotionScrollReveal>

        {/* Subscription Plans */}
        <MotionStagger staggerDelay={0.2} className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <MotionHoverCard key={plan.id} hoverScale={plan.popular ? 1.08 : 1.05} hoverY={-15}>
              <Card className={`relative overflow-hidden ${plan.popular ? 'ring-2 ring-primary scale-105' : ''} hover:shadow-2xl transition-all duration-500`}>
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary to-[hsl(var(--dc-accent))] text-white text-center py-2 text-sm font-bold">
                    MOST POPULAR
                  </div>
                )}
                
                <CardHeader className={`text-center ${plan.popular ? 'pt-12' : 'pt-8'}`}>
                  <div className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-br ${plan.gradient} rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}>
                    <plan.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold font-poppins">{plan.name}</CardTitle>
                  <div className="text-3xl font-black text-primary">
                    {plan.price}<span className="text-lg font-normal text-muted-foreground">/{plan.period}</span>
                  </div>
                  <p className="text-muted-foreground font-inter">{plan.description}</p>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3 font-inter">
                        <CheckCircle className="w-5 h-5 text-[hsl(var(--accent-green))] flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full mt-6 ${plan.popular ? 'bg-primary hover:bg-primary/90' : 'bg-muted hover:bg-muted/80'} font-semibold`}
                    onClick={() => onSelectPlan?.(plan.id)}
                  >
                    {plan.popular ? 'Start Premium' : 'Choose Plan'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </MotionHoverCard>
          ))}
        </MotionStagger>

        {/* Payment Methods */}
        <MotionScrollReveal>
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-4 font-poppins text-foreground">
              Secure Payment Options
            </h3>
            <p className="text-lg text-muted-foreground font-inter">
              Choose your preferred payment method for seamless subscription activation
            </p>
          </div>
        </MotionScrollReveal>

        <MotionStagger staggerDelay={0.3} className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {paymentMethods.map((method, index) => (
            <MotionHoverCard key={method.title} hoverScale={1.05} hoverY={-8}>
              <Card className="bot-card group hover:shadow-xl transition-all duration-300 cursor-pointer" onClick={method.onClick}>
                <CardContent className="p-8 text-center">
                  <div className={`w-16 h-16 mx-auto mb-6 bg-gradient-to-br ${method.color} rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}>
                    <method.icon className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors font-poppins">
                    {method.title}
                  </h4>
                  <p className="text-muted-foreground font-inter">{method.description}</p>
                  <Button variant="outline" className="mt-4" onClick={method.onClick}>
                    Select Method
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </MotionHoverCard>
          ))}
        </MotionStagger>

        {/* Features Comparison */}
        <MotionScrollReveal>
          <div className="mt-20 text-center">
            <Badge className="mb-6 bg-[hsl(var(--accent-light)/0.1)] text-[hsl(var(--accent-light))] border-[hsl(var(--accent-light)/0.3)] text-lg px-6 py-2">
              <Shield className="w-5 h-5 mr-2" />
              All Plans Include
            </Badge>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { icon: TrendingUp, title: "Daily Signals", desc: "Professional trading alerts" },
                { icon: Shield, title: "Risk Management", desc: "Protect your capital" },
                { icon: Users, title: "Community Access", desc: "Connect with traders" }
              ].map((feature, index) => (
                <div key={feature.title} className="text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-primary to-[hsl(var(--dc-accent))] rounded-full flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h5 className="font-semibold mb-2 font-poppins">{feature.title}</h5>
                  <p className="text-sm text-muted-foreground font-inter">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </MotionScrollReveal>
      </div>
    </section>
  );
};

export default ServicesSection;