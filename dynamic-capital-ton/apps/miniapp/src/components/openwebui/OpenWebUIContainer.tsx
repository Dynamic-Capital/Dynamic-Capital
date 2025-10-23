"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  Plan,
  TonProofChallenge,
  TonProofPayload,
} from "@/lib/ton-miniapp-helper";
import type { TonProofState } from "@/lib/ton-proof-state";

export type OpenWebUIHandshake = {
  version: number;
  telegram: {
    initData: string | null;
    initDataUnsafe: unknown;
    userId: string | null;
  };
  supabase: {
    url: string | null;
    anonKey: string | null;
  };
  tonConnect: {
    address: string | null;
    publicKey: string | null;
    walletAppName: string | null;
    proof: TonProofPayload | null;
    proofState: TonProofState;
    verified: boolean;
  };
  tonProofChallenge: TonProofChallenge | null;
  theme: {
    tokens: Record<string, string>;
  };
  config: {
    publicUrl: string | null;
    internalUrl: string | null;
  };
};

export type LinkWalletResult = { ok: boolean; error?: string };

export type SubscriptionRequest = {
  plan: Plan;
  tonAmount?: number | string | null;
  metadata?: Record<string, unknown> | null;
};

export type SubscriptionResult = { ok: boolean; error?: string };

export type ToastPayload = {
  message: string;
  variant?: "default" | "success" | "danger" | "info";
};

type AvailabilityState = "checking" | "ready" | "error";

type Props = {
  src: string | null;
  handshake: OpenWebUIHandshake;
  availabilityStatus: AvailabilityState;
  availabilityError: string | null;
  onRetryAvailability: () => void;
  onRequestLinkWallet: () => Promise<LinkWalletResult>;
  onRequestSubscription: (
    payload: SubscriptionRequest,
  ) => Promise<SubscriptionResult>;
  onRequestProofRefresh: () => void;
  onToast: (payload: ToastPayload) => void;
  walletVerified: boolean;
  isLinking: boolean;
  isProcessing: boolean;
};

type OpenWebUIMessage =
  | { type: "openwebui:ready" }
  | { type: "openwebui:request-handshake" }
  | { type: "openwebui:request-link-wallet" }
  | { type: "openwebui:request-proof-refresh" }
  | { type: "openwebui:request-subscription"; payload?: unknown }
  | { type: "openwebui:emit-toast"; payload?: unknown };

type SubscriptionPayload = {
  plan?: unknown;
  tonAmount?: unknown;
  metadata?: Record<string, unknown> | null;
};

type ToastMessagePayload = {
  message?: unknown;
  variant?: unknown;
};

export default function OpenWebUIContainer({
  src,
  handshake,
  availabilityStatus,
  availabilityError,
  onRetryAvailability,
  onRequestLinkWallet,
  onRequestSubscription,
  onRequestProofRefresh,
  onToast,
  walletVerified,
  isLinking,
  isProcessing,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastHandshakeFingerprintRef = useRef<string | null>(null);
  const handshakeRef = useRef(handshake);
  const [targetOrigin, setTargetOrigin] = useState<string>("*");
  const targetOriginRef = useRef<string>("*");
  const [frameReady, setFrameReady] = useState(false);

  useEffect(() => {
    handshakeRef.current = handshake;
  }, [handshake]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!src) {
      setTargetOrigin(window.location.origin);
      return;
    }
    try {
      const resolved = new URL(src, window.location.origin);
      setTargetOrigin(resolved.origin);
    } catch (error) {
      console.warn("[miniapp] Failed to resolve Open WebUI origin", error);
      setTargetOrigin(window.location.origin);
    }
  }, [src]);

  useEffect(() => {
    targetOriginRef.current = targetOrigin;
  }, [targetOrigin]);

  const postMessage = useCallback((payload: unknown) => {
    const frame = iframeRef.current;
    if (!frame || !frame.contentWindow) {
      return;
    }
    const origin = targetOriginRef.current || "*";
    frame.contentWindow.postMessage(payload, origin);
  }, []);

  const sendHandshake = useCallback(
    ({ force }: { force?: boolean } = {}) => {
      const frame = iframeRef.current;
      if (!frame || !frame.contentWindow) {
        return;
      }
      const fingerprint = JSON.stringify(handshakeRef.current);
      if (!force && fingerprint === lastHandshakeFingerprintRef.current) {
        return;
      }
      lastHandshakeFingerprintRef.current = fingerprint;
      postMessage({ type: "miniapp:handshake", payload: handshakeRef.current });
    },
    [postMessage],
  );

  useEffect(() => {
    if (!frameReady) {
      return;
    }
    sendHandshake();
  }, [frameReady, sendHandshake, handshake]);

  const handleLinkWallet = useCallback(async () => {
    try {
      const result = await onRequestLinkWallet();
      postMessage({ type: "miniapp:link-wallet-result", payload: result });
    } catch (error) {
      postMessage({
        type: "miniapp:link-wallet-result",
        payload: {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to link wallet. Retry shortly.",
        },
      });
    }
  }, [onRequestLinkWallet, postMessage]);

  const handleSubscription = useCallback(
    async (payload: SubscriptionPayload | undefined) => {
      const plan = payload?.plan;
      if (typeof plan !== "string") {
        postMessage({
          type: "miniapp:subscription-result",
          payload: {
            ok: false,
            error: "Invalid subscription payload: plan is required.",
          },
        });
        return;
      }
      const tonAmount = payload?.tonAmount ?? null;
      const normalised: SubscriptionRequest = {
        plan: plan as Plan,
        tonAmount,
        metadata: payload?.metadata ?? null,
      };
      try {
        const result = await onRequestSubscription(normalised);
        postMessage({ type: "miniapp:subscription-result", payload: result });
      } catch (error) {
        postMessage({
          type: "miniapp:subscription-result",
          payload: {
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Subscription request failed. Retry shortly.",
          },
        });
      }
    },
    [onRequestSubscription, postMessage],
  );

  const messageHandler = useCallback(
    (event: MessageEvent<OpenWebUIMessage>) => {
      const expectedOrigin = targetOriginRef.current;
      if (
        expectedOrigin !== "*" &&
        event.origin &&
        event.origin !== expectedOrigin
      ) {
        return;
      }

      const message = event.data;
      if (!message || typeof message !== "object") {
        return;
      }

      switch (message.type) {
        case "openwebui:ready":
          setFrameReady(true);
          sendHandshake({ force: true });
          break;
        case "openwebui:request-handshake":
          setFrameReady(true);
          sendHandshake({ force: true });
          break;
        case "openwebui:request-link-wallet":
          void handleLinkWallet();
          break;
        case "openwebui:request-proof-refresh":
          onRequestProofRefresh();
          break;
        case "openwebui:request-subscription":
          void handleSubscription(message.payload as SubscriptionPayload);
          break;
        case "openwebui:emit-toast": {
          const payload = message.payload as ToastMessagePayload | undefined;
          const text = typeof payload?.message === "string" ? payload.message : null;
          if (text) {
            const variant =
              payload?.variant === "success" ||
              payload?.variant === "danger" ||
              payload?.variant === "info"
                ? payload.variant
                : "default";
            onToast({ message: text, variant });
          }
          break;
        }
        default:
          break;
      }
    },
    [handleLinkWallet, handleSubscription, onRequestProofRefresh, onToast, sendHandshake],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.addEventListener("message", messageHandler);
    return () => window.removeEventListener("message", messageHandler);
  }, [messageHandler]);

  const availabilityOverlay = useMemo(() => {
    if (availabilityStatus === "ready") {
      return null;
    }
    if (availabilityStatus === "checking") {
      return (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white">
            Connecting to Open WebUI…
          </div>
        </div>
      );
    }
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/70">
        <div className="max-w-md space-y-3 rounded-2xl bg-white/10 p-4 text-center text-sm text-white">
          <p>{availabilityError ?? "Open WebUI is unavailable right now."}</p>
          <button
            type="button"
            className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30"
            onClick={onRetryAvailability}
          >
            Retry connection
          </button>
        </div>
      </div>
    );
  }, [availabilityStatus, availabilityError, onRetryAvailability]);

  const gatingOverlay = useMemo(() => {
    if (walletVerified) {
      return null;
    }
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60">
        <div className="max-w-md rounded-2xl bg-black/80 px-5 py-4 text-center text-white">
          <h3 className="text-base font-semibold">Link your TON wallet to continue</h3>
          <p className="mt-2 text-sm text-white/70">
            Connect and verify your TON wallet above. Once verified, the desk interface will unlock automatically.
          </p>
        </div>
      </div>
    );
  }, [walletVerified]);

  if (!src) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/60 p-6 text-sm text-white">
        <p className="font-semibold">Open WebUI embed disabled</p>
        <p className="mt-2 text-white/70">
          Set <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_OPEN_WEBUI_URL</code> in the Mini App environment configuration to enable the embedded experience.
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[480px] overflow-hidden rounded-3xl border border-white/10 bg-black/40">
      <iframe
        ref={iframeRef}
        src={src}
        title="Open WebUI"
        className="h-full w-full border-0"
        allow="clipboard-read; clipboard-write;"
      />
      {availabilityOverlay}
      {gatingOverlay}
      {(isLinking || isProcessing) && walletVerified && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <div className="rounded-full bg-black/70 px-4 py-1 text-xs text-white">
            {isLinking ? "Linking wallet…" : "Processing TON subscription…"}
          </div>
        </div>
      )}
    </div>
  );
}
