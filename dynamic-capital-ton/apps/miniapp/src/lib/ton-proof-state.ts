export type TonProofStateStatus =
  | "idle"
  | "loading"
  | "ready"
  | "verified"
  | "error";

export type TonProofState = {
  status: TonProofStateStatus;
  error?: string;
};

export type TonProofUiVariant = "info" | "loading" | "error" | "success";

export type TonProofUiState = {
  variant: TonProofUiVariant;
  title: string;
  description?: string;
  showRetry: boolean;
  retryDisabled: boolean;
  linkDisabled: boolean;
};

type DeriveTonProofUiStateParams = {
  state: TonProofState;
  hasWallet: boolean;
  hasProof: boolean;
  walletVerified: boolean;
};

const FALLBACK_ERROR_MESSAGE =
  "Unable to prepare TON wallet verification. Retry shortly.";

export function deriveTonProofUiState({
  state,
  hasWallet,
  hasProof,
  walletVerified,
}: DeriveTonProofUiStateParams): TonProofUiState {
  if (!hasWallet) {
    return {
      variant: "info",
      title: "Connect a TON wallet to begin",
      description:
        "Use the TON Connect button to start the verification handshake.",
      showRetry: false,
      retryDisabled: true,
      linkDisabled: true,
    };
  }

  if (walletVerified || state.status === "verified") {
    return {
      variant: "success",
      title: "Wallet verified",
      description: "You're cleared to subscribe and access the desk.",
      showRetry: false,
      retryDisabled: true,
      linkDisabled: true,
    };
  }

  if (state.status === "loading") {
    return {
      variant: "loading",
      title: "Preparing TON wallet verification…",
      description: "Approve the request in your TON wallet when prompted.",
      showRetry: false,
      retryDisabled: true,
      linkDisabled: true,
    };
  }

  if (state.status === "error") {
    return {
      variant: "error",
      title: state.error ?? FALLBACK_ERROR_MESSAGE,
      description: "Retry to generate a fresh proof challenge.",
      showRetry: true,
      retryDisabled: false,
      linkDisabled: true,
    };
  }

  if (state.status === "ready" && !hasProof) {
    return {
      variant: "loading",
      title: "Waiting for TON proof signature…",
      description: "Confirm the verification prompt inside your wallet.",
      showRetry: true,
      retryDisabled: false,
      linkDisabled: true,
    };
  }

  if (state.status === "ready" && hasProof) {
    return {
      variant: "info",
      title: "Wallet proof ready",
      description: "Link your wallet to finish verification with the desk.",
      showRetry: false,
      retryDisabled: false,
      linkDisabled: false,
    };
  }

  return {
    variant: "info",
    title: "Prepare TON wallet verification",
    description: "Tap retry if your wallet did not receive the proof request.",
    showRetry: true,
    retryDisabled: false,
    linkDisabled: true,
  };
}

export const DEFAULT_TON_PROOF_REFRESH_BUFFER_MS = 15_000;

type ComputeTonProofRefreshDelayParams = {
  expiresAt: string | null | undefined;
  now: number;
  walletVerified: boolean;
  bufferMs?: number;
};

export function computeTonProofRefreshDelay({
  expiresAt,
  now,
  walletVerified,
  bufferMs = DEFAULT_TON_PROOF_REFRESH_BUFFER_MS,
}: ComputeTonProofRefreshDelayParams): number | null {
  if (!expiresAt || walletVerified) {
    return null;
  }

  const parsed = Date.parse(expiresAt);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const delay = parsed - now - bufferMs;
  if (delay <= 0) {
    return 0;
  }

  return delay;
}
