import { dynamicBranding } from "@/resources";

import type {
  MetricHighlight,
  PlanPreset,
  WorkflowStep,
} from "./types";

export const BRAND_METADATA = dynamicBranding.metadata;
export const BRAND_GRADIENTS = dynamicBranding.gradients;
export const BRAND_GLASS = BRAND_GRADIENTS.glass;

export const METRIC_HIGHLIGHTS: MetricHighlight[] = [
  {
    icon: "shield",
    value: "99.9%",
    label: "desk uptime",
    description:
      "Redundant guardrails keep deposits safe and auditable for every cohort.",
  },
  {
    icon: "zap",
    value: "2m avg",
    label: "payment review",
    description: "Bank & crypto proofs sync to reviewers in minutes.",
  },
  {
    icon: "repeat",
    value: "80%",
    label: "automation coverage",
    description: "Dynamic playbooks orchestrate the repetitive steps for you.",
  },
];

export const PLAN_PRESETS: PlanPreset[] = [
  {
    id: "starter",
    name: "Signal Launchpad",
    price: "$99/mo",
    icon: "sparkles",
    summary: "Guided trade prompts with built-in risk guardrails.",
    badge: "Popular",
    turnaround: "Under 5 minutes to onboard",
    focus: "For new desk members",
    benefits: [
      "Auto-syncs alerts to Telegram and the web dashboard",
      "Compliance-ready receipts with every approved transfer",
      "Warm-up drills delivered alongside live signal context",
    ],
  },
  {
    id: "growth",
    name: "Momentum Studio",
    price: "$249/mo",
    icon: "trending-up",
    summary: "Personalized scenarios, coaching clips, and weekly reviews.",
    turnaround: "Desk concierge in < 2 hours",
    focus: "For scaling traders",
    benefits: [
      "Pair accounts across bank, crypto, and prop firm wallets",
      "Scenario builder exports ready-to-run automations",
      "Shared review workspace keeps mentors & analysts aligned",
    ],
  },
  {
    id: "vip",
    name: "Dynamic VIP Desk",
    price: "$799/mo",
    icon: "crown",
    summary: "Hands-on desk with white-glove payment routing & risk ops.",
    turnaround: "Full concierge in < 30 minutes",
    focus: "For desk partners",
    benefits: [
      "Priority routing with dedicated Telegram escalation lane",
      "Batch settlement tracking across every funding channel",
      "Live hedging telemetry streamed to your command center",
    ],
  },
];

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "intake",
    icon: "inbox",
    title: "Unified intake",
    short: "Collect documents",
    description:
      "Start from a single intake form that captures KYC docs, preferred payment rails, and trading objectives.",
    highlights: [
      "Dynamic form swaps fields based on desk playbook",
      "Uploads stored with instant compliance checks",
      "Telegram mini app mirrors the same step in real time",
    ],
    tip:
      "Desk members can pause and resume the intake from any device without losing progress.",
  },
  {
    id: "routing",
    icon: "map",
    title: "Smart routing",
    short: "Pick the payment lane",
    description:
      "Let the GUI route deposits through the optimal bank, crypto, or prop channel with real-time limits applied.",
    highlights: [
      "See guardrails for each rail before committing",
      "Auto-generated payment instructions with QR & deep links",
      "Escalation lane pre-configured for high-touch clients",
    ],
    tip:
      "Switch rails on the fly—Dynamic Capital recalculates fees and compliance checks instantly.",
  },
  {
    id: "review",
    icon: "check",
    title: "Proof review",
    short: "Verify receipts",
    description:
      "Review incoming proofs with AI triage, annotate exceptions, and trigger automated follow-ups when needed.",
    highlights: [
      "Live status sync to Telegram, email, and the web console",
      "Two-click escalation to senior desk operators",
      "Immutable audit trail exported to your vault",
    ],
    tip:
      "Approvals push straight to the trading room so clients can deploy capital immediately.",
  },
];
