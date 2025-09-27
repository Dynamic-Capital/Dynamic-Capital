"use client";

import {
  TonConnectButton,
  TonConnectUIProvider,
  useTonConnectUI,
} from "@tonconnect/ui-react";
import type { WalletsListConfiguration } from "@tonconnect/ui-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useMiniAppThemeManager,
} from "../../../../shared/miniapp/use-miniapp-theme";
import type { MiniAppThemeOption } from "../../../../shared/miniapp/theme-loader";

import type { LiveMetric } from "../data/live-intel";
import {
  ACTIVITY_FEED,
  OVERVIEW_FEATURES,
  SUPPORT_OPTIONS,
} from "../data/static-content";
import { getFallbackPlans, type Plan } from "../lib/plans";
import type { SectionId } from "../lib/sections";
import { formatRelativeTime } from "../lib/time";
import { useLiveIntel } from "../hooks/useLiveIntel";
import { usePlanOptions } from "../hooks/usePlanOptions";
import { LiveIntelligenceSection } from "../components/LiveIntelligenceSection";
import { StickyNav } from "../components/StickyNav";

type TelegramUser = {
  id?: number;
};

type TelegramWebApp = {
  initDataUnsafe?: {
    user?: TelegramUser;
  };
};

const RECOMMENDED_WALLETS: NonNullable<
  WalletsListConfiguration["includeWallets"]
> = [
  {
    appName: "tonkeeper",
    name: "Tonkeeper",
    imageUrl: "https://tonkeeper.com/assets/tonconnect-icon.png",
    aboutUrl: "https://tonkeeper.com",
    universalLink: "https://app.tonkeeper.com/ton-connect",
    bridgeUrl: "https://bridge.tonapi.io/bridge",
    platforms: ["ios", "android", "chrome", "firefox"],
  },
  {
    appName: "tonhub",
    name: "Tonhub",
    imageUrl: "https://tonhub.com/tonconnect_logo.png",
    aboutUrl: "https://tonhub.com",
    universalLink: "https://tonhub.com/ton-connect",
    bridgeUrl: "https://connect.tonhubapi.com/tonconnect",
    platforms: ["ios", "android"],
  },
  {
    appName: "mytonwallet",
    name: "MyTonWallet",
    imageUrl: "https://mytonwallet.io/icon-256.png",
    aboutUrl: "https://mytonwallet.io",
    universalLink: "https://connect.mytonwallet.org",
    bridgeUrl: "https://tonconnectbridge.mytonwallet.org/bridge/",
    platforms: ["chrome", "windows", "macos", "linux"],
  },
];

const FALLBACK_PLAN_OPTIONS = getFallbackPlans();
const DEFAULT_PLAN_ID: Plan = FALLBACK_PLAN_OPTIONS[0]?.id ?? "vip_bronze";

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
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

function resolveThemeSwatches(theme: MiniAppThemeOption): string[] {
  const background = theme.cssVariables["--tg-bg"] ??
    theme.cssVariables["--surface"] ??
    "#0b1120";
  const accent = theme.cssVariables["--tg-accent"] ??
    theme.cssVariables["--accent"] ??
    "#38bdf8";
  const text = theme.cssVariables["--tg-text"] ??
    theme.cssVariables["--text-primary"] ??
    "#f8fafc";
  return [background, accent, text];
}

function HomeInner() {
  const [tonConnectUI] = useTonConnectUI();
  const {
    planOptions,
    selectedPlan: selectedPlanId,
    setSelectedPlan,
    status: planSyncStatus,
  } = usePlanOptions(DEFAULT_PLAN_ID);
  const [txHash, setTxHash] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [isLinking, setIsLinking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const telegramId = useTelegramId();
  const liveIntel = useLiveIntel();
  const [countdown, setCountdown] = useState<number | null>(null);
  const { manager: themeManager, state: themeState } = useMiniAppThemeManager(
    tonConnectUI,
  );

  const selectedPlan = useMemo(
    () => planOptions.find((option) => option.id === selectedPlanId),
    [planOptions, selectedPlanId],
  );
  const wallet = tonConnectUI?.account;
  const walletAddress = wallet?.address;

  const themeOptions = themeState.availableThemes;
  const walletConnected = Boolean(walletAddress);
  const isThemeBusy = themeState.isLoading || themeState.isApplying;
  const themeEmptyCopy = walletConnected
    ? "When a Theme NFT is detected it will appear here with the option to preview and apply it instantly."
    : "Connect a TON wallet above to see any Theme NFTs you've collected.";
  const themeStatusMessage = useMemo(() => {
    if (themeState.isApplying) {
      return "Applying theme…";
    }
    if (!walletConnected) {
      return "Connect a TON wallet to unlock partner themes.";
    }
    if (themeState.isLoading) {
      return "Checking your Theme NFTs…";
    }
    if (!themeOptions.length) {
      return "No Theme NFTs detected yet. Refresh after minting.";
    }
    return null;
  }, [
    themeOptions.length,
    themeState.isApplying,
    themeState.isLoading,
    walletConnected,
  ]);

  const handleThemeSelect = useCallback(
    (theme: MiniAppThemeOption) => {
      void themeManager.selectTheme(theme.id);
    },
    [themeManager],
  );

  const handleThemeReset = useCallback(() => {
    void themeManager.resetTheme();
  }, [themeManager]);

  const handleThemeRefresh = useCallback(() => {
    void themeManager.refresh();
  }, [themeManager]);

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
      "appearance",
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
          plan: selectedPlanId,
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
                          : "•"} {metric.change}
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
              <p className="status-label">Plans</p>
              <p
                className={`status-value${
                  planSyncStatus.error ? " status-value--error" : ""
                }`}
              >
                {planSyncStatus.error
                  ? "Needs attention"
                  : planSyncStatus.isLoading
                  ? "Syncing…"
                  : planSyncStatus.isRealtimeSyncing
                  ? "Refreshing…"
                  : planSyncStatus.updatedAt
                  ? formatRelativeTime(planSyncStatus.updatedAt)
                  : "Live"}
              </p>
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
                <p className="status-value">
                  {selectedPlan.name}
                  {selectedPlan.meta.amount !== null
                    ? ` • ${selectedPlan.price}`
                    : ""}
                </p>
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

          <div className="plan-sync-row" role="status">
            <span
              className={`plan-sync-indicator${
                planSyncStatus.isLoading || planSyncStatus.isRealtimeSyncing
                  ? " plan-sync-indicator--pulse"
                  : ""
              }`}
              aria-hidden
            />
            <span className="plan-sync-text">
              {planSyncStatus.error
                ? "Live pricing offline – showing cached tiers"
                : planSyncStatus.isLoading
                ? "Syncing latest pricing…"
                : planSyncStatus.isRealtimeSyncing
                ? "Refreshing live pricing…"
                : planSyncStatus.updatedAt
                ? `Synced ${formatRelativeTime(planSyncStatus.updatedAt)}`
                : "Live pricing ready"}
            </span>
          </div>

          {planSyncStatus.error && (
            <div className="plan-sync-alert" role="alert">
              {planSyncStatus.error}
            </div>
          )}

          <div className="plan-grid">
            {planOptions.map((option) => {
              const isActive = option.id === selectedPlanId;
              return (
                <button
                  key={option.id}
                  className={`plan-card${isActive ? " plan-card--active" : ""}`}
                  onClick={() => setSelectedPlan(option.id)}
                  disabled={isProcessing}
                >
                  <div className="plan-card-header">
                    <span className="plan-name">{option.name}</span>
                    <div className="plan-price-block">
                      <span className="plan-price">{option.price}</span>
                      {typeof option.meta.tonAmount === "number" &&
                        option.meta.tonAmount > 0 && (
                        <span className="plan-secondary-meta">
                          ≈ {option.meta.tonAmount.toFixed(2)} TON
                        </span>
                      )}
                      {typeof option.meta.dctAmount === "number" &&
                        option.meta.dctAmount > 0 && (
                        <span className="plan-secondary-meta">
                          ≈ {option.meta.dctAmount.toFixed(0)} DCT
                        </span>
                      )}
                    </div>
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

        <section className="section-card" id="appearance">
          <div className="section-header">
            <div>
              <h2 className="section-title">Appearance</h2>
              <p className="section-description">
                Personalise the desk with partner palettes unlocked by your
                Theme NFTs.
              </p>
            </div>
            {isThemeBusy && (
              <span
                className="theme-sync-pill"
                role="status"
                aria-live="polite"
              >
                Syncing…
              </span>
            )}
          </div>

          {themeState.error && (
            <div className="plan-sync-alert" role="alert">
              {themeState.error}
            </div>
          )}

          {themeStatusMessage && (
            <p className="theme-status" role="status" aria-live="polite">
              {themeStatusMessage}
            </p>
          )}

          <div className="theme-grid" role="list">
            {themeOptions.map((theme) => {
              const isActive = themeState.activeThemeId === theme.id;
              const swatches = resolveThemeSwatches(theme);
              return (
                <button
                  key={theme.id}
                  type="button"
                  role="listitem"
                  className={`theme-option${
                    isActive ? " theme-option--active" : ""
                  }`}
                  onClick={() => {
                    if (!isActive) {
                      handleThemeSelect(theme);
                    }
                  }}
                  disabled={isThemeBusy && !isActive}
                  aria-pressed={isActive}
                >
                  <div className="theme-option__preview" aria-hidden>
                    {theme.previewImage
                      ? <img src={theme.previewImage} alt="" loading="lazy" />
                      : (
                        swatches.map((color, index) => (
                          <span
                            key={`${theme.id}-swatch-${index}`}
                            style={{ background: color }}
                          />
                        ))
                      )}
                  </div>
                  <div className="theme-option__meta">
                    <div className="theme-option__headline">
                      <span className="theme-option__name">{theme.label}</span>
                      {isActive && (
                        <span className="theme-option__badge">Active</span>
                      )}
                    </div>
                    {theme.description && (
                      <p className="theme-option__description">
                        {theme.description}
                      </p>
                    )}
                    {theme.updatedAt && (
                      <span className="theme-option__updated">
                        Updated {formatRelativeTime(theme.updatedAt)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            {!themeOptions.length && (
              <div className="theme-empty" role="listitem">
                <p>{themeEmptyCopy}</p>
              </div>
            )}
          </div>

          <div className="theme-actions">
            <button
              type="button"
              className="button button-ghost"
              onClick={handleThemeReset}
              disabled={!themeState.activeThemeId || isThemeBusy}
            >
              Use default palette
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={handleThemeRefresh}
              disabled={themeState.isLoading}
            >
              Refresh themes
            </button>
          </div>
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

      <StickyNav
        activeSection={activeSection}
        onNavigate={scrollToSection}
      />
    </div>
  );
}



export default function Page() {
  return (
    <TonConnectUIProvider
      manifestUrl="/tonconnect-manifest.json"
      walletsListConfiguration={{ includeWallets: RECOMMENDED_WALLETS }}
    >
      <HomeInner />
    </TonConnectUIProvider>
  );
}
