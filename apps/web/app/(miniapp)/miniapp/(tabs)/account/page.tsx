"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, CreditCard, Settings } from "lucide-react";
import { Sheet } from "@/components/miniapp/Sheet";
import {
  getTelegramWebApp,
  haptic,
  hideMainButton,
  setMainButton,
} from "@/lib/telegram";
import { track } from "@/lib/metrics";

export default function AccountTab() {
  const [showSheet, setShowSheet] = useState(false);

  const openConcierge = useCallback(() => {
    const conciergeUrl = "https://t.me/DynamicCapital_Support";
    haptic("medium");
    void track("account_concierge_support");
    setShowSheet(false);
    const telegram = getTelegramWebApp();
    if (telegram?.openTelegramLink) {
      telegram.openTelegramLink(conciergeUrl);
    } else {
      window.open(conciergeUrl, "_blank");
    }
  }, []);

  useEffect(() => {
    if (showSheet) {
      setMainButton("Message concierge", () => openConcierge());
    } else {
      hideMainButton();
    }

    return () => hideMainButton();
  }, [openConcierge, showSheet]);

  return (
    <>
      <section className="card" style={{ display: "grid", gap: 16 }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 16,
              display: "grid",
              placeItems: "center",
              background: "rgba(48, 194, 242, 0.12)",
              color: "var(--tg-accent)",
            }}
          >
            <BadgeCheck size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Your VIP status</h2>
            <p className="muted" style={{ margin: 0 }}>
              Active — renews automatically every 30 days.
            </p>
          </div>
        </header>

        <div
          style={{
            display: "grid",
            gap: 12,
            fontSize: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">Plan</span>
            <strong>VIP Momentum</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">Next renewal</span>
            <strong>June 24</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">Referral boost</span>
            <strong>+2% lifetime</strong>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            className="btn"
            onClick={() => {
              haptic("medium");
              void track("account_manage_billing");
              setShowSheet(true);
            }}
          >
            <CreditCard size={18} /> Manage billing
          </button>
          <button
            className="btn"
            style={{
              background: "transparent",
              color: "var(--brand-text)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
            onClick={() => {
              haptic("light");
              void track("account_preferences");
              setShowSheet(true);
            }}
          >
            <Settings size={18} /> Preferences
          </button>
        </div>
      </section>

      <Sheet
        open={showSheet}
        onClose={() => setShowSheet(false)}
        title="Coming soon"
      >
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ margin: 0 }}>
            We're finalizing direct billing management inside Telegram. In the
            meantime, support can adjust your cycle instantly.
          </p>
          <button className="btn" onClick={openConcierge}>
            Message concierge
          </button>
          <p className="muted" style={{ margin: 0 }}>
            Average VIP response time: under 2 minutes.
          </p>
        </div>
      </Sheet>
    </>
  );
}
