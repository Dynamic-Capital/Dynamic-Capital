import { type ComponentType, type SVGProps } from "react";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Coins,
  GraduationCap,
  LineChart,
  ShieldCheck,
  Sparkles,
  Users2,
} from "lucide-react";

const TELEGRAM_VIP_URL = "https://t.me/Dynamic_VIP_BOT";

interface HeroStat {
  label: string;
  value: string;
}

interface Highlight {
  title: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

interface FeatureItem {
  title: string;
  description: string;
  highlight: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
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
  benefits: string[];
  featured?: boolean;
}

interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

const heroStats: HeroStat[] = [
  { label: "Active VIP members", value: "8,500+" },
  { label: "Mentorship satisfaction", value: "4.9/5" },
  { label: "Capital managed in pools", value: "$42M" },
];

const aboutHighlights: Highlight[] = [
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

const featureItems: FeatureItem[] = [
  {
    title: "VIP trading signals",
    description:
      "Directional calls, entries, exits, and risk guidance delivered instantly to Telegram and the Dynamic Capital dashboard.",
    highlight: "Live market coverage",
    icon: LineChart,
  },
  {
    title: "Mentorship programs",
    description:
      "Progressive curriculums, mastermind cohorts, and office hours that adapt to your experience level and trading style.",
    highlight: "Personalized coaching",
    icon: GraduationCap,
  },
  {
    title: "Pool trading desk",
    description:
      "Gain exposure to curated pools managed by institutional traders with transparent reporting and compliance controls.",
    highlight: "Institutional oversight",
    icon: Coins,
  },
  {
    title: "Automated trading bot",
    description:
      "Connect supported exchanges and let our algorithms execute the vetted strategies while you monitor performance.",
    highlight: "Hands-off execution",
    icon: Bot,
  },
];

const workflowSteps: WorkflowStep[] = [
  {
    label: "Join the VIP signal desk",
    detail:
      "Activate your membership and receive real-time entries, exits, and risk levels via Telegram and web dashboard.",
    metric: "Signals in under 10 minutes",
  },
  {
    label: "Set your trading objectives",
    detail:
      "Use the client hub to track performance, book mentorship sessions, and sync exchange accounts for oversight.",
    metric: "Personalized game plan",
  },
  {
    label: "Access pool trading capital",
    detail:
      "Participate in curated pools with managed drawdown controls and transparent share reporting every session.",
    metric: "$42M managed capital",
  },
  {
    label: "Automate with the DC bot",
    detail:
      "Deploy our exchange-ready algorithm to execute strategies hands-off while keeping manual override options.",
    metric: "24/7 automated trading",
  },
];

const plans: PlanItem[] = [
  {
    id: "signals-pro",
    title: "Signals Pro",
    price: "$59",
    cadence: "per month",
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
    benefits: [
      "Dedicated capital concierge",
      "Automated bot beta access",
      "Transparent profit sharing",
    ],
  },
];

const testimonials: Testimonial[] = [
  {
    quote:
      "Dynamic Capital's VIP signals cut out noise and gave me structured entries. Pairing them with the mentorship playbooks doubled my monthly returns.",
    name: "Maya Chen",
    role: "Swing Trader, Atlas Collective",
  },
  {
    quote:
      "The pool trading desk gives my community exposure to pro management without opaque fees. Reporting inside the dashboard is instant and auditable.",
    name: "Luis Romero",
    role: "Founder, Helios Alpha",
  },
  {
    quote:
      "The automated trading bot executes the same discipline we coach in mentorship. It freed our team to focus on strategy instead of screen time.",
    name: "Amina Diallo",
    role: "Quant Analyst, Vertex Labs",
  },
];

export function StaticLandingPage() {
  return (
    <div className="min-h-screen space-y-16 bg-gradient-to-br from-background via-card/10 to-background pb-24">
      <section className="relative overflow-hidden rounded-[40px] border border-border/50 bg-gradient-to-br from-background via-card/50 to-background">
        <div className="absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent blur-3xl" />
          <div className="absolute -left-16 top-16 h-72 w-72 rounded-full bg-gradient-to-br from-primary/30 via-primary/5 to-transparent blur-3xl" />
          <div className="absolute -right-10 bottom-10 h-80 w-80 rounded-full bg-gradient-to-bl from-dc-accent/25 via-transparent to-transparent blur-3xl" />
        </div>

        <div className="once-container relative z-10 flex flex-col items-center gap-10 py-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-4 py-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Dynamic Capital trading ecosystem
          </span>

          <h1 className="max-w-3xl bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl lg:text-6xl">
            Unlock elite trading intelligence &amp; automation
          </h1>

          <p className="max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl">
            Dynamic Capital delivers VIP trading signals, personalized mentorship, institutional pool access, and an automated trading bot—all orchestrated inside a single dashboard with Telegram at the core.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <a
              href={TELEGRAM_VIP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="once-btn px-8 py-4 text-lg font-semibold shadow-primary"
            >
              <span className="inline-flex items-center justify-center gap-2">
                Join the VIP signals desk
                <ArrowRight className="h-5 w-5" />
              </span>
            </a>
            <a href="#plans" className="once-btn outline px-8 py-4 text-lg">
              Explore services &amp; pricing
            </a>
          </div>

          <dl className="grid w-full gap-6 sm:grid-cols-3">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-3xl border border-border/60 bg-background/80 px-6 py-6 text-left shadow-sm"
              >
                <dt className="text-sm uppercase tracking-wide text-muted-foreground">{stat.label}</dt>
                <dd className="mt-2 text-2xl font-semibold text-foreground">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="about" className="once-container grid gap-10 rounded-[32px] border border-border/40 bg-card/70 p-10 shadow-lg md:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
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
            <a href="/app" className="once-btn justify-center px-6 py-3">
              Open client dashboard
            </a>
            <a
              href={TELEGRAM_VIP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="once-btn outline justify-center px-6 py-3"
            >
              Preview signals in Telegram
            </a>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {aboutHighlights.map((highlight) => {
            const Icon = highlight.icon;
            return (
              <article
                key={highlight.title}
                className="flex flex-col gap-4 rounded-3xl border border-border/50 bg-background/80 p-6 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">{highlight.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{highlight.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="features" className="once-container space-y-10 rounded-[32px] border border-border/40 bg-card/60 p-10 shadow-lg">
        <header className="space-y-3 text-center sm:text-left">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Why traders choose Dynamic Capital
          </p>
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Dynamic Capital powers every phase of your trading journey
          </h2>
          <p className="max-w-3xl text-lg text-muted-foreground">
            Each service is built on proven playbooks, live automation, and a unified client dashboard so you can move from education to execution without switching platforms.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {featureItems.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="group relative overflow-hidden rounded-3xl border border-border/50 bg-background/80 p-6 shadow-sm transition-shadow hover:shadow-xl"
              >
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-dc-accent/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-6 text-2xl font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">{feature.description}</p>
                <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  {feature.highlight}
                </span>
              </article>
            );
          })}
        </div>
      </section>

      <section id="plans" className="once-container space-y-10 rounded-[32px] border border-border/40 bg-background/70 p-10 shadow-lg md:grid md:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/80 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            Service packages
          </span>
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Choose the access tier that fits your trading ambitions
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Every membership connects to the Dynamic Capital dashboard for checkout, analytics, and concierge onboarding. Scale from pure signal consumption to full pool participation without losing continuity.
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            Begin with signals, layer on mentorship, or secure managed capital allocations—the client concierge team keeps your trajectory aligned with market conditions.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href="/app" className="once-btn justify-center px-6 py-3">
              Enter checkout dashboard
            </a>
            <a href="mailto:support@dynamiccapital.com" className="once-btn outline justify-center px-6 py-3">
              Book mentorship consult
            </a>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`flex flex-col gap-4 rounded-3xl border border-border/50 bg-background/80 p-6 shadow-sm ${plan.featured ? "ring-2 ring-primary" : ""}`}
            >
              {plan.featured ? (
                <span className="self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  Most popular
                </span>
              ) : null}
              <h3 className="text-2xl font-semibold text-foreground">{plan.title}</h3>
              <p className="text-3xl font-bold text-foreground">
                {plan.price}
                <span className="ml-1 text-sm font-medium text-muted-foreground">{plan.cadence}</span>
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.benefits.map((benefit) => (
                  <li key={benefit}>{benefit}</li>
                ))}
              </ul>
              <a
                href={TELEGRAM_VIP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="once-btn justify-center"
              >
                Select package
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="once-container space-y-10 rounded-[32px] border border-border/40 bg-card/60 p-10 shadow-lg">
        <header className="space-y-3 text-center sm:text-left">
          <span className="badge inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Client experience
          </span>
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Navigate the Dynamic Capital journey from onboarding to automation
          </h2>
          <p className="text-lg text-muted-foreground">
            Track how signals, mentorship, pool allocations, and the automated trading bot connect inside our unified dashboard and Telegram workflow.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {workflowSteps.map((step, index) => (
            <article
              key={step.label}
              className="flex flex-col gap-4 rounded-3xl border border-border/50 bg-background/80 p-6 shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                {index + 1}
              </span>
              <h3 className="text-xl font-semibold text-foreground">{step.label}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
              <strong className="text-sm text-primary">{step.metric}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="once-container space-y-10 rounded-[32px] border border-border/40 bg-background/80 p-10 shadow-lg">
        <header className="space-y-3 text-center sm:text-left">
          <span className="badge inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Trusted by traders &amp; founders
          </span>
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Proof that Dynamic Capital elevates every trading desk
          </h2>
        </header>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {testimonials.map((testimonial) => (
            <blockquote
              key={testimonial.name}
              className="flex flex-col gap-4 rounded-3xl border border-border/50 bg-background/85 p-6 shadow-sm"
            >
              <p className="text-base leading-relaxed text-muted-foreground">“{testimonial.quote}”</p>
              <footer className="flex flex-col text-sm text-foreground">
                <strong>{testimonial.name}</strong>
                <span className="text-muted-foreground">{testimonial.role}</span>
              </footer>
            </blockquote>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href={TELEGRAM_VIP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="once-btn px-6 py-3"
          >
            Access VIP Telegram hub
          </a>
          <a href="mailto:support@dynamiccapital.com" className="once-btn outline px-6 py-3">
            Talk to our concierge team
          </a>
        </div>
      </section>
    </div>
  );
}
