"use client";

import {
  TonConnectButton,
  TonConnectUIProvider,
  useTonConnectUI,
} from "@tonconnect/ui-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  LiveIntelSnapshot,
  LiveMetric,
  LiveTimelineEntry,
} from "../data/live-intel";
import { DEFAULT_REFRESH_SECONDS } from "../data/live-intel";

type Plan = "vip_bronze" | "vip_silver" | "vip_gold" | "mentorship";

type SectionId = "overview" | "plans" | "intel" | "activity" | "support";

type TelegramUser = {
  id?: number;
};

type TelegramWebApp = {
  initDataUnsafe?: {
    user?: TelegramUser;
  };
};

type PlanOption = {
  id: Plan;
  name: string;
  price: string;
  cadence: string;
  description: string;
  highlights: string[];
};

type ActivityItem = LiveTimelineEntry;

type SupportOption = {
  title: string;
  description: string;
  action: string;
};

type NavItem = {
  id: SectionId;
  label: string;
  icon: (props: { active: boolean }) => JSX.Element;
};

type LiveIntelState = {
  status: "loading" | "ready" | "error";
  report?: LiveIntelSnapshot;
  updatedAt?: string;
  nextRefreshSeconds?: number;
  isSyncing: boolean;
  error?: string;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

function formatRelativeTime(iso?: string): string {
  if (!iso) {
    return "just now";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "just now";
  }
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs <= 0) {
    return "just now";
  }
  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatConfidence(value?: number): string | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  const bounded = Math.min(Math.max(value, 0), 1);
  return `${Math.round(bounded * 100)}% confidence`;
}

function riskSeverity(score?: number): "low" | "medium" | "high" {
  if (typeof score !== "number" || Number.isNaN(score)) {
    return "low";
  }
  if (score < 0.34) {
    return "low";
  }
  if (score < 0.67) {
    return "medium";
  }
  return "high";
}

const FALLBACK_METRICS: LiveMetric[] = [
  {
    label: "Projected desk yield",
    value: "18–24% APY",
    change: "Desk baseline",
    trend: "steady",
  },
  {
    label: "Live trading pairs",
    value: "12 curated",
    change: "Auto-managed",
    trend: "steady",
  },
  {
    label: "Withdrawal buffer",
    value: "4 hour SLA",
    change: "Standard",
    trend: "steady",
  },
];

type LiveIntelResponse = {
  generatedAt: string;
  nextUpdateInSeconds?: number;
  report: LiveIntelSnapshot;
};

function useLiveIntel(
  pollMs: number = DEFAULT_REFRESH_SECONDS * 1000,
): LiveIntelState & { refresh: () => void } {
  const [state, setState] = useState<LiveIntelState>({
    status: "loading",
    isSyncing: true,
  });
  const isUnmounted = useRef(false);

  const fetchIntel = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      status: previous.report ? previous.status : "loading",
      isSyncing: true,
      error: previous.report ? previous.error : undefined,
    }));

    try {
      const response = await fetch("/api/live-intel", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const payload: LiveIntelResponse = await response.json();
      if (isUnmounted.current) {
        return;
      }
      setState({
        status: "ready",
        report: payload.report,
        updatedAt: payload.generatedAt,
        nextRefreshSeconds:
          payload.nextUpdateInSeconds ?? Math.floor(pollMs / 1000),
        isSyncing: false,
        error: undefined,
      });
    } catch (error) {
      if (isUnmounted.current) {
        return;
      }
      const message =
        error instanceof Error ? error.message : "Unknown sync error";
      setState((previous) => ({
        ...previous,
        status: previous.report ? "ready" : "error",
        isSyncing: false,
        error: message,
      }));
    }
  }, [pollMs]);

  useEffect(() => {
    isUnmounted.current = false;
    void fetchIntel();
    const intervalId = setInterval(() => {
      void fetchIntel();
    }, pollMs);

    return () => {
      isUnmounted.current = true;
      clearInterval(intervalId);
    };
  }, [fetchIntel, pollMs]);

  return {
    ...state,
    refresh: fetchIntel,
  };
}

const PLAN_OPTIONS: PlanOption[] = [
  {
    id: "vip_bronze",
    name: "VIP Bronze",
    price: "120 TON",
    cadence: "3 month horizon",
    description:
      "Entry tier that mirrors the desk's base auto-invest strategy.",
    highlights: [
      "Desk monitored entries",
      "Weekly strategy calls",
      "Capital preservation guardrails",
    ],
  },
  {
    id: "vip_silver",
    name: "VIP Silver",
    price: "220 TON",
    cadence: "6 month horizon",
    description:
      "Expanded allocation with leverage-managed exposure and mid-cycle rotations.",
    highlights: [
      "Dual momentum + carry blend",
      "Priority support window",
      "Quarterly performance briefing",
    ],
  },
  {
    id: "vip_gold",
    name: "VIP Gold",
    price: "380 TON",
    cadence: "12 month horizon",
    description:
      "Flagship seat with treasury hedging, OTC access, and shared execution stack.",
    highlights: [
      "Desk co-trading channel",
      "Deep-dive portfolio reviews",
      "Strategic withdrawals with no slippage",
    ],
  },
  {
    id: "mentorship",
    name: "Mentorship",
    price: "550 TON",
    cadence: "5 week sprint",
    description:
      "One-on-one mentorship alongside live trading to accelerate your playbook.",
    highlights: [
      "Personal deal screening",
      "Signal decoding workshops",
      "Exclusive masterclass archives",
    ],
  },
];

const OVERVIEW_FEATURES = [
  {
    title: "Live Signal Desk",
    description:
      "High-conviction execution with 24/7 desk monitoring across majors, TON ecosystem, and DeFi rotations.",
  },
  {
    title: "Auto-Invest Vaults",
    description:
      "Deploy into curated baskets that rebalance automatically with transparent on-chain attestations.",
  },
  {
    title: "Risk Controls",
    description:
      "Dynamic guardrails, circuit breakers, and managed drawdown ceilings purpose-built for active traders.",
  },
];

const ACTIVITY_FEED: ActivityItem[] = [
  {
    title: "Desk sync complete",
    status: "complete",
    timestamp: "12:04",
    description:
      "Wallet authorized with trading desk. Next rebalancing cycle triggers at 18:00 UTC.",
  },
  {
    title: "Strategy review",
    status: "pending",
    timestamp: "Today",
    description:
      "Bronze plan summary ready. Confirm subscription to unlock full auto-invest routing.",
  },
  {
    title: "Capital deployment window",
    status: "upcoming",
    timestamp: "Tomorrow",
    description:
      "Desk will open a short deployment window for high-volume TON liquidity pairs.",
  },
];

const SUPPORT_OPTIONS: SupportOption[] = [
  {
    title: "Concierge chat",
    description:
      "Direct line to our desk managers for allocation or compliance questions.",
    action: "Open Telegram thread",
  },
  {
    title: "Trading playbook",
    description:
      "Step-by-step frameworks and risk tooling to mirror the Dynamic Capital approach.",
    action: "View docs",
  },
  {
    title: "Status center",
    description:
      "Check live uptime for deposits, OCR, and auto-invest execution engines.",
    action: "Launch status page",
  },
];

function useTelegramId(): string {
  if (typeof window === "undefined") {
    return "demo";
  }

  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return telegramId ? String(telegramId) : "demo";
}

function formatWalletAddress(address?: string | null): string {
  if (!address) {
    return "No wallet connected";
  }
  if (address.length <= 12) {
    return address;
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function HomeInner() {
  const [tonConnectUI] = useTonConnectUI();
  const [plan, setPlan] = useState<Plan>("vip_bronze");
  const [txHash, setTxHash] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [isLinking, setIsLinking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const telegramId = useTelegramId();
  const liveIntel = useLiveIntel();
  const [countdown, setCountdown] = useState<number | null>(null);

  const selectedPlan = useMemo(
    () => PLAN_OPTIONS.find((option) => option.id === plan),
    [plan],
  );
  const wallet = tonConnectUI?.account;
  const walletAddress = wallet?.address;

  const metrics = liveIntel.report?.metrics ?? FALLBACK_METRICS;
  const timeline = liveIntel.report?.timeline ?? ACTIVITY_FEED;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((entry) => entry.isIntersecting);
        if (visibleEntry) {
          setActiveSection(visibleEntry.target.id as SectionId);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0.1 },
    );

    const sectionIds: SectionId[] = [
      "overview",
      "plans",
      "intel",
      "activity",
      "support",
    ];
    sectionIds.forEach((sectionId) => {
      const element = document.getElementById(sectionId);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (liveIntel.nextRefreshSeconds == null) {
      setCountdown(null);
      return;
    }
    setCountdown(liveIntel.nextRefreshSeconds);
    const intervalId = setInterval(() => {
      setCountdown((previous) => {
        if (previous === null) {
          return previous;
        }
        if (previous <= 1) {
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [liveIntel.updatedAt, liveIntel.nextRefreshSeconds]);

  async function linkWallet() {
    if (!tonConnectUI) {
      return;
    }

    const currentWallet = tonConnectUI.account;
    if (!currentWallet) {
      setStatusMessage("Connect a TON wallet to link it to the desk.");
      return;
    }

    setIsLinking(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/link-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_id: telegramId,
          address: currentWallet.address,
          publicKey: currentWallet.publicKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`Unexpected status ${response.status}`);
      }

      setStatusMessage("Wallet linked successfully. Desk access unlocked.");
    } catch (error) {
      console.error(error);
      setStatusMessage(
        "Unable to link your wallet right now. Please retry in a few moments.",
      );
    } finally {
      setIsLinking(false);
    }
  }

  async function startSubscription() {
    if (!tonConnectUI) {
      return;
    }

    const currentWallet = tonConnectUI.account;
    if (!currentWallet) {
      setStatusMessage("Connect a TON wallet to continue.");
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    const fakeHash = `FAKE_TX_HASH_${Date.now()}`;
    setTxHash(fakeHash);

    try {
      const response = await fetch("/api/process-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_id: telegramId,
          plan,
          tx_hash: fakeHash,
        }),
      });

      if (!response.ok) {
        throw new Error(`Unexpected status ${response.status}`);
      }

      setStatusMessage(
        `Subscription for ${
          selectedPlan?.name ?? "your plan"
        } submitted. Desk will confirm shortly.`,
      );
    } catch (error) {
      console.error(error);
      setStatusMessage(
        "We couldn't start the subscription. Give it another try after checking your connection.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function scrollToSection(sectionId: SectionId) {
    if (typeof window === "undefined") {
      return;
    }

    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(sectionId);
    }
  }

  return (
    <div className="app-shell">
      <main className="app-container">
        <section className="hero-card" id="overview">
          <div className="sync-banner">
            <span
              className={`sync-indicator${
                liveIntel.isSyncing ? " sync-indicator--pulse" : ""
              }`}
              aria-hidden
            />
            <span className="sync-text">
              Auto-syncing Grok-1 + DeepSeek-V2 feed
            </span>
            {countdown !== null && (
              <span className="sync-countdown" aria-live="polite">
                {liveIntel.isSyncing
                  ? "Updating…"
                  : `Next sync in ${countdown}s`}
              </span>
            )}
            <button
              type="button"
              className="button button-ghost sync-refresh"
              onClick={() => liveIntel.refresh()}
              disabled={liveIntel.isSyncing}
            >
              Refresh
            </button>
          </div>

          <div className="hero-header">
            <div>
              <p className="eyebrow">Dynamic Capital Desk</p>
              <h1 className="hero-title">
                Signal-driven growth with TON settlements.
              </h1>
              <p className="hero-subtitle">
                Seamlessly connect your TON wallet, auto-invest alongside our
                trading desk, and stay informed with every cycle.
              </p>
            </div>
            <div className="hero-metrics">
              {metrics.map((metric) => (
                <div className="metric" key={metric.label}>
                  <span className="metric-label">{metric.label}</span>
                  <span className="metric-value">
                    {metric.value}
                    {metric.change && (
                      <span
                        className={`metric-change metric-change--${
                          metric.trend ?? "steady"
                        }`}
                      >
                        {metric.trend === "down"
                          ? "▼"
                          : metric.trend === "up"
                          ? "▲"
                          : "•"}{" "}
                        {metric.change}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-actions">
            <TonConnectButton className="ton-button" />
            <button
              className="button button-secondary"
              onClick={linkWallet}
              disabled={isLinking || !wallet}
            >
              {isLinking ? "Linking…" : "Link wallet to desk"}
            </button>
          </div>

          <div className="hero-status">
            <div>
              <p className="status-label">Wallet</p>
              <p className="status-value">
                {formatWalletAddress(walletAddress)}
              </p>
            </div>
            <div>
              <p className="status-label">Telegram ID</p>
              <p className="status-value">{telegramId}</p>
            </div>
            <div>
              <p className="status-label">Live feed</p>
              <p className="status-value">
                {liveIntel.isSyncing
                  ? "Syncing…"
                  : formatRelativeTime(liveIntel.updatedAt)}
              </p>
            </div>
            {selectedPlan && (
              <div>
                <p className="status-label">Selected plan</p>
                <p className="status-value">{selectedPlan.name}</p>
              </div>
            )}
          </div>
        </section>

        <section className="section-card" id="plans">
          <div className="section-header">
            <div>
              <h2 className="section-title">Choose your runway</h2>
              <p className="section-description">
                Unlock the same tooling our desk uses daily. Each tier adds
                deeper access, more detailed reporting, and quicker capital
                cycling.
              </p>
            </div>
            {selectedPlan && (
              <div className="selected-plan-pill">{selectedPlan.cadence}</div>
            )}
          </div>

          <div className="plan-grid">
            {PLAN_OPTIONS.map((option) => {
              const isActive = option.id === plan;
              return (
                <button
                  key={option.id}
                  className={`plan-card${isActive ? " plan-card--active" : ""}`}
                  onClick={() => setPlan(option.id)}
                >
                  <div className="plan-card-header">
                    <span className="plan-name">{option.name}</span>
                    <span className="plan-price">{option.price}</span>
                  </div>
                  <p className="plan-description">{option.description}</p>
                  <ul className="plan-highlights">
                    {option.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <div className="plan-actions">
            <button
              className="button button-primary"
              onClick={startSubscription}
              disabled={isProcessing}
            >
              {isProcessing ? "Submitting…" : "Start auto-invest"}
            </button>
            {txHash && (
              <p className="plan-hash">Latest transaction request: {txHash}</p>
            )}
          </div>
        </section>

        <LiveIntelligenceSection
          intel={liveIntel.report}
          status={liveIntel.status}
          isSyncing={liveIntel.isSyncing}
          updatedAt={liveIntel.updatedAt}
          countdown={countdown}
          error={liveIntel.error}
          onRefresh={liveIntel.refresh}
        />

        <section className="section-card" id="activity">
          <h2 className="section-title">Desk timeline</h2>
          <ul className="activity-list">
            {timeline.map((item) => (
              <li
                key={`${item.title}-${item.timestamp}`}
                className={`activity-item activity-item--${item.status}`}
              >
                <div className="activity-marker" aria-hidden />
                <div>
                  <div className="activity-header">
                    <span className="activity-title">{item.title}</span>
                    <span className="activity-timestamp">{item.timestamp}</span>
                  </div>
                  <p className="activity-description">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="section-card" id="support">
          <h2 className="section-title">What you unlock</h2>
          <div className="feature-grid">
            {OVERVIEW_FEATURES.map((feature) => (
              <article key={feature.title} className="feature-card">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>

          <div className="support-grid">
            {SUPPORT_OPTIONS.map((option) => (
              <div key={option.title} className="support-card">
                <div>
                  <h3>{option.title}</h3>
                  <p>{option.description}</p>
                </div>
                <button className="button button-ghost">{option.action}</button>
              </div>
            ))}
          </div>
        </section>

        {statusMessage && <div className="status-banner">{statusMessage}</div>}
      </main>

      <nav
        aria-label="Breadcrumb"
        className="fixed bottom-8 left-1/2 z-50 flex w-full max-w-xl -translate-x-1/2 justify-center px-4"
      >
        <div className="flex w-full items-center justify-center rounded-full border border-slate-500/50 bg-slate-900/80 px-4 py-3 text-[0.78rem] font-medium text-slate-300 shadow-[0_18px_46px_rgba(7,12,24,0.45)] backdrop-blur">
          <ol className="flex w-full items-center gap-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const isActive = activeSection === id;
              return (
                <li
                  key={id}
                  className="flex min-w-0 flex-1 items-center after:mx-1 after:text-slate-600/70 after:content-['/'] last:after:hidden"
                >
                  <button
                    type="button"
                    onClick={() => scrollToSection(id)}
                    aria-current={isActive ? "page" : undefined}
                    className={`group flex w-full items-center gap-2 rounded-full px-3 py-2 transition-colors duration-150 ${
                      isActive
                        ? "bg-sky-500/20 text-sky-100"
                        : "text-slate-300/70 hover:bg-white/5 hover:text-sky-100"
                    }`}
                  >
                    <Icon active={isActive} />
                    <span className="truncate">{label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </nav>
    </div>
  );
}

function LiveIntelligenceSection({
  intel,
  status,
  isSyncing,
  updatedAt,
  countdown,
  error,
  onRefresh,
}: {
  intel?: LiveIntelSnapshot;
  status: LiveIntelState["status"];
  isSyncing: boolean;
  updatedAt?: string;
  countdown: number | null;
  error?: string;
  onRefresh: () => void;
}) {
  const confidenceLabel = formatConfidence(intel?.confidence);
  const alerts = intel?.alerts ?? [];
  const opportunities = intel?.opportunities ?? [];
  const risks = intel?.risks ?? [];
  const hasIntel = Boolean(intel);

  return (
    <section className="section-card" id="intel">
      <div className="section-header">
        <div>
          <h2 className="section-title">Live desk intelligence</h2>
          <p className="section-description">
            Grok-1 strategy briefs are auto-synced with DeepSeek-V2 risk
            arbitration so every decision stays in lockstep with the desk.
          </p>
        </div>
        <div className="selected-plan-pill">
          {isSyncing
            ? "Syncing…"
            : countdown !== null
            ? `Next sync in ${countdown}s`
            : updatedAt
            ? `Updated ${formatRelativeTime(updatedAt)}`
            : "Awaiting sync"}
        </div>
      </div>

      {error && status === "error" && (
        <div className="status-banner status-banner--error">
          Unable to reach the intelligence feed right now. We'll retry
          automatically.
          <button
            type="button"
            className="button button-ghost"
            onClick={onRefresh}
          >
            Retry now
          </button>
        </div>
      )}

      <div className="intel-grid">
        <div className="intel-card intel-card--primary">
          <div className="intel-meta">
            <span className="intel-updated">
              {isSyncing
                ? "Streaming Grok-1 update…"
                : updatedAt
                ? `Last sync ${formatRelativeTime(updatedAt)}`
                : "Waiting for first sync"}
            </span>
            {confidenceLabel && (
              <span className="confidence-chip">{confidenceLabel}</span>
            )}
          </div>
          {hasIntel ? (
            <>
              <p className="intel-narrative">{intel?.narrative}</p>
              {alerts.length > 0 ? (
                <ul className="alert-list">
                  {alerts.map((alert) => (
                    <li key={alert} className="alert-pill">
                      <span aria-hidden>⚠️</span>
                      {alert}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="intel-muted">
                  No blocking alerts flagged by DeepSeek-V2 sentinel.
                </p>
              )}
            </>
          ) : (
            <div className="skeleton-group">
              <div className="skeleton skeleton--text skeleton--wide" />
              <div className="skeleton skeleton--text skeleton--wide" />
              <div className="skeleton skeleton--text skeleton--medium" />
            </div>
          )}
        </div>

        <div className="intel-card">
          <h3>Opportunities</h3>
          {hasIntel ? (
            <ul className="intel-list">
              {opportunities.map((item) => (
                <li key={item}>
                  <span
                    className="intel-bullet intel-bullet--opportunity"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <IntelListSkeleton />
          )}
        </div>

        <div className="intel-card">
          <h3>Risks</h3>
          {hasIntel ? (
            <ul className="intel-list">
              {risks.map((item) => (
                <li key={item}>
                  <span className="intel-bullet intel-bullet--risk" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <IntelListSkeleton />
          )}
        </div>
      </div>

      {intel ? (
        <ModelBreakdown intel={intel} />
      ) : (
        <div className="model-grid">
          <div className="model-card">
            <div className="skeleton skeleton--text skeleton--medium" />
            <div className="skeleton skeleton--block" />
            <div className="skeleton skeleton--text skeleton--medium" />
          </div>
          <div className="model-card">
            <div className="skeleton skeleton--text skeleton--medium" />
            <div className="skeleton skeleton--block" />
            <div className="skeleton skeleton--text skeleton--medium" />
          </div>
        </div>
      )}

      {error && status !== "error" && (
        <div className="status-banner status-banner--error">
          Brief network hiccup detected. Showing the last Grok-1 + DeepSeek-V2
          sync while we refresh in the background.
        </div>
      )}
    </section>
  );
}

function IntelListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-group">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`intel-skeleton-${index}`}
          className="skeleton skeleton--text skeleton--wide"
        />
      ))}
    </div>
  );
}

function ModelBreakdown({ intel }: { intel: LiveIntelSnapshot }) {
  const grok = intel.models.grok;
  const deepseek = intel.models.deepseek;
  const riskScore =
    typeof deepseek.riskScore === "number"
      ? Math.min(Math.max(deepseek.riskScore, 0), 1)
      : null;
  const riskLevel = riskSeverity(riskScore ?? undefined);
  const riskLabel =
    riskScore === null ? "Risk scan" : `${Math.round(riskScore * 100)}% risk`;

  return (
    <div className="model-grid">
      <div className="model-card">
        <div className="model-header">
          <span className="model-name">Grok-1 strategist</span>
          <span className="model-tag">{grok.focus}</span>
        </div>
        <p className="model-summary">{grok.summary}</p>
        <ul className="model-highlights">
          {grok.highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="model-card">
        <div className="model-header">
          <span className="model-name">DeepSeek-V2 sentinel</span>
          <span className={`model-risk model-risk--${riskLevel}`}>
            {riskLabel}
          </span>
        </div>
        <p className="model-summary">{deepseek.summary}</p>
        <ul className="model-highlights">
          {deepseek.highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 flex-shrink-0 transition-colors duration-150 ${
        active ? "text-sky-100" : "text-slate-400"
      }`}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
    >
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 flex-shrink-0 transition-colors duration-150 ${
        active ? "text-sky-100" : "text-slate-400"
      }`}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
    >
      <path
        d="M12 2.5 13.6 8h5.4l-4.3 3.2L16.3 17 12 13.9 7.7 17l1.3-5.8L4.7 8h5.4z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RadarIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 flex-shrink-0 transition-colors duration-150 ${
        active ? "text-sky-100" : "text-slate-400"
      }`}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity={active ? 1 : 0.8}
      />
      <path
        d="M12 4v4m0 4 4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.2"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function ActivityIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 flex-shrink-0 transition-colors duration-150 ${
        active ? "text-sky-100" : "text-slate-400"
      }`}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
    >
      <path
        d="M4 13.5 8 9l3.5 5L14 6l2.5 8.5L20 11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={active ? 1 : 0.8}
      />
    </svg>
  );
}

function LifebuoyIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 flex-shrink-0 transition-colors duration-150 ${
        active ? "text-sky-100" : "text-slate-400"
      }`}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity={active ? 1 : 0.8}
      />
      <circle
        cx="12"
        cy="12"
        r="3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M5.7 5.7 8.4 8.4M18.3 5.7l-2.7 2.7m2.7 11.6-2.7-2.7M5.7 18.3l2.7-2.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: HomeIcon },
  { id: "plans", label: "Plans", icon: SparkIcon },
  { id: "intel", label: "Live intel", icon: RadarIcon },
  { id: "activity", label: "Timeline", icon: ActivityIcon },
  { id: "support", label: "Support", icon: LifebuoyIcon },
];

export default function Page() {
  return (
    <TonConnectUIProvider manifestUrl="/tonconnect-manifest.json">
      <HomeInner />
    </TonConnectUIProvider>
  );
}
