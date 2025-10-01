"use client";

import type { OnboardAPI } from "@web3-onboard/core";

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
      chains: [
        {
          id: "0x1",
          token: "ETH",
          label: "Ethereum Mainnet",
          rpcUrl: "https://rpc.ankr.com/eth",
        },
      ],
      appMetadata: {
        name: "Dynamic Capital",
        icon: "/logo.svg",
        description: "Dynamic Capital trading desk and portfolio tools",
        recommendedInjectedWallets: [
          { name: "Bitget Wallet", url: "https://bitkeep.com" },
          { name: "MetaMask", url: "https://metamask.io" },
        ],
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
