"use client";

import { useMemo } from "react";
import { ArrowRight, BellRing, Sparkles } from "lucide-react";

import { haptic } from "@/lib/telegram";
import { track } from "@/lib/metrics";

type WatchlistAsset = {
  symbol: string;
  price: string;
  change: string;
  bias: "Bullish" | "Neutral" | "Bearish";
  catalyst: string;
};

export default function WatchlistPage() {
  const assets = useMemo<WatchlistAsset[]>(
    () => [
      {
        symbol: "BTC",
        price: "$68,940",
        change: "+2.4%",
        bias: "Bullish",
        catalyst: "Asia session continuation + ETF inflows",
      },
      {
        symbol: "ETH",
        price: "$3,570",
        change: "-0.8%",
        bias: "Neutral",
        catalyst: "Merge upgrade roadmap + L2 flows",
      },
      {
        symbol: "SOL",
        price: "$186.40",
        change: "+5.1%",
        bias: "Bullish",
        catalyst: "Validator incentives + NFT mint rotation",
      },
      {
        symbol: "LINK",
        price: "$18.92",
        change: "+1.2%",
        bias: "Bearish",
        catalyst: "Staking unlocks + CEX outflows slowing",
      },
    ],
    [],
  );

  return (
    <section className="card" style={{ display: "grid", gap: 16 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Core Watchlist</h2>
          <p className="muted" style={{ margin: 0 }}>
            Auto-syncs with the Dynamic Capital signals desk.
          </p>
        </div>
        <button
          className="btn"
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
          onClick={() => {
            haptic("light");
            void track("watchlist_toggle_alerts");
          }}
        >
          <BellRing size={16} />
          Manage alerts
        </button>
      </header>

      <div style={{ display: "grid", gap: 12 }}>
        {assets.map((asset) => (
          <article
            key={asset.symbol}
            style={{
              display: "grid",
              gap: 10,
              padding: "16px",
              borderRadius: 16,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.08)",
                    fontWeight: 600,
                  }}
                >
                  {asset.symbol}
                </span>
                <div style={{ display: "grid", gap: 4 }}>
                  <strong>{asset.price}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {asset.change}
                  </span>
                </div>
              </div>
              <span
                className="muted"
                style={{
                  fontSize: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: asset.bias === "Bullish"
                    ? "#6EE7B7"
                    : asset.bias === "Bearish"
                    ? "#FCA5A5"
                    : "var(--brand-text)",
                }}
              >
                <Sparkles size={14} />
                {asset.bias}
              </span>
            </div>
            <p style={{ margin: 0, color: "var(--brand-text)", fontSize: 13 }}>
              {asset.catalyst}
            </p>
            <button
              className="btn"
              style={{ justifySelf: "flex-start" }}
              onClick={() => {
                haptic("medium");
                void track("watchlist_open_playbook");
              }}
            >
              <ArrowRight size={16} />
              View playbook
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
