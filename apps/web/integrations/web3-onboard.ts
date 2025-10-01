"use client";

import type { OnboardAPI } from "@web3-onboard/core";

import { WEB3_CONFIG } from "@/config/web3";

let onboardPromise: Promise<OnboardAPI | null> | null = null;

async function initializeOnboard(): Promise<OnboardAPI | null> {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const [
      { default: createOnboard },
      { default: bitgetWalletModule },
      { default: injectedModule },
    ] = await Promise.all([
      import("@web3-onboard/core"),
      import("@web3-onboard/bitget"),
      import("@web3-onboard/injected-wallets"),
    ]);

    const bitgetWallet = bitgetWalletModule();
    const injectedWallets = injectedModule();

    return createOnboard({
      wallets: [bitgetWallet, injectedWallets],
      chains: WEB3_CONFIG.chains,
      appMetadata: {
        name: WEB3_CONFIG.metadata.name,
        icon: WEB3_CONFIG.metadata.icon,
        description: WEB3_CONFIG.metadata.description,
        recommendedInjectedWallets:
          WEB3_CONFIG.metadata.recommendedInjectedWallets,
      },
    });
  } catch (error) {
    console.error("[web3-onboard] Failed to initialize", error);
    return null;
  }
}

export async function getOnboard(): Promise<OnboardAPI | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (!onboardPromise) {
    onboardPromise = initializeOnboard().catch((error) => {
      console.error("[web3-onboard] Initialization error", error);
      onboardPromise = null;
      return null;
    });
  }

  return onboardPromise;
}
