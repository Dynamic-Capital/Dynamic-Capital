"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MotionFadeIn } from "@/components/ui/motion-components";
import { TrendingUp, Shield, Users, Sparkles } from "lucide-react";
import { callEdgeFunction } from "@/config/supabase";

interface HeroSectionProps {
  onJoinVIP?: () => void;
  onLearnMore?: () => void;
}

export default function HeroSection({ onJoinVIP, onLearnMore }: HeroSectionProps) {
  const defaultContent = {
    badge: "Premium Trading Platform",
    badgeHighlight: "Elite Trading Platform",
    title: "Dynamic Capital",
    description:
      "Join thousands of successful traders with exclusive market insights, daily analysis, and premium investment opportunities.",
    joinButton: "Join VIP Now",
    learnButton: "Learn More",
  };
  const [content, setContent] = useState(defaultContent);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const { data, error } = await callEdgeFunction('CONTENT_BATCH', {
          method: 'POST',
          body: {
            keys: [
              'hero_badge',
              'hero_badge_highlight',
              'hero_title',
              'hero_description',
              'hero_join_button',
              'hero_learn_button',
            ],
          },
        });

        if (!error && data) {
          const contents = (data as any).contents || [];
          const lookup: Record<string, string> = {};
          contents.forEach((c: any) => {
            lookup[c.content_key] = c.content_value;
          });
          setContent({
            badge: lookup.hero_badge ?? defaultContent.badge,
            badgeHighlight: lookup.hero_badge_highlight ?? defaultContent.badgeHighlight,
            title: lookup.hero_title ?? defaultContent.title,
            description: lookup.hero_description ?? defaultContent.description,
            joinButton: lookup.hero_join_button ?? defaultContent.joinButton,
            learnButton: lookup.hero_learn_button ?? defaultContent.learnButton,
          });
        } else if (error) {
          console.error('Failed to fetch hero content:', error.message);
        }
      } catch (err) {
        console.error('Failed to fetch hero content:', err);
      }
    };

    fetchContent();
  }, []);

  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background via-card/30 to-background text-center overflow-hidden">
      {/* Enhanced Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-primary/20 via-dc-accent/15 to-transparent rounded-full blur-3xl animate-pulse opacity-50"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-l from-dc-accent/20 via-telegram/15 to-transparent rounded-full blur-3xl animate-pulse opacity-50" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/5 via-transparent to-dc-accent/5 rounded-full blur-3xl animate-pulse opacity-30" style={{ animationDelay: '4s' }}></div>
        
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 bg-grid-white/[0.02] dark:bg-grid-white/[0.02]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background" />
      </div>

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
            DYNAMIC CAPITAL — PREMIUM TRADING SIGNALS — DYNAMIC CAPITAL —
          </textPath>
        </text>
      </motion.svg>

      {/* Hero Content */}
      <div className="relative z-10 max-w-5xl px-6">
        <MotionFadeIn>
          <div className="mb-10 flex flex-col items-center">
            <BrandLogo size="lg" variant="brand" animated />
            <Badge className="mt-4 bg-[hsl(var(--accent-light)/0.2)] text-[hsl(var(--accent-light))] border-[hsl(var(--accent-light)/0.3)]">
              {content.badge}
            </Badge>
          </div>
          <div className="mb-6">
            <Badge className="mb-4 bg-[hsl(var(--accent-gold)/0.2)] text-[hsl(var(--accent-gold))] border-[hsl(var(--accent-gold)/0.3)] text-lg px-6 py-2">
              <Sparkles className="w-5 h-5 mr-2" />
              {content.badgeHighlight}
            </Badge>
          </div>

          <motion.h1 
            className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 relative"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <span className="bg-gradient-to-r from-primary via-dc-accent to-primary bg-clip-text text-transparent animate-gradient-x bg-[length:200%_auto]">
              {content.title}
            </span>
            <motion.div 
              className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-dc-accent/20 to-primary/20 blur-xl opacity-30"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.h1>

          <motion.p 
            className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-3xl mx-auto font-light"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            {content.description}
          </motion.p>

          {/* Enhanced Stats */}
          <motion.div 
            className="flex flex-wrap justify-center gap-8 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            {[
              { icon: TrendingUp, value: "92%", label: "Success Rate", color: "accent-green" },
              { icon: Users, value: "5000+", label: "VIP Members", color: "dc-accent" },
              { icon: Shield, value: "24/7", label: "Support", color: "accent-teal" }
            ].map((stat, index) => (
              <motion.div 
                key={index}
                className="text-center relative group"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:border-primary/30">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <stat.icon className={`w-6 h-6 text-[hsl(var(--${stat.color}))] group-hover:scale-110 transition-transform`} />
                    <span className={`text-3xl font-bold text-[hsl(var(--${stat.color}))] font-mono`}>{stat.value}</span>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-6 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button 
                size="lg" 
                className="relative bg-gradient-to-r from-primary via-primary to-dc-accent text-primary-foreground shadow-2xl hover:shadow-[0_0_25px_hsl(var(--primary)/0.6)] text-xl px-12 py-6 font-bold border-0 overflow-hidden group"
                onClick={onJoinVIP}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <Sparkles className="w-6 h-6 mr-3 animate-pulse" />
                {content.joinButton}
              </Button>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-primary/40 text-primary hover:bg-primary/10 backdrop-blur-md bg-card/20 text-xl px-12 py-6 font-semibold relative overflow-hidden group"
                onClick={onLearnMore}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                {content.learnButton}
              </Button>
            </motion.div>
          </motion.div>
        </MotionFadeIn>
      </div>
    </section>
  );
}

