"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MotionFadeIn } from "@/components/ui/motion-components";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  CreditCard,
  Crown,
  Globe2,
  Mail,
  Shield,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import { cn } from "@/utils";
import { useContentBatch } from "@/hooks/useContentBatch";

import { InteractiveSectionContainer } from "./InteractiveSectionContainer";

interface CTASectionProps {
  onJoinNow: () => void;
  onOpenTelegram: () => void;
}

interface CTAContent {
  badge: string;
  title: string;
  description: string;
  highlight: string;
  primaryButton: string;
  secondaryButton: string;
  responseTime: string;
  capacity: string;
  trustSignals: string[];
  newsletterTitle: string;
  newsletterDescription: string;
  newsletterPlaceholder: string;
  newsletterButton: string;
  newsletterPrivacy: string;
}

const trustSignalIcons = [
  ShieldCheck,
  BadgeCheck,
  CreditCard,
  Stethoscope,
  Globe2,
  Shield,
];

const TRUST_SIGNAL_KEYS: Array<[string, string]> = [
  ["cta_trust_signal_1", "cta_trust_signal_one"],
  ["cta_trust_signal_2", "cta_trust_signal_two"],
  ["cta_trust_signal_3", "cta_trust_signal_three"],
  ["cta_trust_signal_4", "cta_trust_signal_four"],
  ["cta_trust_signal_5", "cta_trust_signal_five"],
  ["cta_trust_signal_6", "cta_trust_signal_six"],
];

const CTASection = ({ onJoinNow, onOpenTelegram }: CTASectionProps) => {
  const defaultContent = useMemo<CTAContent>(
    () => ({
      badge: "Limited Time Offer",
      title: "Ready to Transform Your Trading?",
      description:
        "Join thousands of successful traders who trust Dynamic Capital for premium signals and proven strategies.",
      highlight: "Start your VIP journey today!",
      primaryButton: "Get VIP Access Now",
      secondaryButton: "Start Free Trial",
      responseTime: "Average approval time under 3 minutes",
      capacity: "Limited VIP seats released weekly",
      trustSignals: [
        "ISO 27001 certification",
        "Certificate of SOC 2",
        "Certificate of PCI DSS",
        "Certificate of HIPAA",
        "Certificate of GDPR",
        "Certificate of DPF",
      ],
      newsletterTitle: "Stay in sync with Dynamic Capital",
      newsletterDescription:
        "Desk notes, feature releases, and booking windows delivered a few times each month.",
      newsletterPlaceholder: "Email address",
      newsletterButton: "Subscribe",
      newsletterPrivacy: "No spam — unsubscribe anytime.",
    }),
    [],
  );

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    type: "idle" | "success" | "error";
    message: string;
  }>({
    type: "idle",
    message: defaultContent.newsletterPrivacy,
  });

  const ctaDefaults = useMemo<Record<string, string>>(() => {
    const base: Record<string, string> = {
      cta_badge: defaultContent.badge,
      cta_title: defaultContent.title,
      cta_description: defaultContent.description,
      cta_highlight: defaultContent.highlight,
      cta_primary_button: defaultContent.primaryButton,
      cta_secondary_button: defaultContent.secondaryButton,
      cta_response_time: defaultContent.responseTime,
      cta_capacity: defaultContent.capacity,
      cta_newsletter_title: defaultContent.newsletterTitle,
      cta_newsletter_description: defaultContent.newsletterDescription,
      cta_newsletter_placeholder: defaultContent.newsletterPlaceholder,
      cta_newsletter_button: defaultContent.newsletterButton,
      cta_newsletter_privacy: defaultContent.newsletterPrivacy,
    };

    TRUST_SIGNAL_KEYS.forEach(([numericKey, wordKey], index) => {
      const fallback = defaultContent.trustSignals[index];
      if (fallback) {
        base[numericKey] = fallback;
        base[wordKey] = fallback;
      }
    });

    return base;
  }, [defaultContent]);

  const ctaKeys = useMemo(() => Object.keys(ctaDefaults), [ctaDefaults]);

  const {
    content: contentMap,
    error: ctaContentError,
  } = useContentBatch(ctaKeys, ctaDefaults);

  const content = useMemo<CTAContent>(() => {
    const trustSignals = TRUST_SIGNAL_KEYS.map(
      ([numericKey, wordKey], index) => {
        const fallback = defaultContent.trustSignals[index];
        return contentMap[numericKey] ?? contentMap[wordKey] ?? fallback;
      },
    ).filter((signal): signal is string => Boolean(signal));

    return {
      badge: contentMap["cta_badge"] ?? defaultContent.badge,
      title: contentMap["cta_title"] ?? defaultContent.title,
      description: contentMap["cta_description"] ?? defaultContent.description,
      highlight: contentMap["cta_highlight"] ?? defaultContent.highlight,
      primaryButton: contentMap["cta_primary_button"] ??
        defaultContent.primaryButton,
      secondaryButton: contentMap["cta_secondary_button"] ??
        defaultContent.secondaryButton,
      responseTime: contentMap["cta_response_time"] ??
        defaultContent.responseTime,
      capacity: contentMap["cta_capacity"] ?? defaultContent.capacity,
      trustSignals,
      newsletterTitle: contentMap["cta_newsletter_title"] ??
        defaultContent.newsletterTitle,
      newsletterDescription: contentMap["cta_newsletter_description"] ??
        defaultContent.newsletterDescription,
      newsletterPlaceholder: contentMap["cta_newsletter_placeholder"] ??
        defaultContent.newsletterPlaceholder,
      newsletterButton: contentMap["cta_newsletter_button"] ??
        defaultContent.newsletterButton,
      newsletterPrivacy: contentMap["cta_newsletter_privacy"] ??
        defaultContent.newsletterPrivacy,
    };
  }, [contentMap, defaultContent]);

  useEffect(() => {
    if (ctaContentError) {
      console.error("Failed to fetch CTA content:", ctaContentError);
    }
  }, [ctaContentError]);

  useEffect(() => {
    if (status.type === "idle") {
      setStatus((prev) => ({
        ...prev,
        message: content.newsletterPrivacy,
      }));
    }
  }, [content.newsletterPrivacy, status.type]);

  useEffect(() => {
    if (status.type === "success") {
      const timer = window.setTimeout(() => {
        setStatus({
          type: "idle",
          message: content.newsletterPrivacy,
        });
      }, 6000);

      return () => window.clearTimeout(timer);
    }
  }, [status.type, content.newsletterPrivacy]);

  const handleSubscribe = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setStatus({
        type: "error",
        message: "Please enter your email address.",
      });
      return;
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    if (!isValidEmail) {
      setStatus({
        type: "error",
        message: "Enter a valid email to continue.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "idle", message: content.newsletterPrivacy });

    window.setTimeout(() => {
      setIsSubmitting(false);
      setEmail("");
      setStatus({
        type: "success",
        message: "Thanks! We'll keep you posted.",
      });
    }, 600);
  };

  const helperTextClass = cn(
    "text-xs sm:text-sm transition-colors",
    status.type === "error"
      ? "text-destructive"
      : status.type === "success"
      ? "text-success"
      : "text-muted-foreground",
  );

  return (
    <section className="relative overflow-hidden py-20 sm:py-24">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_top,_hsl(var(--accent-gold)/0.28),_transparent_70%)] blur-3xl opacity-60" />
        <div className="absolute -left-20 bottom-10 h-64 w-64 rounded-full bg-[radial-gradient(circle,_hsl(var(--telegram)/0.3),_transparent_65%)] blur-3xl opacity-70" />
        <div className="absolute right-[-10%] top-1/3 h-72 w-72 rounded-full bg-[radial-gradient(circle,_hsl(var(--primary)/0.35),_transparent_65%)] blur-3xl opacity-50" />
      </div>

      <InteractiveSectionContainer
        className="relative"
        glowColor="rgba(255, 214, 102, 0.22)"
      >
        <MotionFadeIn className="space-y-12" scale>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
            <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[hsl(var(--telegram)/0.38)] via-[hsl(var(--dc-accent)/0.35)] to-[hsl(var(--primary)/0.4)] p-8 sm:p-12 text-left text-[hsl(var(--accent-light))] shadow-2xl">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))]" />
              <div className="absolute left-[-15%] top-[-25%] h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.32),_transparent_65%)] blur-3xl" />
              <div className="absolute right-[-10%] bottom-[-20%] h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.18),_transparent_70%)] blur-3xl" />

              <div className="relative z-10 flex flex-col gap-8">
                <div className="space-y-6">
                  <Badge className="inline-flex items-center gap-2 border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--accent-light))]">
                    <Crown className="h-4 w-4" />
                    {content.badge}
                  </Badge>
                  <h2 className="text-3xl font-black leading-tight sm:text-4xl md:text-5xl">
                    {content.title}
                  </h2>
                  <p className="text-base leading-relaxed text-[hsl(var(--accent-light)/0.9)] sm:text-lg">
                    {content.description}
                    <span className="mt-3 block text-base font-semibold text-[hsl(var(--accent-gold))] sm:text-lg">
                      {content.highlight}
                    </span>
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[content.responseTime, content.capacity]
                    .filter(Boolean)
                    .map((detail, index) => (
                      <div
                        key={`${detail}-${index}`}
                        className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-[hsl(var(--accent-light))] backdrop-blur-sm"
                      >
                        {index === 0
                          ? (
                            <Clock3 className="h-5 w-5 text-[hsl(var(--accent-light))]" />
                          )
                          : (
                            <Users className="h-5 w-5 text-[hsl(var(--accent-light))]" />
                          )}
                        <span>{detail}</span>
                      </div>
                    ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  {content.trustSignals
                    .filter(Boolean)
                    .map((signal, index) => {
                      const Icon = trustSignalIcons[index] ?? Sparkles;
                      return (
                        <span
                          key={`${signal}-${index}`}
                          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--accent-light))] backdrop-blur-sm"
                        >
                          <Icon className="h-4 w-4" />
                          {signal}
                        </span>
                      );
                    })}
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Button
                    size="lg"
                    className="group relative w-full overflow-hidden rounded-2xl bg-[hsl(var(--accent-light))] px-8 py-5 text-lg font-semibold text-[hsl(var(--telegram))] shadow-xl transition-all duration-300 sm:w-auto"
                    onClick={onJoinNow}
                  >
                    <span className="absolute inset-0 translate-x-[-120%] bg-[linear-gradient(120deg,rgba(255,255,255,0),rgba(255,255,255,0.45),rgba(255,255,255,0))] transition-transform duration-700 group-hover:translate-x-[120%]" />
                    <Sparkles className="mr-2 h-5 w-5" />
                    {content.primaryButton}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full rounded-2xl border-white/40 bg-white/10 px-8 py-5 text-lg font-semibold text-[hsl(var(--accent-light))] backdrop-blur-sm transition-all duration-300 hover:border-white/60 hover:bg-white/20 sm:w-auto"
                    onClick={onOpenTelegram}
                  >
                    {content.secondaryButton}
                  </Button>
                </div>
              </div>
            </div>

            <div className="relative flex h-full flex-col justify-between rounded-[28px] border border-border/60 bg-card/80 p-8 shadow-2xl backdrop-blur">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Insider access
                </span>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-foreground">
                    {content.newsletterTitle}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {content.newsletterDescription}
                  </p>
                </div>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleSubscribe}>
                <div className="relative">
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (status.type !== "idle") {
                        setStatus({
                          type: "idle",
                          message: content.newsletterPrivacy,
                        });
                      }
                    }}
                    placeholder={content.newsletterPlaceholder}
                    aria-label={content.newsletterPlaceholder ||
                      "Email address"}
                    height="m"
                    className="w-full"
                    surfaceClassName="rounded-2xl border border-border/60 bg-background/90 shadow-sm transition focus-visible:border-primary"
                    inputClassName="text-base"
                    leading={
                      <Mail
                        className="h-5 w-5 text-muted-foreground"
                        aria-hidden="true"
                      />
                    }
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold shadow-lg transition hover:bg-primary/90 sm:w-auto"
                    isLoading={isSubmitting}
                  >
                    {content.newsletterButton}
                  </Button>
                  <p className={helperTextClass}>{status.message}</p>
                </div>
              </form>
            </div>
          </div>
        </MotionFadeIn>
      </InteractiveSectionContainer>
    </section>
  );
};

export default CTASection;
