"use client";

import {
  TonConnectButton,
  TonConnectUIProvider,
  useTonConnectUI,
} from "@tonconnect/ui-react";
import { useEffect, useMemo, useState } from "react";

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

type ActivityItem = {
  title: string;
  status: "complete" | "pending" | "upcoming";
  timestamp: string;
  description: string;
};

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
          <h2 className="section-title">Desk timeline</h2>
          <ul className="activity-list">
            {ACTIVITY_FEED.map((item) => (
              <li
                key={item.title}
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

      <nav className="bottom-nav" aria-label="Primary">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              className={`nav-button${isActive ? " nav-button--active" : ""}`}
              onClick={() => scrollToSection(id)}
            >
              <Icon active={isActive} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      className="nav-icon"
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
      className="nav-icon"
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
      className="nav-icon"
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
      className="nav-icon"
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

export default function Page() {
  return (
    <TonConnectUIProvider manifestUrl="/tonconnect-manifest.json">
      <HomeInner />
    </TonConnectUIProvider>
  );
}
