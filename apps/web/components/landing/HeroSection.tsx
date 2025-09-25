"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Sparkles, TrendingUp, Users } from "lucide-react";

import BrandLogo from "@/components/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { callEdgeFunction } from "@/config/supabase";
import { brand } from "@/config/brand";

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
      badge: brand.marketing.hero.badge,
      badgeHighlight: brand.marketing.hero.badgeHighlight,
      title: brand.identity.name,
      description: brand.identity.heroDescription,
      joinButton: brand.marketing.hero.joinCta,
      learnButton: brand.marketing.hero.learnCta,
    }),
    [],
  );
  const [content, setContent] = useState(defaultContent);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const { data, error } = await callEdgeFunction("CONTENT_BATCH", {
          method: "POST",
          body: {
            keys: [
              "hero_badge",
              "hero_badge_highlight",
              "hero_title",
              "hero_description",
              "hero_join_button",
              "hero_learn_button",
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
            badgeHighlight: lookup.hero_badge_highlight ??
              defaultContent.badgeHighlight,
            title: lookup.hero_title ?? defaultContent.title,
            description: lookup.hero_description ?? defaultContent.description,
            joinButton: lookup.hero_join_button ?? defaultContent.joinButton,
            learnButton: lookup.hero_learn_button ?? defaultContent.learnButton,
          });
        } else if (error) {
          console.error("Failed to fetch hero content:", error.message);
        }
      } catch (err) {
        console.error("Failed to fetch hero content:", err);
      }
    };

    fetchContent();
  }, [defaultContent]);

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

      <div className="relative z-10 mx-auto flex min-h-[640px] w-full max-w-6xl flex-col items-center justify-center gap-12 px-4 py-24 text-center sm:py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center gap-6"
        >
          <BrandLogo size="lg" variant="brand" animated />
          <Badge className="border border-primary/30 bg-primary/10 text-primary">
            {content.badge}
          </Badge>
          <Badge className="flex items-center gap-2 border border-accent-gold/40 bg-accent-gold/15 text-[hsl(var(--accent-gold))] text-base md:text-lg">
            <Sparkles className="h-4 w-4" />
            {content.badgeHighlight}
          </Badge>
          <motion.h1
            className="relative max-w-3xl text-4xl font-black tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
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
            className="max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl md:text-2xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
          >
            {content.description}
          </motion.p>
        </motion.div>

        <motion.div
          className="flex flex-wrap justify-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              whileHover={{ y: -6, scale: 1.03 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/70 px-6 py-5 backdrop-blur-xl shadow-lg"
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
          className="flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: "easeOut" }}
        >
          <Button
            size="lg"
            className="group relative w-full overflow-hidden rounded-full bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(var(--dc-accent))] to-[hsl(var(--primary))] px-8 py-6 text-lg font-semibold text-primary-foreground shadow-[0_0_35px_rgba(80,214,255,0.25)] transition-shadow duration-300 sm:w-auto"
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
            className="group relative w-full overflow-hidden rounded-full border-primary/40 bg-background/80 px-8 py-6 text-lg font-semibold text-primary transition-all duration-300 hover:bg-primary/10 sm:w-auto"
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
