"use client";

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Shield, Sparkles, TrendingUp, Users } from "lucide-react";

import BrandLogo from "@/components/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useContentBatch } from "@/hooks/useContentBatch";

import InteractiveAscii from "./InteractiveAscii";

interface HeroSectionProps {
  onJoinVIP?: () => void;
  onLearnMore?: () => void;
}

const stats = [
  {
    icon: TrendingUp,
    value: "92%",
    label: "Success Rate",
    color: "accent-green",
  },
  { icon: Users, value: "5000+", label: "VIP Members", color: "dc-accent" },
  { icon: Shield, value: "24/7", label: "Support", color: "accent-teal" },
];

export default function HeroSection(
  { onJoinVIP, onLearnMore }: HeroSectionProps,
) {
  const defaultContent = useMemo(
    () => ({
      badge: "Premium Trading Platform",
      badgeHighlight: "Elite Trading Platform",
      title: "Dynamic Capital",
      description:
        "Join thousands of successful traders with exclusive market insights, daily analysis, and premium investment opportunities.",
      joinButton: "Join VIP Now",
      learnButton: "Learn More",
    }),
    [],
  );
  const heroDefaults = useMemo<Record<string, string>>(
    () => ({
      hero_badge: defaultContent.badge,
      hero_badge_highlight: defaultContent.badgeHighlight,
      hero_title: defaultContent.title,
      hero_description: defaultContent.description,
      hero_join_button: defaultContent.joinButton,
      hero_learn_button: defaultContent.learnButton,
    }),
    [defaultContent],
  );

  const heroKeys = useMemo(() => Object.keys(heroDefaults), [heroDefaults]);

  const {
    content: heroContent,
    error: heroContentError,
  } = useContentBatch(heroKeys, heroDefaults);

  const content = useMemo(
    () => ({
      badge: heroContent["hero_badge"] ?? defaultContent.badge,
      badgeHighlight: heroContent["hero_badge_highlight"] ??
        defaultContent.badgeHighlight,
      title: heroContent["hero_title"] ?? defaultContent.title,
      description: heroContent["hero_description"] ??
        defaultContent.description,
      joinButton: heroContent["hero_join_button"] ?? defaultContent.joinButton,
      learnButton: heroContent["hero_learn_button"] ??
        defaultContent.learnButton,
    }),
    [defaultContent, heroContent],
  );

  useEffect(() => {
    if (heroContentError) {
      console.error("Failed to fetch hero content:", heroContentError);
    }
  }, [heroContentError]);

  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0">
        <InteractiveAscii
          className="h-full w-full"
          style={{ width: "100%", height: "100%" }}
          backgroundColor="transparent"
          outputWidth={180}
          brightness={10}
          contrast={20}
          ditheringMode="ordered"
          color={{
            mode: "gradient",
            color1: "#e0f2ff",
            color1Point: 10,
            color2: "#6ad3ff",
            color2Point: 90,
          }}
          cursor={{
            style: "gradient",
            width: 36,
            smoothing: 24,
            invert: false,
          }}
          glow={{ blur: 32, opacity: 0.2 }}
          staticEffect={{ interval: 0.35 }}
          font={{ fontSize: "11px", lineHeight: "1.1em", fontWeight: 500 }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/80 to-background" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background via-background/10 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[min(720px,100svh)] w-full max-w-6xl flex-col items-center justify-center gap-10 px-4 py-20 text-center sm:gap-12 sm:px-6 sm:py-28 lg:max-w-7xl lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex w-full flex-col items-center gap-6"
        >
          <BrandLogo size="lg" variant="brand" animated />
          <Badge className="border border-primary/30 bg-primary/10 text-primary">
            {content.badge}
          </Badge>
          <Badge className="flex items-center gap-2 border border-accent-gold/40 bg-accent-gold/15 text-[hsl(var(--accent-gold))] text-sm md:text-base">
            <Sparkles className="h-4 w-4" />
            {content.badgeHighlight}
          </Badge>
          <motion.h1
            className="relative max-w-4xl text-[clamp(2.5rem,8vw,4.5rem)] font-black leading-[1.1] tracking-tight"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: "easeOut" }}
          >
            <span className="bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(var(--dc-accent))] to-[hsl(var(--primary))] bg-clip-text text-transparent">
              {content.title}
            </span>
            <span className="absolute -inset-2 -z-10 rounded-full bg-gradient-to-r from-primary/20 via-dc-accent/20 to-primary/20 blur-2xl opacity-40" />
          </motion.h1>
          <motion.p
            className="max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg md:text-xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
          >
            {content.description}
          </motion.p>
        </motion.div>

        <motion.div
          className="flex w-full flex-wrap justify-center gap-4 sm:gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              whileHover={{ y: -6, scale: 1.03 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="relative w-full min-w-[min(220px,100%)] overflow-hidden rounded-2xl border border-border/60 bg-background/70 px-6 py-5 shadow-lg backdrop-blur-xl sm:w-auto sm:min-w-[220px]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-70" />
              <div className="relative flex flex-col items-center gap-2">
                <stat.icon
                  className={`h-6 w-6 text-[hsl(var(--${stat.color}))]`}
                />
                <span
                  className={`text-3xl font-bold text-[hsl(var(--${stat.color}))] font-mono`}
                >
                  {stat.value}
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:justify-center sm:gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: "easeOut" }}
        >
          <Button
            size="lg"
            className="group relative w-full overflow-hidden rounded-full bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(var(--dc-accent))] to-[hsl(var(--primary))] px-6 py-5 text-base font-semibold text-primary-foreground shadow-[0_0_35px_rgba(80,214,255,0.25)] transition-shadow duration-300 sm:w-auto sm:px-8 sm:py-6 sm:text-lg"
            onClick={onJoinVIP}
          >
            <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[120%]" />
            <span className="relative flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5" />
              {content.joinButton}
            </span>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="group relative w-full overflow-hidden rounded-full border-primary/40 bg-background/80 px-6 py-5 text-base font-semibold text-primary transition-all duration-300 hover:bg-primary/10 sm:w-auto sm:px-8 sm:py-6 sm:text-lg"
            onClick={onLearnMore}
          >
            <span className="absolute inset-0 translate-x-[-110%] bg-gradient-to-r from-transparent via-primary/15 to-transparent transition-transform duration-500 ease-out group-hover:translate-x-[110%]" />
            <span className="relative">{content.learnButton}</span>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
