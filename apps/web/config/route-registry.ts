import {
  ActivitySquare,
  BookOpen,
  Bot,
  Boxes,
  ChartCandlestick,
  Command,
  Compass,
  Cpu,
  Gauge,
  GraduationCap,
  Layers,
  LineChart,
  LogIn,
  MessageSquareText,
  Network,
  NotebookPen,
  PieChart,
  Radar,
  Receipt,
  ShieldCheck,
  Star,
  Trophy,
  Users,
  Wallet2,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import { dynamicBranding } from "@/resources";

export type RouteCategoryId =
  | "foundations"
  | "products"
  | "insights"
  | "operations"
  | "community";

export interface RouteHint {
  title: string;
  description: string;
}

export interface WorkspaceTag {
  label: string;
  tone?: "brand" | "accent" | "neutral" | "success" | "warning";
}

export interface WorkspaceAction {
  label: string;
  href: string;
  icon?: LucideIcon;
  emphasis?: "primary" | "secondary" | "ghost";
}

export interface WorkspaceMeta {
  eyebrow?: string;
  title: string;
  description: string;
  tags?: WorkspaceTag[];
  actions?: WorkspaceAction[];
}

export interface CommandBarMeta {
  group: "dynamic-services";
  order: number;
  emphasis?: "brand" | "accent" | "neutral";
  icon?: LucideIcon;
  ctaLabel?: string;
}

export type FooterGroup = "workspace" | "quick";

export interface FooterPlacement {
  group: FooterGroup;
  order: number;
}

export interface RouteDefinition {
  id: string;
  path: string;
  matchers?: RegExp[];
  label: string;
  shortLabel?: string;
  description: string;
  categoryId: RouteCategoryId;
  icon?: LucideIcon;
  tags: string[];
  tonSignals?: string[];
  owner: string;
  surfaces: string[];
  hint: RouteHint;
  workspace?: WorkspaceMeta;
  nav?: {
    group: "primary" | "secondary" | "support" | "admin";
    order: number;
    showOnMobile?: boolean;
    ariaLabel?: string;
  };
  commandBar?: CommandBarMeta;
  footer?: FooterPlacement[];
}

const ROUTE_DEFINITIONS = [
  {
    id: "dynamic-chat-hub",
    path: "/",
    label: "Dynamic chat hub",
    shortLabel: "Chat",
    description:
      "Stream TON-native market reviews, trade signals, and orchestrate AGI copilots the moment the desk loads.",
    categoryId: "insights",
    icon: MessageSquareText,
    tags: ["TON", "AI", "Signals"],
    tonSignals: [
      "TonConnect intents",
      "desk automation",
      "guardrail overrides",
    ],
    owner: "Dynamic Intelligence Platform",
    surfaces: ["Chat", "Signals", "Command bar"],
    hint: {
      title: "Start with Dynamic Chat",
      description:
        "Launch AI copilots, review trade signals, and open TON actions without leaving the conversation.",
    },
    workspace: {
      eyebrow: "Dynamic intelligence",
      title: "Dynamic chat control tower",
      description:
        "Coordinate AGI copilots, TON wallet intents, and desk automations from a single conversational surface.",
      tags: [
        { label: "TON-native", tone: "brand" },
        { label: "AI orchestration", tone: "accent" },
        { label: "Signal streaming", tone: "neutral" },
      ],
      actions: [
        {
          label: "View routing map",
          href: "/tools/dynamic-visual",
          icon: Network,
          emphasis: "secondary",
        },
      ],
    },
    nav: {
      group: "primary",
      order: 1,
      showOnMobile: true,
      ariaLabel:
        "Chat hub. Stream TON-native market reviews, trade signals, and orchestrate AGI copilots.",
    },
    commandBar: {
      group: "dynamic-services",
      order: 1,
      emphasis: "brand",
      icon: MessageSquareText,
      ctaLabel: "Launch chat",
    },
    footer: [
      { group: "workspace", order: 1 },
    ],
  },
  {
    id: "vip-plans",
    path: "/plans",
    label: "VIP plans",
    description:
      "Review Dynamic Capital VIP memberships, automation access, and TON payment rails.",
    categoryId: "products",
    icon: Star,
    tags: ["VIP", "Checkout", "TON"],
    tonSignals: ["ton://checkout", "staking tiers"],
    owner: "Growth & Monetisation",
    surfaces: ["Plans", "Pricing"],
    hint: {
      title: "Choose a VIP route",
      description:
        "Unlock automation, funding desks, and concierge access when you are ready to scale.",
    },
    workspace: {
      eyebrow: "Membership",
      title: "Dynamic Capital VIP programmes",
      description:
        "Compare trader, fund, and partner tracks with unified checkout powered by TON smart contracts.",
      tags: [
        { label: "Recurring", tone: "neutral" },
        { label: "TON checkout", tone: "brand" },
      ],
      actions: [
        {
          label: "Investor desk",
          href: "/tools/dynamic-portfolio",
          icon: PieChart,
          emphasis: "secondary",
        },
      ],
    },
    nav: {
      group: "primary",
      order: 5,
      showOnMobile: true,
      ariaLabel:
        "VIP plans. Review Dynamic Capital VIP memberships, automation access, and TON payment rails.",
    },
    footer: [
      { group: "quick", order: 1 },
    ],
  },
  {
    id: "dynamic-portfolio",
    path: "/tools/dynamic-portfolio",
    label: "Investor desk",
    description:
      "Operate Dynamic Portfolio allocations, funding flows, and guardrails with TON insights baked in.",
    categoryId: "products",
    icon: PieChart,
    tags: ["Desk", "Automation", "TON"],
    tonSignals: ["Treasury sync", "credit orchestration"],
    owner: "Investor Products",
    surfaces: ["Investor desk"],
    hint: {
      title: "Manage the investor desk",
      description:
        "Sync portfolios, automate withdrawals, and steer allocations across Dynamic Capital strategies.",
    },
    workspace: {
      eyebrow: "Investor desk",
      title: "Copy trading & mentorship workspace",
      description:
        "Choose automation or guided learning, keep risk guardrails visible, and withdraw on your own schedule.",
      tags: [
        { label: "Automation guardrails", tone: "neutral" },
        { label: "Mentor support", tone: "accent" },
      ],
      actions: [
        {
          label: "Start in checkout",
          href: "/checkout",
          icon: LogIn,
          emphasis: "primary",
        },
        {
          label: "View pricing",
          href: "/plans",
          icon: Star,
          emphasis: "ghost",
        },
      ],
    },
    nav: {
      group: "primary",
      order: 3,
      showOnMobile: true,
      ariaLabel:
        "Investor desk. Operate Dynamic Portfolio allocations, funding flows, and guardrails with TON insights.",
    },
    commandBar: {
      group: "dynamic-services",
      order: 4,
      emphasis: "accent",
      icon: PieChart,
      ctaLabel: "Investor desk",
    },
    footer: [
      { group: "workspace", order: 3 },
      { group: "quick", order: 4 },
    ],
  },
  {
    id: "dynamic-market-review",
    path: "/tools/dynamic-market-review",
    label: "Market review",
    description:
      "Scan FX, equities, crypto, and commodity dashboards with TON-aligned risk context.",
    categoryId: "insights",
    icon: LineChart,
    tags: ["Markets", "Signals", "TON"],
    tonSignals: ["Desk outlook", "strength meters"],
    owner: "Research",
    surfaces: ["Market review"],
    hint: {
      title: "Track the market desk",
      description:
        "See currency strength, volatility posture, and cross-asset telemetry before placing the next trade.",
    },
    workspace: {
      eyebrow: "Market intelligence",
      title: "Dynamic market review",
      description:
        "FX, equities, crypto, and commodities dashboards refresh with TON-aligned liquidity cues.",
      tags: [
        { label: "Signal feed", tone: "neutral" },
        { label: "FX focus", tone: "accent" },
      ],
      actions: [
        {
          label: "Open trade journal",
          href: "/tools/trade-journal",
          icon: NotebookPen,
          emphasis: "secondary",
        },
      ],
    },
    nav: {
      group: "primary",
      order: 2,
      showOnMobile: true,
      ariaLabel:
        "Market review. Scan FX, equities, crypto, and commodity dashboards with TON-aligned risk context.",
    },
    commandBar: {
      group: "dynamic-services",
      order: 2,
      emphasis: "accent",
      icon: LineChart,
      ctaLabel: "Market review",
    },
    footer: [
      { group: "workspace", order: 2 },
    ],
  },
  {
    id: "dynamic-trade-and-learn",
    path: "/tools/dynamic-trade-and-learn",
    label: "Trade & learn",
    description:
      "Blend live trade telemetry, mentorship cadences, and automation labs into one workspace.",
    categoryId: "community",
    icon: GraduationCap,
    tags: ["Mentorship", "Signals", "Automation"],
    tonSignals: ["Mentor escalations", "journal sync"],
    owner: "Learning & Community",
    surfaces: ["Trade & learn"],
    hint: {
      title: "Join trade & learn tracks",
      description:
        "Pair desk signals with mentorship cadences, automation labs, and readiness scoring.",
    },
    workspace: {
      eyebrow: "Learning",
      title: "Trade & learn workspace",
      description:
        "Mentorship cadences, practice labs, and automation scaffolding keep every trader aligned with the desk.",
      tags: [
        { label: "Mentor access", tone: "accent" },
        { label: "Practice labs", tone: "neutral" },
      ],
      actions: [
        {
          label: "Launch academy",
          href: "/school",
          icon: BookOpen,
          emphasis: "secondary",
        },
      ],
    },
    nav: {
      group: "primary",
      order: 4,
      showOnMobile: true,
      ariaLabel:
        "Trade & learn. Blend live trade telemetry, mentorship cadences, and automation labs into one workspace.",
    },
    commandBar: {
      group: "dynamic-services",
      order: 3,
      emphasis: "neutral",
      icon: GraduationCap,
      ctaLabel: "Trade & learn",
    },
    footer: [
      { group: "workspace", order: 4 },
    ],
  },
  {
    id: "dynamic-token",
    path: "/token",
    label: "Dynamic token",
    description:
      "Review Dynamic Capital tokenomics, staking mechanics, and governance utilities on TON.",
    categoryId: "foundations",
    icon: Boxes,
    tags: ["Token", "TON", "Governance"],
    tonSignals: ["Staking tiers", "governance"],
    owner: "Token Council",
    surfaces: ["Token"],
    hint: {
      title: "Understand the Dynamic token",
      description:
        "Explore utility, governance mechanics, and TON-native staking flows backing the Dynamic ecosystem.",
    },
    workspace: {
      eyebrow: "Token",
      title: "Dynamic Capital token",
      description:
        "Utility breakdowns, staking flows, and governance checkpoints align with TON community guardrails.",
      tags: [
        { label: "Governance", tone: "neutral" },
        { label: "Rewards", tone: "accent" },
      ],
      actions: [
        {
          label: "Open TON wallet",
          href: "/wallet",
          icon: Wallet2,
          emphasis: "secondary",
        },
      ],
    },
    nav: {
      group: "primary",
      order: 6,
      showOnMobile: true,
      ariaLabel:
        "Dynamic token. Review tokenomics, staking mechanics, and governance utilities on TON.",
    },
    commandBar: {
      group: "dynamic-services",
      order: 6,
      emphasis: "brand",
      icon: Boxes,
      ctaLabel: "Token tools",
    },
    footer: [
      { group: "quick", order: 2 },
    ],
  },
  {
    id: "support",
    path: "/support",
    label: "Support",
    description:
      "Contact concierge support, escalate automation issues, or join the TON operations desk.",
    categoryId: "operations",
    icon: ShieldCheck,
    tags: ["Support", "Operations"],
    tonSignals: ["Telegram", "Escalations"],
    owner: "Operations",
    surfaces: ["Support"],
    hint: {
      title: "Need assistance?",
      description:
        "Reach concierge support and operations teams directly from the TON desk.",
    },
    workspace: {
      eyebrow: "Support",
      title: "Concierge support",
      description:
        "Telegram escalations, desk resources, and TON wallet triage unify under one operations lane.",
      tags: [
        { label: "24/5", tone: "neutral" },
        { label: "Telegram", tone: "brand" },
      ],
      actions: [
        {
          label: "Message on Telegram",
          href: "https://t.me/DynamicCapitalBot",
          icon: Bot,
          emphasis: "secondary",
        },
      ],
    },
    nav: {
      group: "support",
      order: 1,
      showOnMobile: true,
      ariaLabel:
        "Support desk. Contact concierge support, escalate automation issues, or join TON operations.",
    },
    footer: [
      { group: "quick", order: 3 },
    ],
  },
  {
    id: "about",
    path: "/about",
    label: "About",
    description:
      "Deep-dive into Dynamic Capital's story, portfolio, and automation blueprint.",
    categoryId: "community",
    icon: Compass,
    tags: ["Story", "Portfolio"],
    tonSignals: ["Playbooks", "Culture"],
    owner: "Leadership",
    surfaces: ["About"],
    hint: {
      title: "Explore our blueprint",
      description:
        "Dynamic Capital blends automation, TON infrastructure, and human-led guardrails for long-term edge.",
    },
  },
  {
    id: "checkout",
    path: "/checkout",
    label: "Checkout",
    description:
      "Secure TON-native checkout for VIP memberships and automation credits.",
    categoryId: "operations",
    icon: Receipt,
    tags: ["Checkout", "TON"],
    tonSignals: ["ton://checkout"],
    owner: "Growth",
    surfaces: ["Checkout"],
    hint: {
      title: "Confirm your plan",
      description:
        "Complete TON-native checkout flows with on-ledger receipts.",
    },
  },
  {
    id: "telegram",
    path: "/telegram",
    label: "Telegram bot",
    description:
      "Administer the Dynamic Capital Telegram bot and TON onboarding flows.",
    categoryId: "operations",
    icon: Bot,
    tags: ["Telegram", "Admin"],
    tonSignals: ["Mini app", "TON Connect"],
    owner: "Automation",
    surfaces: ["Telegram bot"],
    hint: {
      title: "Manage the Telegram bot",
      description:
        "Operate the Dynamic Capital bot, mini apps, and onboarding scripts.",
    },
  },
  {
    id: "investor",
    path: "/investor",
    label: "Investor overview",
    description:
      "Investor program overview with Supabase metrics and TON readiness states.",
    categoryId: "products",
    icon: Trophy,
    tags: ["Investors", "Metrics"],
    tonSignals: ["Treasury", "Readiness"],
    owner: "Investor Products",
    surfaces: ["Investor"],
    hint: {
      title: "Monitor investor metrics",
      description:
        "Supabase-backed dashboards track VIP performance, readiness, and TON treasury health.",
    },
  },
  {
    id: "tokenomics",
    path: "/token",
    label: "Token",
    description:
      "Tokenomics, distribution, and roadmap for the Dynamic Capital token.",
    categoryId: "foundations",
    icon: Boxes,
    tags: ["Token", "Governance"],
    tonSignals: ["Staking", "Governance"],
    owner: "Token Council",
    surfaces: ["Token"],
    hint: {
      title: "Review tokenomics",
      description:
        "Understand supply schedules, staking mechanics, and governance levers.",
    },
  },
  {
    id: "school",
    path: "/school",
    label: "Academy",
    description:
      "Client-side School of Pipsology curriculum with Dynamic guidance.",
    categoryId: "community",
    icon: GraduationCap,
    tags: ["Education", "Curriculum"],
    tonSignals: ["Learning tracks"],
    owner: "Learning",
    surfaces: ["Academy"],
    hint: {
      title: "Study the playbook",
      description:
        "Self-paced lessons align with Dynamic Capital's guardrails before joining the live desk.",
    },
  },
  {
    id: "gallery",
    path: "/gallery",
    label: "Gallery",
    description: "Portfolio gallery showcasing Dynamic Capital work.",
    categoryId: "community",
    icon: Layers,
    tags: ["Showcase", "Design"],
    tonSignals: ["Case studies"],
    owner: "Design",
    surfaces: ["Gallery"],
    hint: {
      title: "Explore our gallery",
      description:
        "See Dynamic Capital craftsmanship across brand, product, and automation.",
    },
  },
  {
    id: "wallet",
    path: "/wallet",
    label: "Wallet onboarding",
    description: "TonConnect onboarding narrative with automation guidance.",
    categoryId: "foundations",
    icon: Wallet2,
    tags: ["Wallet", "Security"],
    tonSignals: ["TonConnect", "Security"],
    owner: "Operations",
    surfaces: ["Wallet"],
    hint: {
      title: "Set up your TON wallet",
      description:
        "Secure TonConnect handshakes, automation permissions, and recovery guardrails before trading.",
    },
  },
  {
    id: "payment-status",
    path: "/payment-status",
    label: "Payment status",
    description: "Track TON payment confirmations and receipts.",
    categoryId: "operations",
    icon: Receipt,
    tags: ["Payments", "TON"],
    tonSignals: ["Receipts", "Status"],
    owner: "Finance",
    surfaces: ["Payments"],
    hint: {
      title: "Check payment status",
      description:
        "Verify TON payments, receipts, and ledger confirmations in one place.",
    },
  },
  {
    id: "dynamic-visual",
    path: "/tools/dynamic-visual",
    label: "Dynamic visual",
    description:
      "Animate routing, guardrails, and liquidity relays across Dynamic infrastructure.",
    categoryId: "products",
    icon: Network,
    tags: ["Routing", "Visualization"],
    tonSignals: ["Automation graph"],
    owner: "Intelligence Platform",
    surfaces: ["Dynamic visual"],
    hint: {
      title: "Map the automation graph",
      description:
        "See how signals, TON settlements, and AGI copilots route through Dynamic infrastructure.",
    },
    workspace: {
      eyebrow: "Intelligence",
      title: "Dynamic visual explorer",
      description:
        "Trace liquidity relays, guardrails, and orchestration pathways in an animated systems view.",
      tags: [
        { label: "Automation", tone: "neutral" },
        { label: "Visualization", tone: "accent" },
      ],
      actions: [
        {
          label: "Open Dynamic CLI",
          href: "/tools/dynamic-cli",
          icon: Command,
          emphasis: "secondary",
        },
      ],
    },
    nav: {
      group: "secondary",
      order: 1,
      showOnMobile: true,
      ariaLabel:
        "Dynamic visual. Animate routing, guardrails, and liquidity relays across Dynamic infrastructure.",
    },
  },
  {
    id: "dynamic-cli",
    path: "/tools/dynamic-cli",
    label: "Dynamic CLI/CD",
    description:
      "Admin-only CLI/CD workbench for telemetry exports and AGI datasets.",
    categoryId: "operations",
    icon: Command,
    tags: ["CLI", "Admin", "Automation"],
    tonSignals: ["Admin"],
    owner: "Automation",
    surfaces: ["CLI/CD"],
    hint: {
      title: "Operate the CLI",
      description:
        "Generate telemetry exports, agent datasets, and automation bundles.",
    },
    workspace: {
      eyebrow: "Admin",
      title: "Dynamic CLI/CD workbench",
      description:
        "Execute guardrailed commands, export telemetry, and assemble AGI datasets through TON-authenticated sessions.",
      tags: [
        { label: "Admin", tone: "warning" },
        { label: "Automation", tone: "neutral" },
      ],
      actions: [
        {
          label: "View admin docs",
          href: "/admin",
          icon: ShieldCheck,
          emphasis: "secondary",
        },
      ],
    },
    nav: {
      group: "admin",
      order: 2,
      showOnMobile: false,
      ariaLabel:
        "Dynamic CLI/CD. Admin-only workbench for telemetry exports and AGI datasets.",
    },
    commandBar: {
      group: "dynamic-services",
      order: 7,
      emphasis: "neutral",
      icon: Command,
      ctaLabel: "Dynamic CLI",
    },
  },
  {
    id: "heatmap",
    path: "/tools/heatmap",
    label: "Market heatmap",
    description: "Visualize cross-asset momentum and TON-aligned exposure.",
    categoryId: "insights",
    icon: Radar,
    tags: ["Heatmap", "Markets"],
    tonSignals: ["Exposure", "Momentum"],
    owner: "Research",
    surfaces: ["Heatmap"],
    hint: {
      title: "Scan the heatmap",
      description:
        "View cross-asset heatmaps that merge on-chain telemetry with desk conviction.",
    },
    workspace: {
      eyebrow: "Market intelligence",
      title: "Dynamic heatmap",
      description:
        "Momentum overlays, TON posture, and sector rotations converge in one visual dashboard.",
      tags: [
        { label: "Signals", tone: "accent" },
        { label: "Exposure", tone: "neutral" },
      ],
    },
    nav: {
      group: "secondary",
      order: 2,
      showOnMobile: true,
      ariaLabel:
        "Market heatmap. Visualize cross-asset momentum and TON-aligned exposure.",
    },
  },
  {
    id: "dynamic-ui-optimizer",
    path: "/tools/dynamic-ui-optimizer",
    label: "GUI optimizer",
    description:
      "Optimize activation workflows and UI instrumentation for Dynamic apps.",
    categoryId: "operations",
    icon: Gauge,
    tags: ["UX", "Instrumentation"],
    tonSignals: ["Benchmarks", "Analytics"],
    owner: "Platform Experience",
    surfaces: ["UI optimizer"],
    hint: {
      title: "Tune the Dynamic UI",
      description:
        "Optimize readiness workflows and instrumentation with shared motion tokens.",
    },
    workspace: {
      eyebrow: "Experience ops",
      title: "Dynamic GUI optimizer",
      description:
        "Benchmark activation workflows, motion tokens, and telemetry to keep every surface fast and consistent.",
      tags: [
        { label: "Instrumentation", tone: "neutral" },
        { label: "Motion", tone: "accent" },
      ],
    },
    nav: {
      group: "secondary",
      order: 3,
      showOnMobile: true,
      ariaLabel:
        "GUI optimizer. Optimize activation workflows and UI instrumentation for Dynamic apps.",
    },
  },
  {
    id: "multi-llm",
    path: "/tools/multi-llm",
    label: "LLM studio",
    description:
      "Admin-only studio for benchmarking Dynamic AI, AGI, and third-party providers.",
    categoryId: "operations",
    icon: Cpu,
    tags: ["LLM", "Admin"],
    tonSignals: ["Provider routing"],
    owner: "Intelligence Platform",
    surfaces: ["LLM studio"],
    hint: {
      title: "Benchmark providers",
      description:
        "Route prompts across Dynamic AI, AGI, AGS, and third-party providers to validate orchestration.",
    },
    workspace: {
      eyebrow: "Admin",
      title: "Dynamic LLM studio",
      description:
        "Compare providers, analyse latency, and export transcripts with TON-authenticated admin sessions.",
      tags: [
        { label: "Admin", tone: "warning" },
        { label: "Benchmark", tone: "neutral" },
      ],
    },
    nav: {
      group: "admin",
      order: 1,
      showOnMobile: false,
      ariaLabel:
        "LLM studio. Admin-only studio for benchmarking Dynamic AI, AGI, and third-party providers.",
    },
  },
  {
    id: "trade-journal",
    path: "/tools/trade-journal",
    label: "Trade journal",
    description:
      "Capture trades, automation hooks, and mentor feedback with TON-linked receipts.",
    categoryId: "products",
    icon: NotebookPen,
    tags: ["Journal", "Automation"],
    tonSignals: ["Mentorship", "TON receipts"],
    owner: "Learning",
    surfaces: ["Trade journal"],
    hint: {
      title: "Log every trade",
      description:
        "Capture fills, automation hooks, and mentor commentary while syncing to TON analytics.",
    },
    workspace: {
      eyebrow: "Practice",
      title: "Dynamic trade journal",
      description:
        "Record fills, annotate lessons, and sync guardrails directly into the mentorship cadence.",
      tags: [
        { label: "Readiness", tone: "neutral" },
        { label: "Automation", tone: "accent" },
      ],
      actions: [
        {
          label: "Open signals",
          href: "/tools/dynamic-market-review",
          icon: LineChart,
          emphasis: "secondary",
        },
      ],
    },
    commandBar: {
      group: "dynamic-services",
      order: 5,
      emphasis: "accent",
      icon: NotebookPen,
      ctaLabel: "Trade journal",
    },
  },
  {
    id: "styles",
    path: "/styles",
    label: "Styles",
    description: "Dynamic Capital style catalog for marketing and product UI.",
    categoryId: "foundations",
    icon: Layers,
    tags: ["Design", "Tokens"],
    tonSignals: ["Design tokens"],
    owner: "Design",
    surfaces: ["Styles"],
    hint: {
      title: "Browse style inventory",
      description:
        "Reference components, tokens, and animations across the Dynamic UI system.",
    },
  },
  {
    id: "profile",
    path: "/profile",
    label: "Profile",
    description: "Manage Dynamic Capital profile settings and credentials.",
    categoryId: "operations",
    icon: Users,
    tags: ["Profile", "Settings"],
    tonSignals: ["Account"],
    owner: "Platform Experience",
    surfaces: ["Profile"],
    hint: {
      title: "Manage your profile",
      description: "Update identity, credentials, and TON wallet connections.",
    },
  },
  {
    id: "work",
    path: "/work",
    label: "Work",
    description: "Portfolio projects index for Dynamic Capital.",
    categoryId: "community",
    icon: Layers,
    tags: ["Portfolio", "Cases"],
    tonSignals: ["Case studies"],
    owner: "Design",
    surfaces: ["Work"],
    hint: {
      title: "Review client work",
      description:
        "Explore flagship deliverables across automation and design.",
    },
    matchers: [/^\/work\//],
  },
  {
    id: "work-detail",
    path: "/work/[slug]",
    label: "Project detail",
    description: "Detailed view for a Dynamic Capital project.",
    categoryId: "community",
    icon: Layers,
    tags: ["Portfolio", "Detail"],
    tonSignals: ["Case study"],
    owner: "Design",
    surfaces: ["Work detail"],
    hint: {
      title: "Project deep dive",
      description: "See briefs, outcomes, and TON integrations per project.",
    },
    matchers: [/^\/work\/(?!$).+/],
  },
  {
    id: "blog",
    path: "/blog",
    label: "Blog",
    description: "Dynamic Capital blog index.",
    categoryId: "community",
    icon: NotebookPen,
    tags: ["Content", "Updates"],
    tonSignals: ["Playbooks"],
    owner: "Content",
    surfaces: ["Blog"],
    hint: {
      title: "Read the latest",
      description:
        "Insights, playbooks, and trading retrospectives from Dynamic Capital.",
    },
  },
  {
    id: "blog-post",
    path: "/blog/[slug]",
    label: "Blog post",
    description: "Dynamic Capital blog entry.",
    categoryId: "community",
    icon: NotebookPen,
    tags: ["Content", "Updates"],
    tonSignals: ["Playbooks"],
    owner: "Content",
    surfaces: ["Blog"],
    hint: {
      title: "Dive into the article",
      description: "Stories and analysis from the Dynamic Capital desk.",
    },
    matchers: [/^\/blog\/(?!$).+/],
  },
  {
    id: "login",
    path: "/login",
    label: "Log in",
    description: "Authenticate to access private Dynamic Capital surfaces.",
    categoryId: "operations",
    icon: LogIn,
    tags: ["Auth", "Secure"],
    tonSignals: ["Authentication"],
    owner: "Platform Experience",
    surfaces: ["Login"],
    hint: {
      title: "Sign into the desk",
      description: "Unlock investor tools, signals, and admin experiences.",
    },
  },
  {
    id: "profile-settings",
    path: "/profile",
    label: "Settings",
    description: "Profile and notification settings.",
    categoryId: "operations",
    icon: Users,
    tags: ["Profile", "Settings"],
    tonSignals: ["Account"],
    owner: "Platform Experience",
    surfaces: ["Profile"],
    hint: {
      title: "Control your settings",
      description: "Manage identity and wallet hooks.",
    },
  },
  {
    id: "admin",
    path: "/admin",
    label: "Admin",
    description: "Admin dashboard for VIP, payments, and bot controls.",
    categoryId: "operations",
    icon: ShieldCheck,
    tags: ["Admin", "Operations"],
    tonSignals: ["Admin"],
    owner: "Operations",
    surfaces: ["Admin"],
    hint: {
      title: "Admin control room",
      description: "Review VIP seats, payments, and bot telemetry.",
    },
    nav: {
      group: "admin",
      order: 3,
      showOnMobile: false,
      ariaLabel:
        "Admin control room. Review VIP seats, payments, and bot telemetry.",
    },
  },
  {
    id: "telegram-dashboard",
    path: "/telegram",
    label: "Telegram dashboard",
    description: "Force-dynamic Telegram bot dashboard wrapper.",
    categoryId: "operations",
    icon: Bot,
    tags: ["Telegram", "Dashboard"],
    tonSignals: ["Mini app"],
    owner: "Automation",
    surfaces: ["Telegram"],
    hint: {
      title: "Review Telegram analytics",
      description: "Monitor bot health and TON onboarding flows.",
    },
  },
  {
    id: "wallet-dashboard",
    path: "/wallet",
    label: "Wallet dashboard",
    description:
      "Wallet onboarding narrative covering TonConnect and security.",
    categoryId: "foundations",
    icon: Wallet2,
    tags: ["Wallet", "Security"],
    tonSignals: ["TonConnect"],
    owner: "Operations",
    surfaces: ["Wallet"],
    hint: {
      title: "Secure your wallet",
      description:
        "Complete TonConnect onboarding with security best practices.",
    },
  },
  {
    id: "dynamic-nft",
    path: "/tools/dynamic-portfolio",
    label: "Dynamic NFTs",
    description: "NFT trading rails within the investor desk.",
    categoryId: "products",
    icon: ActivitySquare,
    tags: ["NFT", "Trading"],
    tonSignals: ["NFT settlement"],
    owner: "Investor Products",
    surfaces: ["NFT"],
    hint: {
      title: "Trade Dynamic NFTs",
      description: "Leverage NFT-backed strategies alongside token flows.",
    },
  },
  {
    id: "dynamic-algorithms",
    path: "/tools/dynamic-portfolio",
    label: "Dynamic algorithms",
    description:
      "Dynamic trading logic and algorithm controls surfaced in the investor desk.",
    categoryId: "products",
    icon: ChartCandlestick,
    tags: ["Algorithms", "Automation"],
    tonSignals: ["Strategy automation"],
    owner: "Intelligence Platform",
    surfaces: ["Algorithms"],
    hint: {
      title: "Deploy dynamic algorithms",
      description:
        "Tune parameters, simulate strategies, and launch TON-native automation.",
    },
  },
  {
    id: "dynamic-ags",
    path: "/tools/multi-llm",
    label: "Dynamic AGS",
    description: "Specialist agent suite accessible through LLM studio flows.",
    categoryId: "operations",
    icon: Bot,
    tags: ["Agents", "Automation"],
    tonSignals: ["Agent ops"],
    owner: "Intelligence Platform",
    surfaces: ["Agents"],
    hint: {
      title: "Call specialist agents",
      description:
        "Use AGS copilots to extend research, compliance, and trading playbooks.",
    },
  },
] as const satisfies readonly RouteDefinition[];

export type RouteId = (typeof ROUTE_DEFINITIONS)[number]["id"];

const ROUTE_DEFINITION_LIST = ROUTE_DEFINITIONS as readonly RouteDefinition[];

const ROUTE_DEFINITION_BY_ID = new Map<RouteId, RouteDefinition>();
const ROUTE_DEFINITION_BY_PATH = new Map<string, RouteDefinition>();
const ROUTE_MATCHER_INDEX: Array<{
  matcher: RegExp;
  definition: RouteDefinition;
}> = [];

for (const definition of ROUTE_DEFINITION_LIST) {
  const routeId = definition.id as RouteId;
  ROUTE_DEFINITION_BY_ID.set(routeId, definition);
  ROUTE_DEFINITION_BY_PATH.set(definition.path, definition);
  for (const matcher of definition.matchers ?? []) {
    ROUTE_MATCHER_INDEX.push({
      matcher: new RegExp(matcher),
      definition,
    });
  }
}

const brandingPalette = dynamicBranding.palette;
const heroGradientBase = dynamicBranding.gradients.hero;

const createHeroGradient = (primary: string, secondary: string) =>
  [
    `radial-gradient(120% 120% at 0% 0%, hsl(${primary} / 0.38) 0%, transparent 58%)`,
    `radial-gradient(140% 140% at 85% 0%, hsl(${secondary} / 0.28) 0%, transparent 62%)`,
    heroGradientBase,
  ].join(", ");

const createHeroShadow = (primary: string) =>
  `0 40px 140px hsl(${primary} / 0.28)`;

const chartPalette = brandingPalette.light.charts;

export const ROUTE_CATEGORY_STYLES: Record<
  RouteCategoryId,
  {
    label: string;
    badgeClass: string;
    indicatorClass: string;
    heroGradient: string;
    heroShadow: string;
  }
> = {
  foundations: {
    label: "Foundations",
    badgeClass: "border-transparent bg-emerald-500/15 text-emerald-200",
    indicatorClass: "bg-emerald-400/80",
    heroGradient: createHeroGradient(
      brandingPalette.brand.base,
      brandingPalette.brand.dark,
    ),
    heroShadow: createHeroShadow(brandingPalette.brand.base),
  },
  products: {
    label: "Products",
    badgeClass: "border-transparent bg-sky-500/15 text-sky-200",
    indicatorClass: "bg-sky-400/80",
    heroGradient: createHeroGradient(
      brandingPalette.brand.secondary,
      chartPalette[1] ?? brandingPalette.brand.accent,
    ),
    heroShadow: createHeroShadow(brandingPalette.brand.secondary),
  },
  insights: {
    label: "Insights",
    badgeClass: "border-transparent bg-amber-500/15 text-amber-200",
    indicatorClass: "bg-amber-400/80",
    heroGradient: createHeroGradient(
      chartPalette[2] ?? brandingPalette.brand.light,
      chartPalette[0] ?? brandingPalette.brand.accent,
    ),
    heroShadow: createHeroShadow(
      chartPalette[2] ?? brandingPalette.brand.light,
    ),
  },
  operations: {
    label: "Operations",
    badgeClass: "border-transparent bg-violet-500/15 text-violet-200",
    indicatorClass: "bg-violet-400/80",
    heroGradient: createHeroGradient(
      chartPalette[3] ?? brandingPalette.brand.dark,
      brandingPalette.brand.secondary,
    ),
    heroShadow: createHeroShadow(chartPalette[3] ?? brandingPalette.brand.dark),
  },
  community: {
    label: "Community",
    badgeClass: "border-transparent bg-rose-500/15 text-rose-200",
    indicatorClass: "bg-rose-400/80",
    heroGradient: createHeroGradient(
      chartPalette[4] ?? brandingPalette.brand.accent,
      brandingPalette.brand.accent,
    ),
    heroShadow: createHeroShadow(
      chartPalette[4] ?? brandingPalette.brand.accent,
    ),
  },
};

export interface NavigationEntry {
  id: RouteId;
  step: string;
  label: string;
  description: string;
  icon?: LucideIcon;
  path: string;
  href?: string;
  ariaLabel: string;
  showOnMobile?: boolean;
  navGroup: "primary" | "secondary" | "support" | "admin";
  order: number;
  categoryId: RouteCategoryId;
  tags: string[];
  hint: RouteHint;
}

const PRIMARY_NAV_SEQUENCE: RouteId[] = [
  "dynamic-chat-hub",
  "dynamic-market-review",
  "dynamic-portfolio",
  "dynamic-trade-and-learn",
  "vip-plans",
  "dynamic-token",
];

function resolveStep(index: number): string {
  return `Hint ${index + 1}`;
}

function buildNavigationEntries(): NavigationEntry[] {
  const explicitPrimary: NavigationEntry[] = [];

  PRIMARY_NAV_SEQUENCE.forEach((routeId, index) => {
    const definition = ROUTE_DEFINITION_BY_ID.get(routeId);
    if (!definition?.nav) {
      return;
    }

    explicitPrimary.push({
      id: routeId,
      step: resolveStep(index),
      label: definition.shortLabel ?? definition.label,
      description: definition.description,
      icon: definition.icon,
      path: definition.path,
      ariaLabel: definition.nav.ariaLabel ??
        `${definition.label}. ${definition.description}`,
      showOnMobile: definition.nav.showOnMobile,
      navGroup: definition.nav.group,
      order: definition.nav.order,
      categoryId: definition.categoryId,
      tags: definition.tags,
      hint: definition.hint,
    });
  });

  const primaryIds = new Set(PRIMARY_NAV_SEQUENCE);

  const navEnabled = ROUTE_DEFINITION_LIST.filter((
    definition,
  ): definition is RouteDefinition & {
    nav: NonNullable<RouteDefinition["nav"]>;
  } => Boolean(definition.nav));

  const remaining = navEnabled
    .filter((definition) => !primaryIds.has(definition.id as RouteId))
    .map((definition) => {
      const nav = definition.nav;
      return {
        id: definition.id as RouteId,
        step: `Hint ${explicitPrimary.length + nav.order}`,
        label: definition.shortLabel ?? definition.label,
        description: definition.description,
        icon: definition.icon,
        path: definition.path,
        ariaLabel: nav.ariaLabel ??
          `${definition.label}. ${definition.description}`,
        showOnMobile: nav.showOnMobile,
        navGroup: nav.group,
        order: nav.order,
        categoryId: definition.categoryId,
        tags: definition.tags,
        hint: definition.hint,
      } satisfies NavigationEntry;
    });

  const groupRank: Record<NavigationEntry["navGroup"], number> = {
    primary: 0,
    secondary: 1,
    support: 2,
    admin: 3,
  };

  return [...explicitPrimary, ...remaining].sort((a, b) => {
    const groupDifference = groupRank[a.navGroup] - groupRank[b.navGroup];
    if (groupDifference !== 0) {
      return groupDifference;
    }
    return a.order - b.order;
  });
}

const NAVIGATION_ENTRIES = buildNavigationEntries();

export function getRouteDefinitions(): readonly RouteDefinition[] {
  return ROUTE_DEFINITION_LIST;
}

export function getRouteById(id: RouteId): RouteDefinition | undefined {
  return ROUTE_DEFINITION_BY_ID.get(id);
}

export function findRouteByPath(pathname: string): RouteDefinition | undefined {
  const normalized = pathname === "" ? "/" : pathname;
  const directMatch = ROUTE_DEFINITION_BY_PATH.get(normalized);
  if (directMatch) {
    return directMatch;
  }

  for (const { matcher, definition } of ROUTE_MATCHER_INDEX) {
    matcher.lastIndex = 0;
    if (matcher.test(normalized)) {
      return definition;
    }
  }

  return undefined;
}

export function getNavigationEntries(): NavigationEntry[] {
  return NAVIGATION_ENTRIES;
}

export interface CommandBarItem {
  id: RouteId;
  label: string;
  description: string;
  href: string;
  icon?: LucideIcon;
  emphasis: "brand" | "accent" | "neutral";
  tags: string[];
  hint: RouteHint;
}

export interface FooterLinkEntry {
  id: RouteId;
  label: string;
  description: string;
  href: string;
  group: FooterGroup;
  order: number;
  categoryId: RouteCategoryId;
  tags: string[];
}

export function getCommandBarItems(
  group: CommandBarMeta["group"],
): CommandBarItem[] {
  const definitions = ROUTE_DEFINITION_LIST;

  const matching = definitions.filter((
    definition,
  ): definition is RouteDefinition & {
    commandBar: NonNullable<RouteDefinition["commandBar"]>;
  } => definition.commandBar?.group === group);

  return matching
    .sort((a, b) => (a.commandBar.order - b.commandBar.order))
    .map((definition) => ({
      id: definition.id as RouteId,
      label: definition.shortLabel ?? definition.label,
      description: definition.description,
      href: definition.path,
      icon: definition.commandBar.icon ?? definition.icon,
      emphasis: definition.commandBar.emphasis ?? "neutral",
      tags: definition.tags,
      hint: definition.hint,
    }));
}

export function getFooterLinks(group: FooterGroup): FooterLinkEntry[] {
  const definitions = ROUTE_DEFINITION_LIST;

  const matching = definitions.filter((
    definition,
  ): definition is RouteDefinition & {
    footer: NonNullable<RouteDefinition["footer"]>;
  } => Boolean(definition.footer?.length));

  return matching
    .flatMap((definition) =>
      definition.footer
        ?.filter((placement) => placement.group === group)
        .map((placement) => ({
          id: definition.id as RouteId,
          label: definition.shortLabel ?? definition.label,
          description: definition.description,
          href: definition.path,
          group: placement.group,
          order: placement.order,
          categoryId: definition.categoryId,
          tags: definition.tags,
        })) ?? []
    )
    .sort((a, b) => a.order - b.order);
}

export function getWorkspaceMeta(routeId: RouteId): WorkspaceMeta | undefined {
  return getRouteById(routeId)?.workspace;
}

export function getRouteHint(pathname: string): RouteHint | undefined {
  return findRouteByPath(pathname)?.hint;
}
