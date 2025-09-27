import type { LiveTimelineEntry } from "./live-intel";

export const OVERVIEW_FEATURES = [
  {
    title: "Live Signal Desk",
    description:
      "High-conviction execution with 24/7 desk monitoring across majors, TON ecosystem, and DeFi rotations.",
  },
  {
    title: "Auto-Invest Vaults",
    description:
      "Deploy into curated baskets that rebalance automatically with transparent on-chain attestations.",
  },
  {
    title: "Risk Controls",
    description:
      "Dynamic guardrails, circuit breakers, and managed drawdown ceilings purpose-built for active traders.",
  },
];

export const ACTIVITY_FEED: LiveTimelineEntry[] = [
  {
    title: "Desk sync complete",
    status: "complete",
    timestamp: "12:04",
    description:
      "Wallet authorized with trading desk. Next rebalancing cycle triggers at 18:00 UTC.",
  },
  {
    title: "Strategy review",
    status: "pending",
    timestamp: "Today",
    description:
      "Bronze plan summary ready. Confirm subscription to unlock full auto-invest routing.",
  },
  {
    title: "Capital deployment window",
    status: "upcoming",
    timestamp: "Tomorrow",
    description:
      "Desk will open a short deployment window for high-volume TON liquidity pairs.",
  },
];

export type SupportOption = {
  title: string;
  description: string;
  action: string;
};

export const SUPPORT_OPTIONS: SupportOption[] = [
  {
    title: "Concierge chat",
    description:
      "Direct line to our desk managers for allocation or compliance questions.",
    action: "Open Telegram thread",
  },
  {
    title: "Trading playbook",
    description:
      "Step-by-step frameworks and risk tooling to mirror the Dynamic Capital approach.",
    action: "View docs",
  },
  {
    title: "Status center",
    description:
      "Check live uptime for deposits, OCR, and auto-invest execution engines.",
    action: "Launch status page",
  },
];
