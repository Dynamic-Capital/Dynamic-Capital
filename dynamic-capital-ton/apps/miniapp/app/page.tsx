"use client";

import { TonConnectButton, TonConnectUIProvider, useTonConnectUI } from "@tonconnect/ui-react";
import { useState } from "react";

type Plan = "vip_bronze" | "vip_silver" | "vip_gold" | "mentorship";

type TelegramUser = {
  id?: number;
};

type TelegramWebApp = {
  initDataUnsafe?: {
    user?: TelegramUser;
  };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

function useTelegramId(): string {
  if (typeof window === "undefined") {
    return "demo";
  }

  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return telegramId ? String(telegramId) : "demo";
}

function HomeInner() {
  const [tonConnectUI] = useTonConnectUI();
  const [plan, setPlan] = useState<Plan>("vip_bronze");
  const [txHash, setTxHash] = useState("");
  const telegramId = useTelegramId();

  async function link() {
    if (!tonConnectUI) return;
    const wallet = tonConnectUI.account;
    if (!wallet) return;
    await fetch("/api/link-wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegram_id: telegramId,
        address: wallet.address,
        publicKey: wallet.publicKey,
      }),
    });
  }

  async function payAndProcess() {
    if (!tonConnectUI) return;

    const fakeHash = `FAKE_TX_HASH_${Date.now()}`;
    setTxHash(fakeHash);

    await fetch("/api/process-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegram_id: telegramId,
        plan,
        tx_hash: fakeHash,
      }),
    });
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Dynamic Capital — Mini App</h1>
      <TonConnectButton />
      <button className="rounded bg-black px-4 py-2 text-white" onClick={link}>
        Link Wallet
      </button>

      <div className="mt-4 w-full max-w-md rounded border p-4">
        <h2 className="mb-2 font-semibold">Subscribe</h2>
        <select
          value={plan}
          onChange={(event) => setPlan(event.target.value as Plan)}
          className="mb-2 w-full rounded border p-2"
        >
          <option value="vip_bronze">VIP Bronze (3 mo)</option>
          <option value="vip_silver">VIP Silver (6 mo)</option>
          <option value="vip_gold">VIP Gold (12 mo)</option>
          <option value="mentorship">Mentorship</option>
        </select>
        <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={payAndProcess}>
          Pay in TON &amp; Auto-Invest
        </button>
        {txHash && <p className="mt-2 text-xs">tx: {txHash}</p>}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <TonConnectUIProvider manifestUrl="/tonconnect-manifest.json">
      <HomeInner />
    </TonConnectUIProvider>
  );
}
