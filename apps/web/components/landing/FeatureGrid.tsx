"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Shield, TrendingUp, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  MotionHoverCard,
  MotionScrollReveal,
  MotionStagger,
} from "@/components/ui/motion-components";
import { callEdgeFunction } from "@/config/supabase";

import { InteractiveSectionContainer } from "./InteractiveSectionContainer";

type FeatureVisualType = "chart" | "shield" | "network";

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  accent: string;
  visual: FeatureVisualType;
  highlights: string[];
}

const shortenCopy = (text: string, limit = 140) => {
  if (!text) return text;
  if (text.length <= limit) return text;

  const truncated = text.slice(0, limit);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace === -1) {
    return `${truncated}…`;
  }

  return `${truncated.slice(0, lastSpace)}…`;
};

interface FeatureVisualProps {
  type: FeatureVisualType;
  accent: string;
}

const FeatureVisual = ({ type, accent }: FeatureVisualProps) => {
  const accentColor = `hsl(var(--${accent}))`;
  const accentTransparent = `hsl(var(--${accent}) / 0.18)`;
  const accentSoft = `hsl(var(--${accent}) / 0.08)`;

  if (type === "chart") {
    const bars = [30, 52, 44, 68, 56, 84];

    return (
      <motion.div
        className="relative flex h-24 w-full items-end overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-background/60 via-background/40 to-background/20 p-3"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              `linear-gradient(135deg, ${accentTransparent} 0%, transparent 85%)`,
          }}
        />
        <div className="relative flex h-full w-full items-end gap-2">
          {bars.map((height, index) => (
            <motion.div
              key={index}
              className="relative flex flex-1 items-end justify-center overflow-hidden rounded-full"
              initial={{ scaleY: 0.6 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{
                delay: index * 0.08,
                type: "spring",
                stiffness: 220,
                damping: 24,
              }}
              style={{ transformOrigin: "bottom" }}
            >
              <span
                className="absolute bottom-0 w-full rounded-full"
                style={{
                  height: `${height}%`,
                  background:
                    `linear-gradient(180deg, ${accentColor} 0%, ${accentTransparent} 100%)`,
                }}
              />
              <span
                className="absolute -top-2 h-2 w-2 rounded-full"
                style={{
                  background: accentColor,
                  boxShadow: `0 0 18px ${accentTransparent}`,
                }}
              />
            </motion.div>
          ))}
        </div>
        <motion.div
          className="pointer-events-none absolute -right-6 bottom-1 h-20 w-20 rounded-full blur-xl"
          animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ background: accentTransparent }}
        />
      </motion.div>
    );
  }

  if (type === "shield") {
    return (
      <motion.div
        className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-background/60 via-background/30 to-background/20"
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              `radial-gradient(circle at 50% 40%, ${accentSoft} 0%, transparent 70%)`,
          }}
        />
        <motion.div
          className="relative h-16 w-12 rounded-xl border-2"
          style={{
            borderColor: accentTransparent,
            boxShadow: `0 0 24px ${accentTransparent}`,
          }}
          animate={{ rotateX: [0, 8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <div
            className="absolute inset-[3px] rounded-lg"
            style={{
              background:
                `linear-gradient(135deg, ${accentTransparent} 0%, transparent 80%)`,
            }}
          />
          <motion.div
            className="absolute inset-x-3 top-3 h-8 rounded-b-full"
            style={{
              background:
                `linear-gradient(180deg, ${accentColor} 0%, transparent 100%)`,
            }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.2,
            }}
          />
          <motion.div
            className="absolute inset-x-4 bottom-3 h-2 rounded-full"
            style={{ background: accentTransparent }}
            animate={{ scaleX: [0.8, 1, 0.8] }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.4,
            }}
          />
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-background/60 via-background/30 to-background/20"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            `radial-gradient(circle at 20% 20%, ${accentSoft} 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            `radial-gradient(circle at 80% 80%, ${accentSoft} 0%, transparent 70%)`,
        }}
      />
      <motion.div
        className="absolute h-20 w-20 rounded-full border"
        style={{ borderColor: accentTransparent }}
        animate={{ rotate: [0, 8, -8, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      {[[-28, -10], [18, 10], [-6, 22], [24, -22]].map(([x, y], index) => (
        <motion.div
          key={index}
          className="absolute h-4 w-4 rounded-full"
          style={{
            background: accentColor,
            boxShadow: `0 0 18px ${accentTransparent}`,
            transform: `translate(${x}px, ${y}px)`,
          }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{
            duration: 3 + index,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.3,
          }}
        />
      ))}
      <motion.div
        className="absolute bg-gradient-to-b from-transparent via-white/40 to-transparent"
        style={{ height: "60%", width: "2px" }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
};

const FeatureGrid = () => {
  const defaultContent = useMemo(
    () => ({
      heading: "Why Choose Dynamic Capital?",
      subheading:
        "Get exclusive access to premium features designed for elite traders",
      features: [
        {
          icon: TrendingUp,
          title: "Premium Signals",
          description:
            "High-accuracy entries with pre-set targets that keep your focus on execution.",
          color:
            "from-[hsl(var(--accent-green-light))] to-[hsl(var(--accent-green))]",
          accent: "accent-green",
          visual: "chart" as const,
          highlights: ["92% win rate", "Auto stop-loss"],
        },
        {
          icon: Shield,
          title: "Risk Management",
          description:
            "Guard your capital with guided risk controls and instant portfolio health alerts.",
          color: "from-[hsl(var(--dc-secondary))] to-[hsl(var(--accent-teal))]",
          accent: "accent-teal",
          visual: "shield" as const,
          highlights: ["Capital guardrails", "Live alerts"],
        },
        {
          icon: Users,
          title: "VIP Community",
          description:
            "Join elite traders in live rooms, share strategies, and grow together every day.",
          color: "from-[hsl(var(--dc-accent))] to-[hsl(var(--accent-pink))]",
          accent: "accent-pink",
          visual: "network" as const,
          highlights: ["Live mentorship", "24/7 rooms"],
        },
      ] satisfies FeatureItem[],
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
              "features_heading",
              "features_subheading",
              "feature1_title",
              "feature1_description",
              "feature2_title",
              "feature2_description",
              "feature3_title",
              "feature3_description",
            ],
          },
        });

        if (!error && data) {
          const items = (data as any).contents || [];
          const lookup: Record<string, string> = {};
          items.forEach((c: any) => {
            lookup[c.content_key] = c.content_value;
          });

          const updatedFeatures: FeatureItem[] = defaultContent.features.map(
            (feature, index) => {
              const titleKey = `feature${index + 1}_title`;
              const descriptionKey = `feature${index + 1}_description`;

              return {
                ...feature,
                title: lookup[titleKey] ?? feature.title,
                description: lookup[descriptionKey] ?? feature.description,
              };
            },
          );

          setContent({
            heading: lookup.features_heading ?? defaultContent.heading,
            subheading: lookup.features_subheading ?? defaultContent.subheading,
            features: updatedFeatures,
          });
        } else if (error) {
          console.error("Failed to fetch feature content:", error.message);
        }
      } catch (err) {
        console.error("Failed to fetch feature content:", err);
      }
    };

    fetchContent();
  }, [defaultContent]);

  return (
    <section className="py-20 sm:py-24 bg-gradient-to-b from-background via-card/20 to-background relative overflow-hidden">
      {/* Enhanced Interactive Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-dc-secondary/15 via-accent-teal/10 to-transparent rounded-full blur-3xl animate-pulse opacity-60" />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-dc-accent/15 via-accent-pink/10 to-transparent rounded-full blur-3xl animate-pulse opacity-60"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-primary/8 via-transparent to-dc-accent/8 rounded-full blur-3xl animate-pulse opacity-40"
          style={{ animationDelay: "4s" }}
        />

        {/* Floating Elements */}
        <div
          className="absolute top-20 right-20 w-3 h-3 bg-primary rounded-full animate-bounce opacity-60"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute bottom-32 left-32 w-2 h-2 bg-dc-accent rounded-full animate-bounce opacity-60"
          style={{ animationDelay: "3s" }}
        />
        <div
          className="absolute top-40 left-1/4 w-4 h-4 bg-accent-teal rounded-full animate-bounce opacity-60"
          style={{ animationDelay: "5s" }}
        />
      </div>
      <InteractiveSectionContainer glowColor="rgba(93, 228, 255, 0.2)">
        <MotionScrollReveal>
          <div className="text-center mb-20">
            <motion.h2
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-8 font-poppins relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <span className="bg-gradient-to-r from-foreground via-primary to-dc-accent bg-clip-text text-transparent">
                {content.heading}
              </span>
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-dc-accent/10 to-primary/10 blur-2xl opacity-50 -z-10" />
            </motion.h2>
            <motion.p
              className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto font-inter leading-relaxed font-light"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              {shortenCopy(content.subheading, 150)}
            </motion.p>
          </div>
        </MotionScrollReveal>

        <MotionStagger
          staggerDelay={0.15}
          className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 sm:gap-8"
        >
          {content.features.map((feature, index) => (
            <MotionHoverCard key={index} hoverScale={1.02} hoverY={-8}>
              <motion.div
                className="relative group"
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <Card className="relative overflow-hidden bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-xl border border-border/30 shadow-xl group-hover:shadow-2xl transition-all duration-500 group-hover:border-primary/40">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-dc-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <CardContent className="relative grid gap-6 p-8 text-left sm:p-10">
                    <div className="flex items-start justify-between gap-4">
                      <motion.div
                        className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg`}
                        whileHover={{ scale: 1.05, rotate: 3 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        }}
                      >
                        <feature.icon className="h-8 w-8 text-white" />
                      </motion.div>
                      <div className="hidden w-32 sm:block">
                        <FeatureVisual
                          type={feature.visual}
                          accent={feature.accent}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                        {feature.title}
                      </h3>
                      <p
                        className="text-base text-muted-foreground sm:text-lg"
                        style={{ lineHeight: 1.6 }}
                      >
                        {shortenCopy(feature.description, 120)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {feature.highlights.map((highlight) => (
                        <span
                          key={highlight}
                          className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                          style={{
                            color: `hsl(var(--${feature.accent}))`,
                            borderColor: `hsl(var(--${feature.accent}) / 0.25)`,
                            backgroundColor:
                              `hsl(var(--${feature.accent}) / 0.08)`,
                          }}
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>

                    <div className="block sm:hidden">
                      <FeatureVisual
                        type={feature.visual}
                        accent={feature.accent}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 -z-10`}
                />
              </motion.div>
            </MotionHoverCard>
          ))}
        </MotionStagger>
      </InteractiveSectionContainer>
    </section>
  );
};

export default FeatureGrid;
