import { useMemo } from "react";

type FlowStep = {
  id: number;
  title: string;
  description: string;
  eta: string;
};

type Metric = {
  id: number;
  label: string;
  value: string;
  sublabel: string;
};

type Announcement = {
  id: number;
  message: string;
};

const FLOW_STEPS: FlowStep[] = [
  {
    id: 1,
    title: "Bank rails synced",
    description:
      "Secure account linking with instant verification across 5,600+ institutions.",
    eta: "< 30s",
  },
  {
    id: 2,
    title: "Crypto liquidity cleared",
    description: "On-chain checks executed with live counterparty scoring and risk netting.",
    eta: "< 12s",
  },
  {
    id: 3,
    title: "Settlement released",
    description: "Funds reach the trading venue with programmable compliance controls in place.",
    eta: "Real-time",
  },
];

const METRICS: Metric[] = [
  {
    id: 1,
    label: "Daily throughput",
    value: "$480M",
    sublabel: "Processed in the last 24h",
  },
  {
    id: 2,
    label: "Approval velocity",
    value: "97%",
    sublabel: "Cleared in under two minutes",
  },
  {
    id: 3,
    label: "Global coverage",
    value: "38",
    sublabel: "Fiat & crypto rails supported",
  },
];

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 1,
    message: "Direct FedNow access",
  },
  {
    id: 2,
    message: "USDC settlements now instant",
  },
  {
    id: 3,
    message: "MiCA compliance ready",
  },
  {
    id: 4,
    message: "Global 24/7 risk monitoring",
  },
];

function HeroAnimation() {
  const tickerItems = useMemo(() => {
    return [...ANNOUNCEMENTS, ...ANNOUNCEMENTS];
  }, []);

  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-white/20 bg-white/60 p-6 shadow-xl shadow-primary/20 ring-1 ring-primary/10 backdrop-blur-xl hero-animated-shell dark:border-white/10 dark:bg-white/5 dark:ring-white/10">
      <div className="hero-gradient-ring" aria-hidden />
      <div className="hero-orb hero-orb-top" aria-hidden />
      <div className="hero-orb hero-orb-bottom" aria-hidden />
      <div className="grid gap-5 md:grid-cols-3">
        {FLOW_STEPS.map((step, index) => (
          <article
            key={step.id}
            className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/30 bg-white/75 p-6 text-left shadow-lg shadow-primary/10 transition-transform duration-500 hero-flow-card hover:translate-y-[-6px] dark:border-white/10 dark:bg-white/10"
          >
            <div>
              <div className="flex items-start gap-4">
                <span className="hero-step-pill">{String(step.id).padStart(2, "0")}</span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary/70">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{step.description}</p>
            </div>
            <div className="mt-5 flex items-center gap-3 text-xs font-medium text-primary/80">
              <span className="hero-status-dot" />
              <span className="tracking-wide">{step.eta}</span>
              <span className="text-muted-foreground/80">settlement</span>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {METRICS.map((metric) => (
          <div
            key={metric.id}
            className="flex flex-col justify-between rounded-2xl border border-white/20 bg-white/70 p-5 shadow-md shadow-primary/10 hero-metric-card dark:border-white/10 dark:bg-white/5"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              {metric.label}
            </span>
            <span className="mt-3 text-3xl font-semibold text-foreground">
              {metric.value}
            </span>
            <span className="mt-2 text-xs text-muted-foreground/80">
              {metric.sublabel}
            </span>
          </div>
        ))}
      </div>
      <div className="hero-ticker mt-10">
        <div className="hero-ticker-track">
          {tickerItems.map((announcement, index) => (
            <span key={`${announcement.id}-${index}`} className="hero-ticker-item">
              {announcement.message}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HeroAnimation;
