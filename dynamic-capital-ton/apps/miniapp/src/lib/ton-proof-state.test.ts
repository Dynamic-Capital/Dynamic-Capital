import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeTonProofRefreshDelay,
  deriveTonProofUiState,
} from "./ton-proof-state";

describe("deriveTonProofUiState", () => {
  it("disables linking until a wallet is connected", () => {
    const uiState = deriveTonProofUiState({
      state: { status: "idle" },
      hasWallet: false,
      hasProof: false,
      walletVerified: false,
    });

    assert.equal(uiState.linkDisabled, true);
    assert.equal(uiState.variant, "info");
    assert.equal(uiState.showRetry, false);
  });

  it("keeps the link action disabled until the proof arrives", () => {
    const uiState = deriveTonProofUiState({
      state: { status: "ready" },
      hasWallet: true,
      hasProof: false,
      walletVerified: false,
    });

    assert.equal(uiState.variant, "loading");
    assert.equal(uiState.linkDisabled, true);
    assert.equal(uiState.showRetry, true);
  });

  it("enables the link action once proof payload is available", () => {
    const uiState = deriveTonProofUiState({
      state: { status: "ready" },
      hasWallet: true,
      hasProof: true,
      walletVerified: false,
    });

    assert.equal(uiState.linkDisabled, false);
    assert.equal(uiState.variant, "info");
    assert.equal(uiState.showRetry, false);
  });

  it("surfaces server errors from the proof request", () => {
    const uiState = deriveTonProofUiState({
      state: { status: "error", error: "Challenge unavailable" },
      hasWallet: true,
      hasProof: false,
      walletVerified: false,
    });

    assert.equal(uiState.variant, "error");
    assert.equal(uiState.linkDisabled, true);
    assert.equal(uiState.title, "Challenge unavailable");
    assert.equal(uiState.showRetry, true);
  });

  it("reflects the verified state even if a new proof isn't requested", () => {
    const uiState = deriveTonProofUiState({
      state: { status: "verified" },
      hasWallet: true,
      hasProof: true,
      walletVerified: true,
    });

    assert.equal(uiState.variant, "success");
    assert.equal(uiState.linkDisabled, true);
    assert.equal(uiState.showRetry, false);
  });
});

describe("computeTonProofRefreshDelay", () => {
  it("returns a positive delay before the challenge expires", () => {
    const now = Date.now();
    const expiresAt = new Date(now + 60_000).toISOString();
    const delay = computeTonProofRefreshDelay({
      expiresAt,
      now,
      walletVerified: false,
    });

    assert.equal(delay !== null && delay > 0, true);
    assert.equal(delay! < 60_000, true);
  });

  it("requests an immediate refresh when the challenge is stale", () => {
    const now = Date.now();
    const expiresAt = new Date(now - 1_000).toISOString();
    const delay = computeTonProofRefreshDelay({
      expiresAt,
      now,
      walletVerified: false,
    });

    assert.equal(delay, 0);
  });

  it("skips refreshes once the wallet is verified", () => {
    const delay = computeTonProofRefreshDelay({
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
      now: Date.now(),
      walletVerified: true,
    });

    assert.equal(delay, null);
  });

  it("ignores invalid timestamps", () => {
    const delay = computeTonProofRefreshDelay({
      expiresAt: "not-a-date",
      now: Date.now(),
      walletVerified: false,
    });

    assert.equal(delay, null);
  });
});
