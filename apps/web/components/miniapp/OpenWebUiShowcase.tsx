"use client";

import { motion } from "framer-motion";
import { ArrowRight, LayoutDashboard, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  OpenWebUiBadge,
  openWebUiGlowStyle,
  openWebUiPanelStyle,
} from "@shared/openwebui";

const FEATURES = [
  {
    title: "Pinned quick actions",
    description:
      "Curate the same rapid trade, funding, and compliance workflows across web and mini app surfaces.",
  },
  {
    title: "Mirror live metrics",
    description:
      "Open WebUI mirrors the live desk metrics, colour tokens, and alerting cadence from the Telegram workspace.",
  },
  {
    title: "Unified theming",
    description:
      "Wallet-driven themes and data attributes stream directly into the Open WebUI console for instant parity.",
  },
] as const;

const QUICK_STATS = [
  { label: "Pinned actions", value: "6" },
  { label: "Signal latency", value: "148 ms" },
  { label: "Desk uptime", value: "99.98%" },
] as const;

const OUTER_STYLE: CSSProperties = openWebUiPanelStyle({
  padding: "1px",
  borderRadius: "32px",
});

const INNER_STYLE: CSSProperties = {
  borderRadius: "30px",
  background: "rgba(6, 15, 32, 0.78)",
  border: "1px solid rgba(129, 196, 255, 0.28)",
  padding: "2.75rem",
  position: "relative",
  overflow: "hidden",
  backdropFilter: "blur(18px)",
};

export function OpenWebUiShowcase() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="px-6"
      aria-labelledby="open-webui-showcase-heading"
    >
      <div style={OUTER_STYLE}>
        <div
          style={INNER_STYLE}
          className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]"
        >
          <div className="space-y-8">
            <OpenWebUiBadge />
            <div className="space-y-4">
              <h2
                id="open-webui-showcase-heading"
                className="text-balance font-heading text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl"
              >
                Open WebUI workspace for the trading desk
              </h2>
              <p className="text-base leading-relaxed text-slate-200/80">
                Launch the same Dynamic Capital experience in Open WebUI for
                teams who prefer the desktop console. Every layout tile, quick
                action, and alerting cadence stays in sync with the Telegram
                mini app.
              </p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <li
                  key={feature.title}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 text-left text-sm text-slate-100/90 backdrop-blur"
                >
                  <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
                    <Sparkles className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="space-y-1">
                    <p className="font-semibold tracking-tight text-slate-50">
                      {feature.title}
                    </p>
                    <p className="text-xs leading-relaxed text-slate-200/80">
                      {feature.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-4">
              <Button
                variant="premium"
                href="/ui/sandbox"
                className="gap-2 uppercase tracking-[0.28em]"
              >
                Preview workspace
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                variant="outline"
                href="/miniapp"
                className="gap-2 border-white/30 text-slate-100 hover:bg-white/10"
              >
                Sync mini app
                <LayoutDashboard className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div
              aria-hidden
              style={openWebUiGlowStyle({ inset: "auto -20% -20% auto" })}
            />
            <div
              className={cn(
                "w-full max-w-sm rounded-3xl border border-white/20 bg-slate-900/80 p-6 text-left text-slate-100 shadow-[0_18px_46px_rgba(6,18,40,0.45)]",
                "backdrop-blur-xl",
              )}
            >
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-300/80">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 animate-pulse rounded-full bg-emerald-300"
                    aria-hidden
                  />
                  Live desk
                </span>
                <span className="flex items-center gap-1 text-[0.65rem] text-slate-200/70">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-blue-300"
                    aria-hidden
                  />
                  Open WebUI sync
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-200/80">
                  Watchlist focus
                </p>
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-4">
                  <div className="flex items-center justify-between text-xs text-slate-200/80">
                    <span className="font-semibold uppercase tracking-[0.24em]">
                      TON/USDT
                    </span>
                    <span className="text-emerald-300">+1.8%</span>
                  </div>
                  <p className="mt-3 text-3xl font-semibold text-slate-50">
                    $6.42
                  </p>
                  <p className="mt-1 text-xs text-slate-300/70">
                    Mirrored from mini app · shared alert rules
                  </p>
                </div>
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-3 text-xs text-slate-200/80">
                {QUICK_STATS.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur"
                  >
                    <dt className="uppercase tracking-[0.24em] text-slate-300/70">
                      {stat.label}
                    </dt>
                    <dd className="mt-2 text-lg font-semibold text-slate-50">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
