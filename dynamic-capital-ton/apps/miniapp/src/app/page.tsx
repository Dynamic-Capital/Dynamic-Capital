"use client";

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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useToast } from "@once-ui-system/core";
import { useMiniAppThemeManager } from "@shared/miniapp/use-miniapp-theme";
import { TONCONNECT_WALLETS_LIST_CONFIGURATION } from "@shared/ton/tonconnect-wallets";

import {
  OpenWebUIContainer,
  type LinkWalletResult,
  type OpenWebUIHandshake,
  type SubscriptionRequest,
  type SubscriptionResult,
  type ToastPayload,
} from "@/components/openwebui";
import {
  ensureOpenWebUIAvailable,
  getOpenWebUIEmbedUrl,
  getOpenWebUIOrigins,
} from "@/lib/openwebui-client";
import {
  deriveTonTransactionHash,
  isSupportedPlan,
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
  type TonProofUiState,
} from "@/lib/ton-proof-state";
import {
  DYNAMIC_TON_API_USER_ID,
  OPS_TREASURY_ADDRESS,
  TONCONNECT_TWA_RETURN_URL,
} from "@/lib/config";
import {
  TON_MANIFEST_RESOURCE_PATH,
  TON_MANIFEST_URL_CANDIDATES,
} from "@shared/ton/manifest";
import { TON_MANIFEST_FALLBACK_DATA_URL } from "@/lib/ton-manifest-inline";
import { resolveTonManifestUrl } from "@/lib/ton-manifest-resolver";

type StatusTone = "info" | "success" | "danger";

type StatusNotice = {
  message: string;
  tone: StatusTone;
};

type TelegramUser = {
  id?: number;
};

type TelegramWebApp = {
  initData?: string | null;
  initDataUnsafe?: { user?: TelegramUser } | null;
};

type TelegramGlobal = {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
};

type TelegramInitData = {
  raw: string | null;
  unsafe: unknown;
};

type OpenWebUIAvailabilityState = "checking" | "ready" | "error";

const TON_MANIFEST_FALLBACK_MESSAGE =
  "We’re using a bundled TON Connect manifest because the live manifest is unreachable. Wallet availability may be limited until the connection is restored.";

const TON_MANIFEST_FATAL_MESSAGE =
  "We couldn’t reach the TON Connect manifest. Please check your connection and try again.";

const TONCONNECT_ACTIONS_CONFIGURATION = resolveTonConnectActionsConfiguration();

const PROOF_VARIANT_CLASSES: Record<TonProofUiState["variant"], string> = {
  info: "bg-white/10 text-white",
  loading: "bg-sky-500/20 text-sky-100",
  error: "bg-rose-500/20 text-rose-100",
  success: "bg-emerald-500/20 text-emerald-100",
};

const STATUS_NOTICE_CLASSES: Record<StatusTone, string> = {
  info: "bg-white/10 text-white",
  success: "bg-emerald-500/20 text-emerald-100",
  danger: "bg-rose-500/20 text-rose-100",
};

export default function Page() {
  const { manifestUrl, resolving, error, retry } = useTonConnectManifestUrl();

  if (resolving && !manifestUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-sm text-white">
        <span className="animate-pulse">Resolving TON Connect manifest…</span>
      </div>
    );
  }

  if (!manifestUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-sm text-white">
        <div className="space-y-6">
          <p>{TON_MANIFEST_FATAL_MESSAGE}</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-full bg-white/10 px-4 py-2 font-medium text-white transition hover:bg-white/20"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const manifestUrlForProvider = manifestUrl ?? TON_MANIFEST_FALLBACK_DATA_URL;

  return (
    <>
      {error ? <TonManifestFallbackBanner message={error} onRetry={retry} /> : null}
      <TonConnectUIProvider
        manifestUrl={manifestUrlForProvider}
        walletsListConfiguration={TONCONNECT_WALLETS_LIST_CONFIGURATION}
        actionsConfiguration={TONCONNECT_ACTIONS_CONFIGURATION}
      >
        <HomeInner />
      </TonConnectUIProvider>
    </>
  );
}

function HomeInner() {
  const [tonConnectUI] = useTonConnectUI();
  const tonConnectThemeSource = useMemo(
    () => toTonConnectThemeSource(tonConnectUI ?? null),
    [tonConnectUI],
  );
  const { state: themeState } = useMiniAppThemeManager(tonConnectThemeSource);
  const { addToast } = useToast();
  const telegramId = useTelegramId();
  const telegramInitData = useTelegramInitData();
  const [tonProofChallenge, setTonProofChallenge] = useState<
    TonProofChallenge | null
  >(null);
  const [tonProofState, setTonProofState] = useState<TonProofState>({
    status: "idle",
  });
  const [tonProof, setTonProof] = useState<TonProofPayload | null>(null);
  const [walletVerified, setWalletVerified] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusNotice, setStatusNotice] = useState<StatusNotice | null>(null);
  const [designTokens, setDesignTokens] = useState<Record<string, string>>({});
  const [openWebUIStatus, setOpenWebUIStatus] = useState<
    OpenWebUIAvailabilityState
  >("checking");
  const [openWebUIError, setOpenWebUIError] = useState<string | null>(null);
  const tonProofRequestInFlight = useRef(false);
  const lastChallengeTelegramIdRef = useRef<string | null>(null);
  const availabilityControllerRef = useRef<AbortController | null>(null);
  const handshakeVersionRef = useRef(0);

  const rawOpenWebUIUrl = getOpenWebUIEmbedUrl();
  const openWebUIEmbedUrl = useMemo(() => {
    if (!rawOpenWebUIUrl) {
      return null;
    }
    return rawOpenWebUIUrl.includes("?")
      ? `${rawOpenWebUIUrl}&miniapp=1`
      : `${rawOpenWebUIUrl}?miniapp=1`;
  }, [rawOpenWebUIUrl]);

  const { publicUrl: openWebUIPublicUrl, internalUrl: openWebUIInternalUrl } =
    useMemo(() => getOpenWebUIOrigins(), []);

  const tonWallet = tonConnectUI?.account;
  const walletAddress = tonWallet?.address ?? null;
  const walletAppName = tonConnectUI?.wallet?.device?.appName ?? null;
  const tonProofUi = useMemo(
    () =>
      deriveTonProofUiState({
        state: tonProofState,
        hasWallet: Boolean(tonWallet),
        hasProof: Boolean(tonProof),
        walletVerified,
      }),
    [tonProofState, tonWallet, tonProof, walletVerified],
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const tokens: Record<string, string> = {};
    const computed = window.getComputedStyle(document.documentElement);
    for (let index = 0; index < computed.length; index += 1) {
      const name = computed[index];
      if (!name || !name.startsWith("--")) {
        continue;
      }
      const value = computed.getPropertyValue(name);
      if (value) {
        tokens[name] = value.trim();
      }
    }
    setDesignTokens(tokens);
  }, [
    themeState.activeThemeId,
    themeState.isApplying,
    themeState.isReady,
    themeState.availableThemes.length,
  ]);

  useEffect(() => {
    if (!rawOpenWebUIUrl) {
      setOpenWebUIStatus("error");
      setOpenWebUIError(
        "Open WebUI embed URL is not configured. Update the environment variables to enable the experience.",
      );
      return;
    }

    const controller = new AbortController();
    availabilityControllerRef.current?.abort();
    availabilityControllerRef.current = controller;
    setOpenWebUIStatus("checking");
    setOpenWebUIError(null);

    ensureOpenWebUIAvailable({ signal: controller.signal })
      .then(() => {
        if (!controller.signal.aborted) {
          setOpenWebUIStatus("ready");
          setOpenWebUIError(null);
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        setOpenWebUIStatus("error");
        setOpenWebUIError(
          error instanceof Error
            ? error.message
            : "Unable to connect to Open WebUI right now.",
        );
      })
      .finally(() => {
        if (availabilityControllerRef.current === controller) {
          availabilityControllerRef.current = null;
        }
      });

    return () => controller.abort();
  }, [rawOpenWebUIUrl]);

  const retryOpenWebUI = useCallback(() => {
    if (!rawOpenWebUIUrl) {
      return;
    }
    const controller = new AbortController();
    availabilityControllerRef.current?.abort();
    availabilityControllerRef.current = controller;
    setOpenWebUIStatus("checking");
    setOpenWebUIError(null);
    ensureOpenWebUIAvailable({ signal: controller.signal, force: true })
      .then(() => {
        if (!controller.signal.aborted) {
          setOpenWebUIStatus("ready");
          setOpenWebUIError(null);
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        setOpenWebUIStatus("error");
        setOpenWebUIError(
          error instanceof Error
            ? error.message
            : "Unable to connect to Open WebUI right now.",
        );
      })
      .finally(() => {
        if (availabilityControllerRef.current === controller) {
          availabilityControllerRef.current = null;
        }
      });
  }, [rawOpenWebUIUrl]);

  const showStatus = useCallback(
    (message: string | null, tone: StatusTone = "info", options?: {
      toast?: boolean;
    }) => {
      if (!message) {
        setStatusNotice(null);
        return;
      }
      setStatusNotice({ message, tone });
      const shouldToast = options?.toast ?? tone !== "info";
      if (shouldToast) {
        addToast({
          message,
          variant: tone === "danger" ? "danger" : tone === "success" ? "success" : "info",
        });
      }
    },
    [addToast],
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
    return () => window.clearTimeout(timer);
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

  const linkWallet = useCallback(async (): Promise<LinkWalletResult> => {
    if (!tonConnectUI) {
      return { ok: false, error: "TON Connect is not ready yet." };
    }

    const currentWallet = tonConnectUI.account;
    if (!currentWallet) {
      showStatus("Connect a TON wallet to link it to the desk.", "info");
      return { ok: false, error: "Connect a TON wallet to continue." };
    }

    if (!tonProof) {
      showStatus(
        "Wallet verification is not ready yet. Reconnect your TON wallet and try again.",
        "danger",
        { toast: true },
      );
      if (tonProofState.status !== "loading") {
        void refreshTonProofChallenge();
      }
      return {
        ok: false,
        error: "Wallet verification handshake not ready. Reconnect your TON wallet and try again.",
      };
    }

    setIsLinking(true);
    showStatus(null);

    const result = await linkTonMiniAppWallet({
      telegramId,
      wallet: {
        address: currentWallet.address ?? null,
        publicKey: currentWallet.publicKey ?? null,
        walletStateInit: currentWallet.walletStateInit ?? null,
      },
      proof: tonProof,
      walletAppName,
    });

    setIsLinking(false);

    if (!result.ok) {
      console.error("[miniapp] Wallet link failed", result.error);
      showStatus(
        result.error ??
          "Unable to link your wallet right now. Please retry in a few moments.",
        "danger",
        { toast: true },
      );
      setWalletVerified(false);
      if (result.status === 401 || result.status === 400) {
        void refreshTonProofChallenge();
      }
      return result;
    }

    setWalletVerified(true);
    setTonProofState({ status: "verified" });
    setTonProofChallenge(null);
    tonConnectUI.setConnectRequestParameters?.(null);
    showStatus("Wallet linked successfully. Desk access unlocked.", "success", {
      toast: true,
    });
    return result;
  }, [
    tonConnectUI,
    tonProof,
    tonProofState.status,
    walletAppName,
    refreshTonProofChallenge,
    showStatus,
    telegramId,
  ]);

  const handleSubscriptionRequest = useCallback(
    async (request: SubscriptionRequest): Promise<SubscriptionResult> => {
      if (!tonConnectUI) {
        return { ok: false, error: "TON Connect is not ready yet." };
      }

      const currentWallet = tonConnectUI.account;
      if (!currentWallet) {
        showStatus("Connect a TON wallet to continue.", "info");
        return { ok: false, error: "Connect a TON wallet to continue." };
      }

      if (!walletVerified) {
        showStatus(
          "Verify your TON wallet with the desk before starting a subscription.",
          "danger",
          { toast: true },
        );
        if (tonProofState.status !== "ready") {
          void refreshTonProofChallenge();
        }
        return {
          ok: false,
          error: "Verify your TON wallet before starting a subscription.",
        };
      }

      const planId = request.plan;
      if (!isSupportedPlan(planId)) {
        showStatus("Unsupported subscription plan. Refresh and try again.", "danger", {
          toast: true,
        });
        return { ok: false, error: "Unsupported subscription plan." };
      }

      const tonAmountRaw = request.tonAmount;
      const tonAmount =
        typeof tonAmountRaw === "number"
          ? tonAmountRaw
          : typeof tonAmountRaw === "string"
          ? Number.parseFloat(tonAmountRaw)
          : null;

      if (!tonAmount || !Number.isFinite(tonAmount) || tonAmount <= 0) {
        showStatus(
          "Subscription pricing unavailable right now. Refresh and try again shortly.",
          "danger",
        );
        return {
          ok: false,
          error: "Subscription amount missing. Refresh and try again shortly.",
        };
      }

      const treasuryAddress = OPS_TREASURY_ADDRESS;
      if (!treasuryAddress) {
        showStatus(
          "Desk intake wallet unavailable. Please contact support to continue.",
          "danger",
          { toast: true },
        );
        return {
          ok: false,
          error: "Desk intake wallet unavailable. Contact support to continue.",
        };
      }

      setIsProcessing(true);
      showStatus("Confirm the transfer in your TON wallet…", "info");

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
          throw new Error("Unable to derive transaction hash from wallet response");
        }
        showStatus(
          "Transaction broadcasted. Verifying with the desk…",
          "success",
          { toast: true },
        );
        const result = await processTonMiniAppSubscription({
          telegramId,
          plan: planId,
          txHash: derivedHash,
        });
        if (!result.ok) {
          console.error("[miniapp] Subscription request failed", result.error);
          showStatus(
            result.error ??
              "We couldn't start the subscription. Give it another try after checking your connection.",
            "danger",
            { toast: true },
          );
          return {
            ok: false,
            error:
              result.error ??
              "Subscription processing failed. Retry after checking your connection.",
          };
        }
        showStatus(
          "Subscription submitted. The desk will confirm shortly.",
          "success",
          { toast: true },
        );
        return { ok: true };
      } catch (error) {
        console.error("[miniapp] TON transaction request failed", error);
        const rejection =
          typeof (error as { code?: number })?.code === "number" &&
            (error as { code: number }).code === 300
            ? "Transaction cancelled in wallet. No funds were moved."
            : null;
        const message =
          rejection ??
            "We couldn't start the subscription. Give it another try after checking your connection.";
        showStatus(message, "danger", { toast: true });
        return { ok: false, error: rejection ?? message };
      } finally {
        setIsProcessing(false);
      }
    },
    [
      tonConnectUI,
      walletVerified,
      tonProofState.status,
      refreshTonProofChallenge,
      showStatus,
      telegramId,
    ],
  );

  const handleToastFromIframe = useCallback(
    ({ message, variant }: ToastPayload) => {
      if (!message) {
        return;
      }
      addToast({
        message,
        variant:
          variant === "success"
            ? "success"
            : variant === "danger"
            ? "danger"
            : "info",
      });
    },
    [addToast],
  );

  const designTokenFingerprint = useMemo(
    () => JSON.stringify(designTokens),
    [designTokens],
  );
  const tonProofFingerprint = useMemo(
    () => (tonProof ? JSON.stringify(tonProof) : null),
    [tonProof],
  );

  const handshake: OpenWebUIHandshake = useMemo(() => {
    handshakeVersionRef.current += 1;
    return {
      version: handshakeVersionRef.current,
      telegram: {
        initData: telegramInitData.raw,
        initDataUnsafe: telegramInitData.unsafe,
        userId: telegramId,
      },
      supabase: {
        url: supabaseUrl,
        anonKey: supabaseAnonKey,
      },
      tonConnect: {
        address: walletAddress,
        publicKey: tonWallet?.publicKey ?? null,
        walletAppName,
        proof: tonProof,
        proofState: { ...tonProofState },
        verified: walletVerified,
      },
      tonProofChallenge,
      theme: {
        tokens: { ...designTokens },
      },
      config: {
        publicUrl: openWebUIPublicUrl,
        internalUrl: openWebUIInternalUrl,
      },
    };
  }, [
    telegramInitData.raw,
    telegramInitData.unsafe,
    telegramId,
    supabaseUrl,
    supabaseAnonKey,
    walletAddress,
    tonWallet?.publicKey,
    walletAppName,
    tonProofState.status,
    tonProofState.error,
    walletVerified,
    tonProofFingerprint,
    tonProofChallenge?.payload,
    tonProofChallenge?.expires_at,
    designTokenFingerprint,
    openWebUIPublicUrl,
    openWebUIInternalUrl,
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 lg:px-8">
        <section className="mb-6 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold">Dynamic Capital Desk</h1>
              <p className="mt-1 text-sm text-white/70">
                Connect and verify your TON wallet to unlock the embedded Open WebUI workspace.
              </p>
            </div>
            <TonConnectButton />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void linkWallet()}
              disabled={isLinking || tonProofUi.linkDisabled || walletVerified}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${walletVerified
                ? "bg-emerald-500/20 text-emerald-100"
                : isLinking
                ? "bg-white/20 text-white"
                : "bg-white/10 text-white hover:bg-white/20"}`}
            >
              {walletVerified
                ? "Wallet verified"
                : isLinking
                ? "Linking wallet…"
                : "Link wallet to desk"}
            </button>
            {tonProofUi.showRetry
              ? (
                <button
                  type="button"
                  onClick={() => void refreshTonProofChallenge()}
                  disabled={tonProofUi.retryDisabled || tonProofRequestInFlight.current}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
                >
                  Retry verification
                </button>
              )
              : null}
          </div>
          <div className={`rounded-2xl px-4 py-3 text-sm ${PROOF_VARIANT_CLASSES[tonProofUi.variant]}`}>
            <p className="font-semibold">{tonProofUi.title}</p>
            {tonProofUi.description
              ? <p className="mt-1 text-xs text-white/80">{tonProofUi.description}</p>
              : null}
          </div>
          {statusNotice
            ? (
              <div className={`rounded-2xl px-4 py-3 text-xs font-medium ${STATUS_NOTICE_CLASSES[statusNotice.tone]}`}>
                {statusNotice.message}
              </div>
            )
            : null}
          <div className="grid gap-3 text-xs text-white/60 sm:grid-cols-2">
            <div>
              <span className="font-semibold text-white">Telegram ID:</span>
              <span className="ml-2 text-white/70">{telegramId}</span>
            </div>
            <div>
              <span className="font-semibold text-white">Wallet:</span>
              <span className="ml-2 text-white/70">{formatWalletAddress(walletAddress)}</span>
            </div>
          </div>
        </section>
        <section className="space-y-4">
          <OpenWebUIContainer
            src={openWebUIEmbedUrl}
            handshake={handshake}
            availabilityStatus={openWebUIStatus}
            availabilityError={openWebUIError}
            onRetryAvailability={retryOpenWebUI}
            onRequestLinkWallet={linkWallet}
            onRequestSubscription={handleSubscriptionRequest}
            onRequestProofRefresh={() => void refreshTonProofChallenge()}
            onToast={handleToastFromIframe}
            walletVerified={walletVerified}
            isLinking={isLinking}
            isProcessing={isProcessing}
          />
          <p className="text-xs text-white/50">
            The Open WebUI embed mirrors your verified TON identity. Actions triggered inside the workspace share this session and can initiate subscriptions through the secure messaging bridge.
          </p>
        </section>
      </div>
    </div>
  );
}

function useTelegramId(): string {
  const isBrowser = typeof globalThis !== "undefined" &&
    typeof (globalThis as { window?: unknown }).window !== "undefined";
  if (!isBrowser) {
    return DYNAMIC_TON_API_USER_ID;
  }
  const telegram = (globalThis as TelegramGlobal).Telegram;
  const telegramId = telegram?.WebApp?.initDataUnsafe?.user?.id;
  return telegramId ? String(telegramId) : DYNAMIC_TON_API_USER_ID;
}

function useTelegramInitData(): TelegramInitData {
  return useMemo(() => {
    if (typeof window === "undefined") {
      return { raw: null, unsafe: null };
    }
    const webApp = (window as TelegramGlobal).Telegram?.WebApp;
    return {
      raw: typeof webApp?.initData === "string" ? webApp.initData : null,
      unsafe: webApp?.initDataUnsafe ?? null,
    };
  }, []);
}

function formatWalletAddress(address?: string | null): string {
  if (!address) {
    return "No wallet connected";
  }
  const trimmed = address.trim();
  if (trimmed.length <= 12) {
    return trimmed;
  }
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
}

function useTonConnectManifestUrl(): {
  manifestUrl: string | null;
  resolving: boolean;
  error: string | null;
  retry: () => void;
} {
  const [state, setState] = useState<{
    manifestUrl: string | null;
    resolving: boolean;
    error: string | null;
  }>({
    manifestUrl: null,
    resolving: true,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function checkCandidates(): Promise<void> {
      const manifestCandidates = Array.from(
        new Set([
          ...(typeof window !== "undefined"
            ? [
              new URL(
                TON_MANIFEST_RESOURCE_PATH,
                window.location.origin,
              ).toString(),
            ]
            : []),
          ...TON_MANIFEST_URL_CANDIDATES,
        ]),
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

function TonManifestFallbackBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-3xl bg-white/10 px-4 py-3 text-left text-xs text-white shadow-lg backdrop-blur">
        <div className="space-y-1">
          <p className="font-medium">{message}</p>
          <p className="text-white/70">
            We’ll keep trying in the background. You can also manually retry now.
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/30"
        >
          Retry
        </button>
      </div>
    </div>
  );
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

function toTonConnectThemeSource(
  instance: TonConnectUI | null,
) {
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
    onStatusChange: (listener: (wallet: { address?: string | null } | null) => void) =>
      instance.onStatusChange((wallet) => {
        listener(toAccountLike(wallet?.account ?? null));
      }),
  };
}
