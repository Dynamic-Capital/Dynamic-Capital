"use client";

import { motion } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MotionFadeIn } from "@/components/ui/motion-components";
import { TrendingUp, Shield, Users, Sparkles } from "lucide-react";

interface HeroSectionProps {
  onJoinVIP?: () => void;
  onLearnMore?: () => void;
}

export default function HeroSection({ onJoinVIP, onLearnMore }: HeroSectionProps) {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background via-telegram/5 to-[hsl(var(--dc-accent)/0.1)] text-center overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-64 h-64 bg-[hsl(var(--primary)/0.1)] rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-[hsl(var(--dc-accent)/0.1)] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header with Logo */}
      <header className="absolute top-0 left-0 w-full flex items-center justify-between p-6 z-20">
        <BrandLogo size="lg" variant="brand" animated />
        <Badge className="bg-[hsl(var(--accent-light)/0.2)] text-[hsl(var(--accent-light))] border-[hsl(var(--accent-light)/0.3)]">
          Premium Trading Platform
        </Badge>
      </header>

      {/* Animated Background Text */}
      <motion.svg
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[120%] pointer-events-none opacity-20"
        viewBox="0 0 1000 500"
        initial={{ x: 0 }}
        animate={{ x: ["0%", "-50%"] }}
        transition={{ repeat: Infinity, repeatType: "loop", duration: 40, ease: "linear" }}
        style={{ willChange: "transform" }}
      >
        <path id="curve" d="M 0,300 Q 500,100 1000,300" fill="transparent" />
        <text fill="hsl(var(--primary))" fontSize="48" fontWeight="bold" letterSpacing="3px">
          <textPath href="#curve" startOffset="0%">
            DYNAMIC CAPITAL VIP — PREMIUM TRADING SIGNALS — DYNAMIC CAPITAL VIP —
          </textPath>
        </text>
      </motion.svg>

      {/* Hero Content */}
      <div className="relative z-10 max-w-5xl px-6">
        <MotionFadeIn>
          <div className="mb-6">
            <Badge className="mb-4 bg-[hsl(var(--accent-gold)/0.2)] text-[hsl(var(--accent-gold))] border-[hsl(var(--accent-gold)/0.3)] text-lg px-6 py-2">
              <Sparkles className="w-5 h-5 mr-2" />
              Elite Trading Platform
            </Badge>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-foreground mb-6">
            <span className="bg-gradient-to-r from-foreground via-primary to-[hsl(var(--dc-accent))] bg-clip-text text-transparent">
              Dynamic Capital VIP
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-3xl mx-auto">
            Join thousands of successful traders with exclusive market insights, daily analysis, and premium investment opportunities.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mb-12">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-[hsl(var(--accent-green))]" />
                <span className="text-2xl font-bold text-[hsl(var(--accent-green))]">92%</span>
              </div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="w-5 h-5 text-[hsl(var(--dc-accent))]" />
                <span className="text-2xl font-bold text-[hsl(var(--dc-accent))]">5000+</span>
              </div>
              <p className="text-sm text-muted-foreground">VIP Members</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-[hsl(var(--accent-teal))]" />
                <span className="text-2xl font-bold text-[hsl(var(--accent-teal))]">24/7</span>
              </div>
              <p className="text-sm text-muted-foreground">Support</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button 
              size="lg" 
              className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] shadow-2xl hover:shadow-[0_0_15px_hsl(var(--primary)/0.5)] transform hover:scale-105 transition-all duration-300 text-xl px-10 py-6 font-bold"
              onClick={onJoinVIP}
            >
              <Sparkles className="w-6 h-6 mr-2" />
              Join VIP Now
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-[hsl(var(--primary)/0.4)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] backdrop-blur-sm text-xl px-10 py-6 font-semibold transform hover:scale-105 transition-all duration-300"
              onClick={onLearnMore}
            >
              Learn More
            </Button>
          </div>
        </MotionFadeIn>
      </div>
    </section>
  );
}

