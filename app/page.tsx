"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MotionFadeIn, MotionScrollReveal, MotionStagger, MotionHoverCard } from "@/components/ui/motion-components";
import { MotionSection } from "@/components/ui/motion-theme";
import { FullscreenAdaptive } from "@/components/ui/responsive-motion";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LivePlansSection } from "@/components/shared/LivePlansSection";
import { ServiceStack } from "@/components/shared/ServiceStack";
import MiniAppPreview from "@/components/telegram/MiniAppPreview";
import HeroSection from "@/components/landing/HeroSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FeatureGrid from "@/components/landing/FeatureGrid";
import CTASection from "@/components/landing/CTASection";
import { Award, Crown, Target, DollarSign, TrendingUp, Zap, CheckCircle, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

const Landing = () => {
  const handleOpenTelegram = () => {
    const botUsername = "Dynamic_VIP_BOT";
    const telegramUrl = `https://t.me/${botUsername}`;
    window.open(telegramUrl, '_blank');
  };

  const handleJoinNow = () => {
    const isInTelegram = Boolean(
      window.Telegram?.WebApp?.initData ||
      window.Telegram?.WebApp?.initDataUnsafe ||
      window.location.search.includes('tgWebAppPlatform') ||
      navigator.userAgent.includes('TelegramWebApp')
    );

    if (isInTelegram) {
      window.location.href = '/miniapp?tab=plan';
    } else {
      window.location.href = '/plans';
    }
  };

  return (
    <FullscreenAdaptive className="min-h-screen bg-background font-inter text-foreground">
      {/* Floating Theme Toggle */}
      <ThemeToggle />
      <HeroSection onOpenTelegram={handleOpenTelegram} />
      <Separator className="my-16 bg-[hsl(var(--accent-light)/0.2)]" />
      <TestimonialsSection />
      <Separator className="my-16" />
      {/* Services Section */}
      <MotionSection variant="fadeUp" className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <MotionScrollReveal>
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                <Award className="w-4 h-4 mr-2" />
                Premium Services
              </Badge>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 font-poppins text-foreground">Everything You Need to Succeed</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-inter leading-relaxed">
                Comprehensive trading solutions designed for maximum profitability
              </p>
            </div>
          </MotionScrollReveal>

          <ServiceStack 
            services="📈 Real-time Trading Signals
📊 Daily Market Analysis  
🛡️ Risk Management Guidance
👨‍🏫 Personal Trading Mentor
💎 Exclusive VIP Community
📞 24/7 Customer Support" 
          />
        </div>
      </MotionSection>
      <Separator className="my-16" />
      <FeatureGrid />
      {/* Live Plans Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <MotionScrollReveal>
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                <Crown className="w-4 h-4 mr-2" />
                VIP Membership
              </Badge>
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Choose Your Trading Plan</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Flexible plans designed to match your trading goals and experience level
              </p>
            </div>
          </MotionScrollReveal>
          
          <LivePlansSection showPromo={true} showHeader={false} />
        </div>
      </section>
      {/* How It Works */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/20 relative">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--primary)/0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>
        <div className="container mx-auto px-6">
          <MotionScrollReveal>
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                <Target className="w-4 h-4 mr-2" />
                Simple Process
              </Badge>
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Get Started in 3 Easy Steps</h2>
              <p className="text-xl text-muted-foreground">
                Join thousands of successful traders in minutes
              </p>
            </div>
          </MotionScrollReveal>

          <MotionStagger staggerDelay={0.2} className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                icon: Crown,
                title: "Choose Your VIP Plan",
                description: "Select a subscription plan that fits your trading style and budget. All plans include premium signals and community access.",
                color: "from-[hsl(var(--dc-secondary))] to-[hsl(var(--accent-teal))]"
              },
              {
                step: "2", 
                icon: DollarSign,
                title: "Secure Payment",
                description: "Pay securely via bank transfer, cryptocurrency, or other supported methods. Get instant access upon confirmation.",
                color: "from-[hsl(var(--accent-green-light))] to-[hsl(var(--accent-green))]"
              },
              {
                step: "3",
                icon: TrendingUp,
                title: "Start Profiting",
                description: "Receive premium trading signals, join our VIP community, and start your journey to consistent trading profits.",
                color: "from-[hsl(var(--dc-accent))] to-[hsl(var(--accent-pink))]"
              }
            ].map((item, index) => (
              <MotionHoverCard key={index} hoverScale={1.05} hoverY={-10}>
                <div className="text-center group hover:scale-105 transition-all duration-300">
                  <div className={`w-20 h-20 mx-auto mb-6 bg-gradient-to-br ${item.color} rounded-full flex items-center justify-center relative group-hover:scale-110 transition-transform duration-300`}>
                    <span className="text-3xl font-bold text-[hsl(var(--accent-light))]">{item.step}</span>
                    <div className="absolute -inset-1 bg-gradient-to-br from-[hsl(var(--accent-light)/0.2)] to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <div className={`w-12 h-12 mx-auto mb-4 bg-gradient-to-br ${item.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className="w-6 h-6 text-[hsl(var(--accent-light))]" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </MotionHoverCard>
            ))}
          </MotionStagger>
        </div>
      </section>
      {/* Mini App Preview */}
      <section id="preview-section" className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <MotionFadeIn direction="right" distance={50}>
                <Badge className="mb-4 bg-telegram/10 text-telegram border-telegram/20">
                  <Zap className="w-4 h-4 mr-2" />
                  Live Demo
                </Badge>
                
                <h2 className="text-3xl md:text-5xl font-bold mb-6">
                  Experience Our Telegram Mini App
                </h2>
                
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  See how easy it is to access premium trading signals and manage your VIP subscription 
                  directly within Telegram. No downloads required!
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    "⚡ Instant access to trading signals",
                    "💳 Real-time payment processing", 
                    "📱 Seamless Telegram integration",
                    "🎯 Mobile-optimized interface"
                  ].map((feature, index) => (
                    <MotionFadeIn key={index} delay={index * 0.1}>
                      <div className="flex items-center group hover:scale-105 transition-transform duration-200">
                        <CheckCircle className="w-6 h-6 text-[hsl(var(--accent-green))] mr-4 group-hover:scale-110 transition-transform" />
                        <span className="text-lg">{feature}</span>
                      </div>
                    </MotionFadeIn>
                  ))}
                </div>

                <Button 
                  size="lg" 
                  className="bg-telegram hover:bg-telegram-dark shadow-lg hover:shadow-telegram/25 transform hover:scale-105 transition-all duration-300"
                  onClick={handleOpenTelegram}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Try It Now in Telegram
                </Button>
              </MotionFadeIn>
            </div>

            <MotionFadeIn delay={0.3} scale>
              <div className="lg:order-first">
                <MiniAppPreview className="mx-auto transform hover:scale-105 transition-transform duration-300" />
              </div>
            </MotionFadeIn>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <CTASection onJoinNow={handleJoinNow} onOpenTelegram={handleOpenTelegram} />
    </FullscreenAdaptive>
  );
};

export default Landing;
