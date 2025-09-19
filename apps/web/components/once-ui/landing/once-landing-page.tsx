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
  Gauge,
  GraduationCap,
  LineChart,
  ShieldCheck,
  Sparkles,
  Users2,
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

interface AboutHighlight {
  title: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const heroStats = [
  { label: "Active VIP members", value: "8,500+" },
  { label: "Mentorship satisfaction", value: "4.9/5" },
  { label: "Capital managed in pools", value: "$42M" },
];

const aboutHighlights: AboutHighlight[] = [
  {
    title: "Quant-led market intelligence",
    description:
      "Signals are engineered by analysts covering global FX, crypto, and commodities with multi-timeframe confirmation.",
    icon: LineChart,
  },
  {
    title: "Coaching tailored to your goals",
    description:
      "Mentors build trading playbooks with you, supported by weekly office hours, accountability cohorts, and recorded sessions.",
    icon: GraduationCap,
  },
  {
    title: "Transparent risk and execution",
    description:
      "Pool trading dashboards show positions, performance, and safeguards in real time across every connected exchange.",
    icon: ShieldCheck,
  },
];

const workflowSteps: WorkflowStep[] = [
  {
    label: "Join the VIP signal desk",
    detail: "Activate your membership and receive real-time entries, exits, and risk levels via Telegram and web dashboard.",
    metric: "Signals in under 10 minutes",
  },
  {
    label: "Set your trading objectives",
    detail: "Use the client hub to track performance, book mentorship sessions, and sync exchange accounts for oversight.",
    metric: "Personalized game plan",
  },
  {
    label: "Access pool trading capital",
    detail: "Participate in curated pools with managed drawdown controls and transparent share reporting every session.",
    metric: "$42M managed capital",
  },
  {
    label: "Automate with the DC bot",
    detail: "Deploy our exchange-ready algorithm to execute strategies hands-off while keeping manual override options.",
    metric: "24/7 automated trading",
  },
];

const testimonials = [
  {
    name: "Maya Chen",
    role: "Swing Trader, Atlas Collective",
    quote:
      "Dynamic Capital's VIP signals cut out noise and gave me structured entries. Pairing them with the mentorship playbooks doubled my monthly returns.",
    metric: "↑ 78% win rate",
  },
  {
    name: "Luis Romero",
    role: "Founder, Helios Alpha",
    quote:
      "The pool trading desk gives my community exposure to pro management without opaque fees. Reporting inside the dashboard is instant and auditable.",
    metric: "$180K capital growth",
  },
  {
    name: "Amina Diallo",
    role: "Quant Analyst, Vertex Labs",
    quote:
      "The automated trading bot executes the same discipline we coach in mentorship. It freed our team to focus on strategy instead of screen time.",
    metric: "99.9% automation uptime",
  },
];

const plans: PlanItem[] = [
  {
    id: "signals-pro",
    title: "Signals Pro",
    price: "$59",
    cadence: "per month",
    description: "Real-time VIP alerts, curated watchlists, and portfolio tracking across every session.",
    benefits: [
      "Intraday & swing trade calls",
      "Risk levels with live updates",
      "VIP Telegram community",
    ],
  },
  {
    id: "mentor-elite",
    title: "Mentor Elite",
    price: "$249",
    cadence: "per quarter",
    description: "Executive mentorship, small-group intensives, and accountability tracking for consistent growth.",
    benefits: [
      "1:1 quarterly intensives",
      "Weekly strategy office hours",
      "Performance review dashboard",
    ],
    featured: true,
  },
  {
    id: "pool-alpha",
    title: "Pool Alpha",
    price: "$960",
    cadence: "per year",
    description: "Priority allocation to managed pools plus early access to the automated trading bot rollout.",
    benefits: [
      "Dedicated capital concierge",
      "Automated bot beta access",
      "Transparent profit sharing",
    ],
  },
];

const featureItems: FeatureItem[] = [
  {
    title: "VIP trading signals",
    description:
      "Directional calls, entries, exits, and risk guidance delivered instantly to Telegram and the Dynamic Capital dashboard.",
    icon: LineChart,
    highlight: "Live market coverage",
  },
  {
    title: "Mentorship programs",
    description:
      "Progressive curriculums, mastermind cohorts, and office hours that adapt to your experience level and trading style.",
    icon: GraduationCap,
    highlight: "Personalized coaching",
  },
  {
    title: "Pool trading desk",
    description:
      "Gain exposure to curated pools managed by institutional traders with transparent reporting and compliance controls.",
    icon: Coins,
    highlight: "Institutional oversight",
  },
  {
    title: "Automated trading bot",
    description:
      "Connect supported exchanges and let our algorithms execute the vetted strategies while you monitor performance.",
    icon: Bot,
    highlight: "Hands-off execution",
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
            Dynamic Capital trading ecosystem
          </motion.span>

          <motion.h1
            className="max-w-3xl bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl lg:text-6xl"
            variants={onceMotionVariants.slideUp}
          >
            Unlock elite trading intelligence & automation
          </motion.h1>

          <motion.p
            className="max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl"
            variants={onceMotionVariants.fade}
          >
            Dynamic Capital delivers VIP trading signals, personalized mentorship, institutional pool access, and an automated trading bot—all orchestrated inside a single dashboard with Telegram at the core.
          </motion.p>

          <motion.div
            className="flex flex-col gap-4 sm:flex-row"
            variants={onceMotionVariants.stack}
          >
            <OnceButton
              onClick={onJoinVIP}
              className="px-8 py-4 text-lg font-semibold shadow-primary"
            >
              Join the VIP signals desk
              <ArrowRight className="ml-2 h-5 w-5" />
            </OnceButton>
            <OnceButton
              variant="outline"
              onClick={onLearnMore}
              className="px-8 py-4 text-lg"
            >
              Explore services & pricing
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

      <section id="about">
        <OnceContainer
          variant="stack"
          className="grid gap-10 rounded-[32px] border border-border/40 bg-card/70 p-10 shadow-lg md:grid-cols-[1.1fr_0.9fr]"
        >
          <motion.div variants={onceMotionVariants.slideUp} className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Users2 className="h-3.5 w-3.5 text-primary" />
              About Dynamic Capital
            </span>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Build a complete trading edge with human expertise and automation
            </h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              We combine quant-proven signal engineering, immersive mentorship programs, and professionally managed pool trading into one membership. The upcoming DC automated trading bot extends those same strategies with hands-off execution while keeping you in control.
            </p>
            <p className="text-base leading-relaxed text-muted-foreground">
              Access everything through our client dashboard with checkout, performance tracking, and Telegram-native notifications that keep you informed in real time.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <OnceButton onClick={onBankPayment} className="justify-center px-6 py-3">
                Open client dashboard
              </OnceButton>
              <OnceButton variant="outline" onClick={onOpenTelegram} className="justify-center px-6 py-3">
                Preview signals in Telegram
              </OnceButton>
            </div>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            {aboutHighlights.map((highlight) => {
              const Icon = highlight.icon;
              return (
                <motion.article
                  key={highlight.title}
                  variants={onceMotionVariants.slideUp}
                  className="flex flex-col gap-4 rounded-3xl border border-border/50 bg-background/80 p-6 shadow-sm"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">{highlight.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{highlight.description}</p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </OnceContainer>
      </section>

      <section id="features">
        <OnceContainer
          variant="stack"
          className="space-y-10 rounded-[32px] border border-border/40 bg-card/60 p-10 shadow-lg"
        >
          <header className="space-y-3 text-center sm:text-left">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Why traders choose Dynamic Capital
            </p>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">Dynamic Capital powers every phase of your trading journey</h2>
            <p className="max-w-3xl text-lg text-muted-foreground">Each service is built on proven playbooks, live automation, and a unified client dashboard so you can move from education to execution without switching platforms.</p>
          </header>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
              Service packages
            </span>
            <h2 className="text-3xl font-bold text-foreground">
              Choose the access tier that fits your trading ambitions
            </h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Every membership connects to the Dynamic Capital dashboard for checkout, analytics, and concierge onboarding. Scale from pure signal consumption to full pool participation without losing continuity.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <OnceButton onClick={onBankPayment} className="justify-center">
                Enter checkout dashboard
              </OnceButton>
              <OnceButton variant="outline" onClick={onCryptoPayment} className="justify-center">
                Book mentorship consult
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
                    Select package
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
              <Gauge className="h-3.5 w-3.5 text-primary" />
              Client experience
            </span>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Navigate the Dynamic Capital journey from onboarding to automation
            </h2>
            <p className="max-w-4xl text-lg text-muted-foreground">
              Track how signals, mentorship, pool allocations, and the automated trading bot connect inside our unified dashboard and Telegram workflow.
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
              Trusted by traders & founders
            </span>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Proof that Dynamic Capital elevates every trading desk
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
              Access VIP Telegram hub
            </OnceButton>
            <OnceButton variant="outline" onClick={onContactSupport} className="px-8 py-4">
              Talk to our concierge team
            </OnceButton>
          </div>
        </OnceContainer>
      </section>
    </div>
  );
}

