"use client";

import Link from "next/link";
import {
  TonConnectButton,
  TonConnectUIProvider,
  useTonConnectUI,
} from "@tonconnect/ui-react";
import { useEffect, useMemo, useState } from "react";

import { EquityChart } from "../components/equity-chart";
import { PositionsTable } from "../components/positions-table";
import type {
  ExnessAccountSummary,
  ExnessEquityPoint,
  ExnessPosition,
} from "../lib/exness";

type Plan = "vip_bronze" | "vip_silver" | "vip_gold" | "mentorship";

type SectionId = "overview" | "plans" | "activity" | "support";

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

type NavItem = {
  id: SectionId;
  label: string;
  icon: (props: { active: boolean }) => JSX.Element;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
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
  const [accountSummary, setAccountSummary] = useState<ExnessAccountSummary | null>(null);
  const [equityHistory, setEquityHistory] = useState<ExnessEquityPoint[]>([]);
  const [positions, setPositions] = useState<ExnessPosition[]>([]);
  const [loadingState, setLoadingState] = useState({
    summary: true,
    equity: true,
    positions: true,
  });
  const [sources, setSources] = useState<{
    summary?: string;
    equity?: string;
    positions?: string;
  }>({});
  const [errors, setErrors] = useState<{
    summary?: string;
    equity?: string;
    positions?: string;
  }>({});
  const telegramId = useTelegramId();
  const isAdmin = useMemo(
    () => ADMIN_TELEGRAM_IDS.includes(telegramId),
    [telegramId],
  );

  const selectedPlan = useMemo(
    () => PLAN_OPTIONS.find((option) => option.id === plan),
    [plan],
  );
  const wallet = tonConnectUI?.account;
  const walletAddress = wallet?.address;

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
    let cancelled = false;

    async function loadExnessData() {
      setLoadingState({ summary: true, equity: true, positions: true });
      setErrors({});

      try {
        const [summaryResponse, positionsResponse, equityResponse] = await Promise.all([
          fetch("/api/exness/summary"),
          fetch("/api/exness/positions"),
          fetch("/api/exness/equity"),
        ]);

        if (cancelled) {
          return;
        }

        const summaryPayload = await summaryResponse.json().catch(() => null);
        const positionsPayload = await positionsResponse.json().catch(() => null);
        const equityPayload = await equityResponse.json().catch(() => null);

        if (summaryResponse.ok && summaryPayload?.data) {
          setAccountSummary(summaryPayload.data as ExnessAccountSummary);
          setSources((prev) => ({ ...prev, summary: summaryPayload.source }));
        } else {
          setErrors((prev) => ({
            ...prev,
            summary:
              (summaryPayload?.error as string | undefined) ??
              "Account summary is temporarily unavailable.",
          }));
        }

        if (positionsResponse.ok && positionsPayload?.data) {
          setPositions(positionsPayload.data as ExnessPosition[]);
          setSources((prev) => ({ ...prev, positions: positionsPayload.source }));
        } else {
          setErrors((prev) => ({
            ...prev,
            positions:
              (positionsPayload?.error as string | undefined) ??
              "Positions failed to load.",
          }));
        }

        if (equityResponse.ok && equityPayload?.data) {
          setEquityHistory(equityPayload.data as ExnessEquityPoint[]);
          setSources((prev) => ({ ...prev, equity: equityPayload.source }));
        } else {
          setErrors((prev) => ({
            ...prev,
            equity:
              (equityPayload?.error as string | undefined) ??
              "Equity history failed to load.",
          }));
        }
      } catch (error) {
        console.error("Unable to load Exness data", error);
        if (!cancelled) {
          setErrors({
            summary: "Unable to reach the trading bridge.",
            positions: "Unable to reach the trading bridge.",
            equity: "Unable to reach the trading bridge.",
          });
        }
      } finally {
        if (!cancelled) {
          setLoadingState({ summary: false, equity: false, positions: false });
        }
      }
    }

    loadExnessData();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const chartLoading = loadingState.summary || loadingState.equity;
  const chartError = errors.equity ?? errors.summary ?? null;
  const chartSource = sources.equity ?? sources.summary;
  const positionsLoading = loadingState.positions;
  const positionsError = errors.positions ?? null;
  const positionsSource = sources.positions;

  return (
    <div className="app-shell">
      <main className="app-container">
        <section className="hero-card" id="overview">
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
              <div className="metric">
                <span className="metric-label">Projected desk yield</span>
                <span className="metric-value">18–24% APY</span>
              </div>
              <div className="metric">
                <span className="metric-label">Live trading pairs</span>
                <span className="metric-value">12 curated</span>
              </div>
              <div className="metric">
                <span className="metric-label">Withdrawal buffer</span>
                <span className="metric-value">4 hour SLA</span>
              </div>
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
            {isAdmin && (
              <Link href="/admin/mt5" className="button button-primary">
                Open MT5 terminal
              </Link>
            )}
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

        <section className="section-card" id="activity">
          <div className="section-header">
            <div>
              <h2 className="section-title">Live equity intelligence</h2>
              <p className="section-description">
                Streaming equity and margin stats refreshed from Exness MT5.
              </p>
            </div>
          </div>
          <EquityChart
            points={equityHistory}
            summary={accountSummary}
            loading={chartLoading}
            error={chartError}
            source={chartSource}
          />
        </section>

        <section className="section-card" id="support">
          <div className="section-header">
            <div>
              <h2 className="section-title">Execution desk cockpit</h2>
              <p className="section-description">
                Inspect the live MT5 tickets and desk capabilities before deploying
                capital.
              </p>
            </div>
          </div>

          <PositionsTable
            positions={positions}
            loading={positionsLoading}
            error={positionsError}
            source={positionsSource}
          />

          <div className="feature-grid">
            {OVERVIEW_FEATURES.map((feature) => (
              <article key={feature.title} className="feature-card">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
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
  { id: "activity", label: "Activity", icon: ActivityIcon },
  { id: "support", label: "Support", icon: LifebuoyIcon },
];

const ADMIN_TELEGRAM_IDS = (process.env.NEXT_PUBLIC_TELEGRAM_ADMIN_IDS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export default function Page() {
  return (
    <TonConnectUIProvider manifestUrl="/tonconnect-manifest.json">
      <HomeInner />
    </TonConnectUIProvider>
  );
}
