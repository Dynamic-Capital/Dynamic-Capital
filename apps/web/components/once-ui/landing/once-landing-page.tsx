"use client";

import { useMemo, type ComponentType, type SVGProps } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Clock3,
  Coins,
  LineChart,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

import { OnceButton, OnceContainer } from "@/components/once-ui";
import { onceMotionVariants } from "@/lib/motion-variants";
import { cn } from "@/utils";

export interface OnceLandingPageProps {
  onJoinVIP: () => void;
  onLearnMore: () => void;
  onOpenTelegram: () => void;
  onPlanSelect: (planId: string) => void;
  onBankPayment: () => void;
  onCryptoPayment: () => void;
  onContactSupport: () => void;
}

interface FeatureItem {
  title: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  highlight: string;
}

interface WorkflowStep {
  label: string;
  detail: string;
  metric: string;
}

interface PlanItem {
  id: string;
  title: string;
  price: string;
  cadence: string;
  description: string;
  benefits: string[];
  featured?: boolean;
}

const heroStats = [
  { label: "Average approval time", value: "3m 45s" },
  { label: "Payments cleared weekly", value: "1,200+" },
  { label: "Chargeback prevention", value: "99.4%" },
];

const workflowSteps: WorkflowStep[] = [
  {
    label: "Submit your proof",
    detail: "Upload a bank receipt or share a crypto TXID directly from Telegram.",
    metric: "Secure upload & OCR",
  },
  {
    label: "Automated verification",
    detail: "Once UI orchestrates policy checks, AML rules, and fraud heuristics instantly.",
    metric: "15+ backend guardrails",
  },
  {
    label: "Admin hand-off",
    detail: "Our Once-powered dashboard highlights outliers for human review with one tap actions.",
    metric: "< 30s manual triage",
  },
  {
    label: "Funds released",
    detail: "Customers are notified automatically once the deposit clears the guardrail stack.",
    metric: "Real-time Telegram alerts",
  },
];

const testimonials = [
  {
    name: "Elena Moritz",
    role: "FX Desk Lead, Apex Trading",
    quote:
      "The Once UI workflow removed four manual steps from our ops checklist. Deposits now clear in minutes without sacrificing compliance.",
    metric: "↑ 38% processing speed",
  },
  {
    name: "Rahul Mehta",
    role: "Founder, NovaQuant",
    quote:
      "Dynamic Capital pairs beautifully with Telegram. Our VIPs submit proofs directly from the chat and the admin console stays in sync.",
    metric: "7k VIP traders onboarded",
  },
  {
    name: "Sophia Allen",
    role: "Operations, Velocity Markets",
    quote:
      "Once UI gave us a single source of truth for fiat and crypto flows. The status cards and risk signals are a game changer.",
    metric: "↓ 64% review backlog",
  },
];

const plans: PlanItem[] = [
  {
    id: "vip-monthly",
    title: "VIP Momentum",
    price: "$49",
    cadence: "per month",
    description: "Core access for traders who need verified deposits and premium market calls.",
    benefits: [
      "Daily momentum & swing plays",
      "Bank + crypto deposit routing",
      "Priority Telegram support",
    ],
  },
  {
    id: "vip-quarterly",
    title: "VIP Quantum",
    price: "$129",
    cadence: "per quarter",
    description: "Unlock quarterly strategy reviews, shared research, and white-glove onboarding.",
    benefits: [
      "Quarterly strategy sync",
      "Advanced risk alerts",
      "Managed OTC settlement",
    ],
    featured: true,
  },
  {
    id: "vip-annual",
    title: "VIP Titan",
    price: "$480",
    cadence: "per year",
    description: "Annual license for teams scaling fast-moving desks and multi-signal portfolios.",
    benefits: [
      "Unlimited desk seats",
      "Custom Once UI workspaces",
      "Dedicated compliance liaison",
    ],
  },
];

const featureItems: FeatureItem[] = [
  {
    title: "Bank-grade verification",
    description:
      "OCR, AML screening, and webhook reconciliation combine to approve fiat deposits without manual spreadsheets.",
    icon: ShieldCheck,
    highlight: "Policy-backed guardrails",
  },
  {
    title: "Crypto-native routing",
    description:
      "Track TXIDs, match confirmations, and surface suspicious flows with heuristics tuned for high velocity desks.",
    icon: Coins,
    highlight: "L2 & multi-chain ready",
  },
  {
    title: "Admin cockpit",
    description:
      "The Once UI dashboard keeps operators focused on exceptions with insight cards, actions, and broadcast tooling.",
    icon: Bot,
    highlight: "Realtime status overlays",
  },
];

export function OnceLandingPage({
  onJoinVIP,
  onLearnMore,
  onOpenTelegram,
  onPlanSelect,
  onBankPayment,
  onCryptoPayment,
  onContactSupport,
}: OnceLandingPageProps) {
  const featureChunks = useMemo(() => featureItems, []);

  return (
    <div className="relative flex flex-col gap-24 pb-24">
      <section className="relative overflow-hidden rounded-[40px] border border-border/50 bg-gradient-to-br from-background via-card/50 to-background">
        <div className="absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent blur-3xl" />
          <div className="absolute -left-16 top-16 h-72 w-72 rounded-full bg-gradient-to-br from-primary/30 via-primary/5 to-transparent blur-3xl" />
          <div className="absolute -right-10 bottom-10 h-80 w-80 rounded-full bg-gradient-to-bl from-dc-accent/25 via-transparent to-transparent blur-3xl" />
        </div>

        <OnceContainer
          variant="slideUp"
          className="relative z-10 flex flex-col items-center gap-10 py-20 text-center"
        >
          <motion.span
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-4 py-2 text-sm font-medium text-muted-foreground"
            variants={onceMotionVariants.badge}
          >
            <Sparkles className="h-4 w-4 text-primary" />
            Powered by Once UI automation
          </motion.span>

          <motion.h1
            className="max-w-3xl bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl lg:text-6xl"
            variants={onceMotionVariants.slideUp}
          >
            Fast deposits with a fully-orchestrated Once UI control plane
          </motion.h1>

          <motion.p
            className="max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl"
            variants={onceMotionVariants.fade}
          >
            Dynamic Capital unifies bank and crypto deposits, risk scoring, and Telegram delivery. Ship deposits in minutes with automated guardrails from intake to approval.
          </motion.p>

          <motion.div
            className="flex flex-col gap-4 sm:flex-row"
            variants={onceMotionVariants.stack}
          >
            <OnceButton
              onClick={onJoinVIP}
              className="px-8 py-4 text-lg font-semibold shadow-primary"
            >
              Join the VIP desk
              <ArrowRight className="ml-2 h-5 w-5" />
            </OnceButton>
            <OnceButton
              variant="outline"
              onClick={onLearnMore}
              className="px-8 py-4 text-lg"
            >
              Explore how it works
            </OnceButton>
          </motion.div>

          <motion.dl
            className="grid w-full gap-6 sm:grid-cols-3"
            variants={onceMotionVariants.stack}
          >
            {heroStats.map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-border/60 bg-background/80 px-6 py-6 text-left shadow-sm"
              >
                <dt className="text-sm uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </dt>
                <dd className="mt-2 text-2xl font-semibold text-foreground">
                  {item.value}
                </dd>
              </div>
            ))}
          </motion.dl>
        </OnceContainer>
      </section>

      <section>
        <OnceContainer
          variant="stack"
          className="space-y-10 rounded-[32px] border border-border/40 bg-card/60 p-10 shadow-lg"
        >
          <header className="space-y-3 text-center sm:text-left">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Why operators choose Dynamic Capital
            </p>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Once UI turns deposit complexity into a guided workflow
            </h2>
            <p className="max-w-3xl text-lg text-muted-foreground">
              Every surface inherits Once motion, accessibility, and automation primitives. From customer intake to backend approvals, the same system orchestrates the journey.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-3">
            {featureChunks.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.article
                  key={feature.title}
                  variants={onceMotionVariants.slideUp}
                  className="group relative overflow-hidden rounded-3xl border border-border/50 bg-background/80 p-6 shadow-sm transition-shadow hover:shadow-xl"
                >
                  <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-dc-accent/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    {feature.highlight}
                  </span>
                </motion.article>
              );
            })}
          </div>
        </OnceContainer>
      </section>

      <section>
        <OnceContainer
          variant="stack"
          className="grid gap-10 rounded-[32px] border border-border/40 bg-background/70 p-10 shadow-lg md:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/80 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              Operator-ready plans
            </span>
            <h2 className="text-3xl font-bold text-foreground">
              Pick the runway that matches your trading velocity
            </h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Every plan comes with verified deposit routing, risk controls, and direct Telegram support. Upgrade or downgrade seamlessly as your desk scales.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <OnceButton onClick={onBankPayment} className="justify-center">
                Bank transfer workflow
              </OnceButton>
              <OnceButton variant="outline" onClick={onCryptoPayment} className="justify-center">
                Crypto settlement guide
              </OnceButton>
            </div>
          </div>

          <div className="grid gap-6">
            {plans.map((plan) => (
              <motion.div
                key={plan.id}
                variants={onceMotionVariants.slideUp}
                className={cn(
                  "relative overflow-hidden rounded-3xl border border-border/50 bg-card/80 p-6 shadow-sm transition-shadow hover:shadow-xl",
                  plan.featured && "border-primary/60 bg-gradient-to-br from-primary/10 via-background to-background"
                )}
              >
                {plan.featured && (
                  <span className="absolute right-4 top-4 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                    Most popular
                  </span>
                )}
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">{plan.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-primary">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.cadence}</span>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <OnceButton
                    size="small"
                    onClick={() => onPlanSelect(plan.id)}
                    className="self-start px-4"
                  >
                    Choose plan
                  </OnceButton>
                </div>
              </motion.div>
            ))}
          </div>
        </OnceContainer>
      </section>

      <section>
        <OnceContainer
          variant="stack"
          className="rounded-[32px] border border-border/40 bg-card/60 p-10 shadow-lg"
        >
          <header className="space-y-3 text-center sm:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              Unified settlement
            </span>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Once UI keeps operations aligned from submission to release
            </h2>
            <p className="max-w-4xl text-lg text-muted-foreground">
              Follow the journey of every deposit with contextual insights, SLA timers, and auto-messaging baked directly into Telegram.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-4">
            {workflowSteps.map((step, index) => (
              <motion.div
                key={step.label}
                variants={onceMotionVariants.slideUp}
                className="relative flex flex-col gap-4 rounded-3xl border border-border/50 bg-background/70 p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {index + 1}
                  </div>
                  <Clock3 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{step.label}</h3>
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                  {step.metric}
                </span>
              </motion.div>
            ))}
          </div>
        </OnceContainer>
      </section>

      <section>
        <OnceContainer
          variant="stack"
          className="rounded-[32px] border border-border/40 bg-background/80 p-10 shadow-lg"
        >
          <header className="space-y-3 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <LineChart className="h-3.5 w-3.5 text-primary" />
              Trusted by leading desks
            </span>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Proof that Once UI workflows scale with your traders
            </h2>
          </header>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <motion.blockquote
                key={testimonial.name}
                variants={onceMotionVariants.slideUp}
                className="flex h-full flex-col justify-between gap-4 rounded-3xl border border-border/40 bg-card/80 p-6 text-left shadow-sm"
              >
                <p className="text-base leading-relaxed text-muted-foreground">“{testimonial.quote}”</p>
                <footer className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  <p className="text-xs font-semibold text-primary">{testimonial.metric}</p>
                </footer>
              </motion.blockquote>
            ))}
          </div>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <OnceButton onClick={onOpenTelegram} className="px-8 py-4">
              Launch Telegram workspace
            </OnceButton>
            <OnceButton variant="outline" onClick={onContactSupport} className="px-8 py-4">
              Talk to the support desk
            </OnceButton>
          </div>
        </OnceContainer>
      </section>
    </div>
  );
}

