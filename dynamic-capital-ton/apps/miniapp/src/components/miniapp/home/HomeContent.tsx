"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Badge,
  Button,
  Card,
  Column,
  Flex,
  Grid,
  Heading,
  Icon,
  Logo,
  Text,
} from "@once-ui-system/core";
import {
  TonConnectButton,
  TonConnectUIProvider,
  useTonConnectUI,
} from "@tonconnect/ui-react";
import type {
  ActionConfiguration,
  SendTransactionRequest,
  TonConnectUI,
} from "@tonconnect/ui-react";

import { useMiniAppThemeManager } from "@shared/miniapp/use-miniapp-theme";
import type {
  MiniAppThemeOption,
  TonConnectLike,
} from "@shared/miniapp/theme-loader";
import { TONCONNECT_WALLETS_LIST_CONFIGURATION } from "@shared/ton/tonconnect-wallets";
import {
  deriveTonTransactionHash,
  linkTonMiniAppWallet,
  processTonMiniAppSubscription,
  requestTonProofChallenge,
  type Plan,
  type TonProofChallenge,
  type TonProofPayload,
} from "@/lib/ton-miniapp-helper";
import {
  computeTonProofRefreshDelay,
  deriveTonProofUiState,
  type TonProofState,
} from "@/lib/ton-proof-state";
import {
  ACTIVITY_FEED,
  FALLBACK_METRICS,
  FALLBACK_PLAN_OPTIONS,
  HERO_GRADIENT,
  OVERVIEW_FEATURES,
  PLAN_VISUALS,
  SECTION_IDS,
  SUPPORT_OPTIONS,
  arePlanOptionsEqual,
  arePlanSyncStatusesEqual,
  coerceNumber,
  formatConfidence,
  formatCurrencyAmount,
  formatPercent,
  formatRelativeTime,
  getPlanVisual,
  normalisePlanOptions,
  resolvePlanUpdatedAt,
  type MintingPlanState,
  type PlanOption,
  type PlanSyncStatus,
  type RawPlan,
  type SectionId,
  type SnapshotAdjustment,
} from "./model";
import {
  DYNAMIC_TON_API_USER_ID,
  OPS_TREASURY_ADDRESS,
  TONCONNECT_TWA_RETURN_URL,
} from "@/lib/config";
import {
  DEFAULT_REFRESH_SECONDS,
  type LiveIntelSnapshot,
  type LiveMetric,
} from "@/data/live-intel";
import { THEME_MINT_PLANS, type ThemeMintPlan } from "@/data/theme-mints";
import {
  TON_MANIFEST_RESOURCE_PATH,
  TON_MANIFEST_URL_CANDIDATES,
} from "@shared/ton/manifest";
import { TON_MANIFEST_FALLBACK_DATA_URL } from "@/lib/ton-manifest-inline";
import { resolveTonManifestUrl } from "@/lib/ton-manifest-resolver";
import { getSupabaseClient } from "@/lib/supabase-client";
import { useSyncMiniAppThemeWithOnceUI } from "@/components/Providers";

import {
  ActivityTimeline,
  LiveIntelCard,
  MetricsGrid,
  MintingDeck,
  NavigationRail,
  OverviewHero,
  PlanSelection,
  SupportGrid,
  ThemeGallery,
} from "../sections";
const TON_MANIFEST_FALLBACK_MESSAGE =
  "We’re using a bundled TON Connect manifest because the live manifest is unreachable. Wallet availability may be limited until the connection is restored.";

const TON_MANIFEST_FATAL_MESSAGE =
  "We couldn’t reach the TON Connect manifest. Please check your connection and try again.";

const CHAT_LAUNCHER_SCROLL_THRESHOLD = 220;

export const TONCONNECT_ACTIONS_CONFIGURATION =
  resolveTonConnectActionsConfiguration();

const SECTION_ICON_MAP: Record<SectionId, string> = {
  overview: "home",
  plans: "plans",
  minting: "pulse",
  intel: "intel",
  activity: "activity",
  appearance: "appearance",
  support: "support",
};

const SECTION_LABEL_MAP: Record<SectionId, string> = {
  overview: "Overview",
  plans: "Plans",
  minting: "Minting",
  intel: "Intel",
  activity: "Activity",
  appearance: "Themes",
  support: "Support",
};

function toTonConnectThemeSource(instance: TonConnectUI | null): TonConnectLike | null {
  if (!instance) {
    return null;
  }

  const toAccountLike = (value: unknown) => {
    if (!value || typeof value !== "object") {
      return null;
    }
    const candidate = value as { address?: unknown };
    const address = candidate.address;
    if (typeof address === "string" && address.trim().length > 0) {
      return { address };
    }
    return null;
  };

  const account = toAccountLike(instance.account);

  return {
    account,
    onStatusChange: (listener) =>
      instance.onStatusChange((wallet) => {
        listener(toAccountLike(wallet?.account ?? null));
      }),
  };
}

function createDefaultMintingState(): Record<number, MintingPlanState> {
  return Object.fromEntries(
    THEME_MINT_PLANS.map((plan) => [
      plan.index,
      { status: "idle", progress: 0 } as MintingPlanState,
    ]),
  );
}

type TonConnectManifestState = {
  manifestUrl: string | null;
  resolving: boolean;
  error: string | null;
  retry: () => void;
};

function useTonConnectManifestUrl(): TonConnectManifestState {
  const [state, setState] = useState<Omit<TonConnectManifestState, "retry">>({
    manifestUrl: null,
    resolving: true,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function checkCandidates() {
      const manifestCandidates = Array.from(
        new Set(
          [
            ...(typeof window !== "undefined"
              ? [
                  new URL(
                    TON_MANIFEST_RESOURCE_PATH,
                    window.location.origin,
                  ).toString(),
                ]
              : []),
            ...TON_MANIFEST_URL_CANDIDATES,
          ],
        ),
      );

      try {
        const resolved = await resolveTonManifestUrl({
          candidates: manifestCandidates,
        });

        if (cancelled) {
          return;
        }

        if (resolved) {
          setState({ manifestUrl: resolved, resolving: false, error: null });
          return;
        }

        setState({
          manifestUrl: TON_MANIFEST_FALLBACK_DATA_URL,
          resolving: false,
          error: TON_MANIFEST_FALLBACK_MESSAGE,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("Failed to resolve TON Connect manifest", error);
        setState({
          manifestUrl: TON_MANIFEST_FALLBACK_DATA_URL,
          resolving: false,
          error: TON_MANIFEST_FALLBACK_MESSAGE,
        });
      }
    }

    void checkCandidates();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState((previous) => ({
      manifestUrl: previous.manifestUrl,
      resolving: true,
      error: null,
    }));
    setAttempt((value) => value + 1);
  }, []);

  return useMemo(
    () => ({
      manifestUrl: state.manifestUrl,
      resolving: state.resolving,
      error: state.error,
      retry,
    }),
    [state.error, state.manifestUrl, state.resolving, retry],
  );
}
export { useTonConnectManifestUrl };

function useTelegramId(): string {
  const isBrowser =
    typeof globalThis !== "undefined" &&
    typeof (globalThis as { window?: unknown }).window !== "undefined";
  if (!isBrowser) {
    return DYNAMIC_TON_API_USER_ID;
  }

  const telegram = (globalThis as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number } } } } }).Telegram;
  const telegramId = telegram?.WebApp?.initDataUnsafe?.user?.id;
  return telegramId ? String(telegramId) : DYNAMIC_TON_API_USER_ID;
}

function useCompactChatLauncher(threshold: number = CHAT_LAUNCHER_SCROLL_THRESHOLD) {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let rafId: number | null = null;

    const evaluate = () => {
      rafId = null;
      const shouldCompact = window.scrollY > threshold;
      setIsCompact((previous) =>
        previous === shouldCompact ? previous : shouldCompact,
      );
    };

    const handleScroll = () => {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(evaluate);
    };

    evaluate();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, [threshold]);

  return isCompact;
}

type LiveIntelState = {
  status: "loading" | "ready" | "error";
  report?: LiveIntelSnapshot;
  updatedAt?: string;
  nextRefreshSeconds?: number;
  isSyncing: boolean;
  error?: string;
};

function useLiveIntel(pollMs: number) {
  const [state, setState] = useState<LiveIntelState>({
    status: "loading",
    report: undefined,
    updatedAt: undefined,
    nextRefreshSeconds: undefined,
    isSyncing: false,
    error: undefined,
  });
  const isUnmounted = useRef(false);

  const fetchIntel = useCallback(async () => {
    setState((previous) => ({ ...previous, isSyncing: true, error: undefined }));
    try {
      const response = await fetch("/api/live-intel", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Live intel request failed (${response.status})`);
      }
      const data = (await response.json()) as {
        generatedAt: string;
        nextUpdateInSeconds?: number;
        report?: LiveIntelSnapshot;
      };
      if (isUnmounted.current) {
        return;
      }
      setState({
        status: "ready",
        report: data.report,
        updatedAt: data.generatedAt,
        nextRefreshSeconds: data.nextUpdateInSeconds,
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
  }, []);

  useEffect(() => {
    isUnmounted.current = false;
    void fetchIntel();
    const intervalId = window.setInterval(() => {
      void fetchIntel();
    }, pollMs);

    return () => {
      isUnmounted.current = true;
      window.clearInterval(intervalId);
    };
  }, [fetchIntel, pollMs]);

  return {
    ...state,
    refresh: fetchIntel,
  };
}

function resolveTonConnectActionsConfiguration():
  | ActionConfiguration
  | undefined {
  if (!TONCONNECT_TWA_RETURN_URL) {
    return undefined;
  }

  const trimmed = TONCONNECT_TWA_RETURN_URL.trim();
  if (!trimmed || !trimmed.includes("://")) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[miniapp] Ignoring TONCONNECT_TWA_RETURN_URL without protocol",
        trimmed,
      );
    }
    return undefined;
  }

  return {
    returnStrategy: "back",
    twaReturnUrl: trimmed as `${string}://${string}`,
  };
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

export function HomeContent() {
  const [tonConnectUI] = useTonConnectUI();
  const tonConnectThemeSource = useMemo(
    () => toTonConnectThemeSource(tonConnectUI ?? null),
    [tonConnectUI],
  );
  const [planOptions, setPlanOptions] = useState<PlanOption[]>(
    () => [...FALLBACK_PLAN_OPTIONS],
  );
  const [plan, setPlan] = useState<Plan>(FALLBACK_PLAN_OPTIONS[0].id);
  const [planSyncStatus, setPlanSyncStatus] = useState<PlanSyncStatus>({
    isLoading: true,
    isRealtimeSyncing: false,
    updatedAt: undefined,
    error: null,
  });
  const [txHash, setTxHash] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [isLinking, setIsLinking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mintingStates, setMintingStates] = useState<
    Record<number, MintingPlanState>
  >(
    createDefaultMintingState,
  );
  const [tonProofChallenge, setTonProofChallenge] = useState<
    TonProofChallenge | null
  >(null);
  const [tonProofState, setTonProofState] = useState<TonProofState>({
    status: "idle",
  });
  const [tonProof, setTonProof] = useState<TonProofPayload | null>(null);
  const [walletVerified, setWalletVerified] = useState(false);
  const telegramId = useTelegramId();
  const liveIntel = useLiveIntel(DEFAULT_REFRESH_SECONDS * 1000);
  const [countdown, setCountdown] = useState<number | null>(null);
  const isChatCompact = useCompactChatLauncher();
  const { manager: themeManager, state: themeState } = useMiniAppThemeManager(
    tonConnectThemeSource,
  );
  const mintingProgressTimers = useRef<Record<number, number>>({});
  const tonProofRequestInFlight = useRef(false);
  const lastChallengeTelegramIdRef = useRef<string | null>(null);

  const updatePlanSyncStatus = useCallback(
    (updater: (previous: PlanSyncStatus) => PlanSyncStatus) => {
      setPlanSyncStatus((previous) => {
        const next = updater(previous);
        return arePlanSyncStatusesEqual(previous, next) ? previous : next;
      });
    },
    [],
  );

  const refreshTonProofChallenge = useCallback(async () => {
    if (!tonConnectUI || !telegramId || tonProofRequestInFlight.current) {
      return;
    }
    tonProofRequestInFlight.current = true;
    setWalletVerified(false);
    setTonProof(null);
    try {
      tonConnectUI.setConnectRequestParameters?.({ state: "loading" });
      setTonProofState({ status: "loading" });
      const result = await requestTonProofChallenge({ telegramId });
      if (!result.ok) {
        setTonProofState({ status: "error", error: result.error });
        tonConnectUI.setConnectRequestParameters?.(null);
        return;
      }
      setTonProofChallenge(result.challenge);
      setTonProofState({ status: "ready" });
      lastChallengeTelegramIdRef.current = telegramId;
      tonConnectUI.setConnectRequestParameters?.({
        state: "ready",
        value: { tonProof: result.challenge.payload },
      });
    } catch (error) {
      console.error("[miniapp] Failed to request TON proof challenge", error);
      setTonProofState({
        status: "error",
        error: "Unable to prepare TON wallet verification. Retry shortly.",
      });
      tonConnectUI.setConnectRequestParameters?.(null);
    } finally {
      tonProofRequestInFlight.current = false;
    }
  }, [telegramId, tonConnectUI]);

  useEffect(() => {
    if (!tonConnectUI || !telegramId) {
      return;
    }
    if (lastChallengeTelegramIdRef.current === telegramId) {
      return;
    }
    void refreshTonProofChallenge();
  }, [tonConnectUI, telegramId, refreshTonProofChallenge]);

  useEffect(() => {
    if (!tonProofChallenge) {
      return;
    }

    const delay = computeTonProofRefreshDelay({
      expiresAt: tonProofChallenge.expires_at,
      now: Date.now(),
      walletVerified,
    });

    if (delay === null) {
      return;
    }

    if (delay <= 0) {
      void refreshTonProofChallenge();
      return;
    }

    const timer = window.setTimeout(() => {
      void refreshTonProofChallenge();
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [tonProofChallenge, walletVerified, refreshTonProofChallenge]);

  useEffect(() => {
    if (!tonConnectUI) {
      setTonProof(null);
      setWalletVerified(false);
      setTonProofState({ status: "idle" });
      tonProofRequestInFlight.current = false;
      return;
    }
    const unsubscribe = tonConnectUI.onStatusChange((walletInfo) => {
      if (
        walletInfo?.connectItems?.tonProof &&
        "proof" in walletInfo.connectItems.tonProof
      ) {
        setTonProof(walletInfo.connectItems.tonProof.proof);
        setTonProofState((previous) => {
          if (previous.status === "verified") {
            return previous;
          }
          if (previous.status === "ready") {
            return previous;
          }
          return { status: "ready" };
        });
      } else {
        setTonProof(null);
      }
      if (!walletInfo) {
        setWalletVerified(false);
        setTonProofState({ status: "idle" });
        setTonProofChallenge(null);
        lastChallengeTelegramIdRef.current = null;
        tonProofRequestInFlight.current = false;
        tonConnectUI.setConnectRequestParameters?.(null);
      }
    });
    return () => {
      unsubscribe?.();
    };
  }, [tonConnectUI]);

  const selectedPlan = useMemo(
    () => planOptions.find((option) => option.id === plan),
    [plan, planOptions],
  );
  const activePlanVisual = useMemo(
    () => getPlanVisual(selectedPlan?.id ?? null),
    [selectedPlan?.id],
  );
  const planTonLabel = useMemo(() => {
    const tonAmount = selectedPlan?.meta.tonAmount;
    if (typeof tonAmount === "number") {
      return tonAmount.toLocaleString(undefined, {
        minimumFractionDigits: tonAmount % 1 === 0 ? 0 : 2,
        maximumFractionDigits: tonAmount % 1 === 0 ? 0 : 2,
      });
    }
    return null;
  }, [selectedPlan?.meta.tonAmount]);
  const planDctLabel = useMemo(() => {
    const dctAmount = selectedPlan?.meta.dctAmount;
    if (typeof dctAmount === "number") {
      return dctAmount.toLocaleString(undefined, {
        maximumFractionDigits: 0,
      });
    }
    return null;
  }, [selectedPlan?.meta.dctAmount]);
  const planUpdatedLabel = useMemo(() => {
    const updatedAt = selectedPlan?.meta.updatedAt;
    return updatedAt ? formatRelativeTime(updatedAt) : null;
  }, [selectedPlan?.meta.updatedAt]);
  const planSnapshot = useMemo(
    () => selectedPlan?.meta.snapshot ?? null,
    [selectedPlan?.meta.snapshot],
  );
  const planSnapshotCurrency = useMemo(
    () => selectedPlan?.meta.currency ?? null,
    [selectedPlan?.meta.currency],
  );
  const wallet = tonConnectUI?.account;
  const walletAddress = wallet?.address;

  const themeOptions = themeState.availableThemes;
  const walletConnected = Boolean(walletAddress);
  const tonProofUi = useMemo(
    () =>
      deriveTonProofUiState({
        state: tonProofState,
        hasWallet: walletConnected,
        hasProof: Boolean(tonProof),
        walletVerified,
      }),
    [tonProofState, walletConnected, tonProof, walletVerified],
  );
  const handleTonProofRetry = useCallback(() => {
    void refreshTonProofChallenge();
  }, [refreshTonProofChallenge]);
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

  const clearMintingTimer = useCallback((planIndex: number) => {
    if (typeof window === "undefined") {
      mintingProgressTimers.current = {};
      return;
    }
    const timers = mintingProgressTimers.current;
    const timerId = timers[planIndex];
    if (typeof timerId === "number") {
      window.clearInterval(timerId);
      delete timers[planIndex];
    }
  }, []);

  const startThemeMint = useCallback(
    async (plan: ThemeMintPlan) => {
      const existingState = mintingStates[plan.index];
      if (existingState?.status === "starting") {
        return;
      }

      setMintingStates((previous) => ({
        ...previous,
        [plan.index]: { status: "starting", progress: 12 },
      }));

      if (typeof window !== "undefined") {
        clearMintingTimer(plan.index);
        mintingProgressTimers.current[plan.index] = window.setInterval(() => {
          setMintingStates((prev) => {
            const current = prev[plan.index];
            if (!current || current.status !== "starting") {
              return prev;
            }
            const increment = 6 + Math.random() * 12;
            const nextProgress = Math.min(
              95,
              Math.round(current.progress + increment),
            );
            if (nextProgress <= current.progress) {
              return prev;
            }
            return {
              ...prev,
              [plan.index]: { ...current, progress: nextProgress },
            };
          });
        }, 900);
      }

      try {
        const response = await fetch("/api/minting/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mintIndex: plan.index,
            planName: plan.name,
            contentUri: plan.contentUri,
            priority: plan.defaultPriority,
            initiator: telegramId,
          }),
        });

        let payload: unknown = null;
        const contentType = response.headers.get("Content-Type") ?? "";
        if (contentType.includes("application/json")) {
          try {
            payload = await response.json();
          } catch {
            payload = null;
          }
        }

        if (!response.ok) {
          const errorMessage =
            typeof payload === "object" && payload && "error" in payload
              ? String(
                (payload as { error?: unknown }).error ?? "Mint start failed",
              )
              : `Mint start failed (HTTP ${response.status})`;
          throw new Error(errorMessage);
        }

        const mintRecord =
          typeof payload === "object" && payload && "mint" in payload
            ? (payload as { mint?: { started_at?: string | null } }).mint ??
              null
            : null;
        const startedAt =
          mintRecord && typeof mintRecord.started_at === "string"
            ? mintRecord.started_at
            : undefined;

        clearMintingTimer(plan.index);
        setMintingStates((previous) => ({
          ...previous,
          [plan.index]: { status: "success", startedAt, progress: 100 },
        }));
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : "Unable to reach the minting service. Please try again shortly.";
        clearMintingTimer(plan.index);
        setMintingStates((previous) => {
          const current = previous[plan.index];
          const fallbackProgress = current && current.status === "starting"
            ? current.progress
            : 0;
          return {
            ...previous,
            [plan.index]: {
              status: "error",
              error: message,
              progress: fallbackProgress,
            },
          };
        });
      }
    },
    [clearMintingTimer, mintingStates, telegramId],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    return () => {
      const timers = { ...mintingProgressTimers.current };
      Object.keys(timers).forEach((key) => {
        clearMintingTimer(Number(key));
      });
    };
  }, [clearMintingTimer]);

  const metrics = liveIntel.report?.metrics ?? FALLBACK_METRICS;
  const timeline = liveIntel.report?.timeline ?? ACTIVITY_FEED;

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (!visible.length) {
          return;
        }
        const candidateId = visible[0].target.id as SectionId;
        if (!SECTION_IDS.includes(candidateId)) {
          return;
        }
        setActiveSection((previous) =>
          previous === candidateId ? previous : candidateId
        );
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0.2, 0.4, 0.6, 0.8] },
    );

    SECTION_IDS.forEach((sectionId) => {
      const element = document.getElementById(sectionId);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;
    let pendingController: AbortController | null = null;
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    const loadPlans = async (options: { showSpinner: boolean }) => {
      if (!isMounted) {
        return;
      }

      if (pendingController) {
        pendingController.abort();
      }

      const controller = new AbortController();
      pendingController = controller;

      updatePlanSyncStatus((previous) => ({
        ...previous,
        isLoading: options.showSpinner,
        isRealtimeSyncing: !options.showSpinner,
      }));

      try {
        const response = await fetch("/api/plans", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Unexpected status ${response.status}`);
        }

        const payload = await response.json() as { plans?: RawPlan[] | null };
        if (!isMounted || controller.signal.aborted) {
          return;
        }

        const normalized = Array.isArray(payload?.plans)
          ? normalisePlanOptions(payload.plans as RawPlan[])
          : [...FALLBACK_PLAN_OPTIONS];

        setPlanOptions((previous) =>
          arePlanOptionsEqual(previous, normalized) ? previous : normalized
        );
        setPlan((current) =>
          normalized.some((option) => option.id === current)
            ? current
            : normalized[0]?.id ?? current
        );
        const nextStatus: PlanSyncStatus = {
          isLoading: false,
          isRealtimeSyncing: false,
          updatedAt: resolvePlanUpdatedAt(normalized),
          error: null,
        };
        updatePlanSyncStatus(() => nextStatus);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("[miniapp] Failed to load plans", error);
        if (!isMounted) {
          return;
        }

        setPlanOptions((previous) =>
          previous.length ? previous : [...FALLBACK_PLAN_OPTIONS]
        );
        updatePlanSyncStatus((previous) => ({
          isLoading: false,
          isRealtimeSyncing: false,
          updatedAt: previous.updatedAt,
          error: error instanceof Error
            ? error.message
            : "Unable to load plans",
        }));
      } finally {
        if (pendingController === controller) {
          pendingController = null;
        }
      }
    };

    void loadPlans({ showSpinner: true });

    const supabase = getSupabaseClient();
    if (!supabase) {
      updatePlanSyncStatus((previous) => ({
        ...previous,
        isLoading: false,
        isRealtimeSyncing: false,
        error: previous.error ??
          "Realtime sync unavailable (missing Supabase env)",
      }));
      return () => {
        isMounted = false;
        if (pendingController) {
          pendingController.abort();
        }
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }
      };
    }

    const scheduleRealtimeRefresh = () => {
      updatePlanSyncStatus((previous) => {
        if (previous.isRealtimeSyncing) {
          return previous;
        }
        return { ...previous, isRealtimeSyncing: true };
      });

      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      refreshTimeout = setTimeout(() => {
        refreshTimeout = null;
        void loadPlans({ showSpinner: false });
      }, 250);
    };

    const channel = supabase
      .channel("miniapp-subscription-plans")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscription_plans" },
        () => {
          if (!isMounted) {
            return;
          }
          scheduleRealtimeRefresh();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      if (pendingController) {
        pendingController.abort();
      }
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      supabase.removeChannel(channel);
    };
  }, [updatePlanSyncStatus]);

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

    if (!tonProof) {
      setStatusMessage(
        "Wallet verification is not ready yet. Reconnect your TON wallet and try again.",
      );
      if (tonProofState.status !== "loading") {
        void refreshTonProofChallenge();
      }
      return;
    }

    setIsLinking(true);
    setStatusMessage(null);

    const result = await linkTonMiniAppWallet({
      telegramId,
      wallet: {
        address: currentWallet.address ?? null,
        publicKey: currentWallet.publicKey ?? null,
        walletStateInit: currentWallet.walletStateInit ?? null,
      },
      proof: tonProof,
      walletAppName: tonConnectUI.wallet?.device?.appName ?? null,
    });

    setIsLinking(false);

    if (!result.ok) {
      console.error("[miniapp] Wallet link failed", result.error);
      setStatusMessage(
        result.error ??
          "Unable to link your wallet right now. Please retry in a few moments.",
      );
      setWalletVerified(false);
      if (result.status === 401 || result.status === 400) {
        void refreshTonProofChallenge();
      }
      return;
    }

    setWalletVerified(true);
    setTonProofState({ status: "verified" });
    setTonProofChallenge(null);
    tonConnectUI.setConnectRequestParameters?.(null);
    setStatusMessage("Wallet linked successfully. Desk access unlocked.");
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

    if (!walletVerified) {
      setStatusMessage(
        "Verify your TON wallet with the desk before starting a subscription.",
      );
      if (tonProofState.status !== "ready") {
        void refreshTonProofChallenge();
      }
      return;
    }

    const tonAmount = selectedPlan?.meta.tonAmount;
    if (!tonAmount || !Number.isFinite(tonAmount) || tonAmount <= 0) {
      setStatusMessage(
        "Subscription pricing unavailable right now. Refresh and try again shortly.",
      );
      return;
    }

    const treasuryAddress = OPS_TREASURY_ADDRESS;
    if (!treasuryAddress) {
      setStatusMessage(
        "Desk intake wallet unavailable. Please contact support to continue.",
      );
      return;
    }

    setIsProcessing(true);
    setStatusMessage("Confirm the transfer in your TON wallet…");
    setTxHash("");

    const nanotons = BigInt(Math.ceil(tonAmount * 1_000_000_000));
    const transaction: SendTransactionRequest = {
      validUntil: Math.floor(Date.now() / 1000) + 60 * 10,
      messages: [
        {
          address: treasuryAddress,
          amount: nanotons.toString(),
        },
      ],
    };

    try {
      const walletResponse = await tonConnectUI.sendTransaction(transaction);
      const boc = walletResponse?.boc;

      if (!boc) {
        throw new Error("Wallet did not return a signed transaction");
      }

      const derivedHash = deriveTonTransactionHash(boc);
      if (!derivedHash) {
        throw new Error(
          "Unable to derive transaction hash from wallet response",
        );
      }

      setTxHash(derivedHash);
      setStatusMessage("Transaction broadcasted. Verifying with the desk…");

      const result = await processTonMiniAppSubscription({
        telegramId,
        plan,
        txHash: derivedHash,
      });

      if (!result.ok) {
        console.error("[miniapp] Subscription request failed", result.error);
        setStatusMessage(
          result.error ??
            "We couldn't start the subscription. Give it another try after checking your connection.",
        );
        return;
      }

      setStatusMessage(
        `Subscription for ${
          selectedPlan?.name ?? "your plan"
        } submitted. Desk will confirm shortly.`,
      );
    } catch (error) {
      console.error("[miniapp] TON transaction request failed", error);
      const rejection =
        typeof (error as { code?: number })?.code === "number" &&
          (error as { code: number }).code === 300
          ? "Transaction cancelled in wallet. No funds were moved."
          : null;

      setStatusMessage(
        rejection ??
          "We couldn't start the subscription. Give it another try after checking your connection.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  const scrollToSection = useCallback(
    (sectionId: SectionId) => {
      if (typeof window === "undefined") {
        return;
      }

      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveSection(sectionId);
      }
    },
    [setActiveSection],
  );

  const handleChatLauncherClick = useCallback(() => {
    scrollToSection("support");
  }, [scrollToSection]);

  const activeTheme = useMemo(
    () =>
      themeOptions.find((theme) => theme.id === themeState.activeThemeId) ??
      null,
    [themeOptions, themeState.activeThemeId],
  );

  const accentTone = activeTheme?.cssVariables["--accent"] ?? null;
  const neutralTone = activeTheme?.cssVariables["--surface"] ?? null;
  const themeMode =
    activeTheme?.cssVariables["--tg-theme"] ??
    activeTheme?.cssVariables["--theme"] ??
    null;

  useSyncMiniAppThemeWithOnceUI({
    cssVariables: activeTheme?.cssVariables ?? null,
    accentTone,
    neutralTone,
    mode: themeMode,
  });

  const navigationItems = useMemo(
    () =>
      SECTION_IDS.map((id) => ({
        id,
        label: SECTION_LABEL_MAP[id],
        icon: SECTION_ICON_MAP[id],
      })),
    [],
  );

  const tonConnectButtonNode = (
    <TonConnectButton className="ton-connect-button" />
  );

  const themeStatus = themeStatusMessage ?? themeEmptyCopy;

  return (
    <Column as="main" gap="xl" padding="xl">
      <OverviewHero
        metrics={metrics}
        syncCountdown={countdown}
        isSyncing={liveIntel.isSyncing}
        onRefresh={liveIntel.refresh}
        tonConnectButton={tonConnectButtonNode}
        walletConnected={walletConnected}
        planTagline={activePlanVisual.tagline}
        statusMessage={statusMessage}
      />

      <PlanSelection
        options={planOptions}
        selectedPlanId={plan}
        onSelect={setPlan}
        visual={activePlanVisual}
        planSnapshot={planSnapshot}
        planTonLabel={planTonLabel}
        planDctLabel={planDctLabel}
        planUpdatedLabel={planUpdatedLabel}
        tonProofUi={tonProofUi}
        onRetryTonProof={handleTonProofRetry}
        onLinkWallet={() => void linkWallet()}
        onStartSubscription={() => void startSubscription()}
        isLinking={isLinking}
        isProcessing={isProcessing}
        statusMessage={statusMessage}
        txHash={txHash}
        walletConnected={walletConnected}
        walletVerified={walletVerified}
      />

      <MintingDeck
        plans={THEME_MINT_PLANS}
        states={mintingStates}
        onStartMint={startThemeMint}
      />

      <LiveIntelCard
        status={liveIntel.status}
        intel={liveIntel.report}
        isSyncing={liveIntel.isSyncing}
        updatedAt={liveIntel.updatedAt}
        countdown={countdown}
        error={liveIntel.error}
        onRefresh={liveIntel.refresh}
      />

      <ActivityTimeline timeline={timeline} />

      <ThemeGallery
        themes={themeOptions}
        activeThemeId={themeState.activeThemeId}
        isBusy={isThemeBusy}
        onApply={handleThemeSelect}
        onReset={handleThemeReset}
        statusMessage={themeStatus}
        walletConnected={walletConnected}
      />

      <SupportGrid options={SUPPORT_OPTIONS} />

      <NavigationRail
        items={navigationItems}
        active={activeSection}
        onNavigate={scrollToSection}
        compact={isChatCompact}
      />

      <Flex direction="row" horizontal="end">
        <Button
          variant="primary"
          prefixIcon="support"
          onClick={handleChatLauncherClick}
        >
          Chat with the desk
        </Button>
      </Flex>
    </Column>
  );
}
