import { useCallback, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  BookOpen,
  Bot,
  ClipboardList,
  Copy,
  ExternalLink,
  Layers,
  LineChart,
  type LucideIcon,
  Network,
  RefreshCcw,
  Repeat,
  Shield,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import TopBar from "../components/TopBar";
import Toast from "../components/Toast";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import QrCode from "../components/QrCode";
import { cn } from "../lib/utils";
import {
  DCT_ACTION_PAD,
  type DctActionDefinition,
  type DctActionKey,
} from "../../../../../shared/ton/dct-action-pad";
import { DCT_DEX_POOLS } from "../../../../../shared/ton/dct-liquidity";

const HERO_HIGHLIGHTS = [
  {
    icon: Sparkles,
    title: "DCT is the primary treasury currency",
    description:
      "Deposits, withdrawals, and on-chain burns stay auditable for every investor.",
  },
  {
    icon: Layers,
    title: "LayerZero mirrored",
    description:
      "VIP automations keep DCT balances synced across the omnichain routing fabric.",
  },
  {
    icon: Shield,
    title: "Supabase-verified handshakes",
    description:
      "Wallet linking runs through Telegram identity checks before any transaction clears.",
  },
] as const;

const SUPPORTED_WALLETS = [
  "Wallet (Telegram)",
  "Tonkeeper",
  "STON.fi Wallet",
  "DeDust Wallet",
  "Tonhub",
  "MyTonWallet",
  "Bitget Wallet",
] as const;

const ACTION_PAD = DCT_ACTION_PAD;

const ACTION_ICON_MAP: Record<DctActionKey, LucideIcon> = {
  onboard: Users,
  deposit: ArrowDownToLine,
  withdraw: ArrowUpFromLine,
  utilize: RefreshCcw,
};

const ONBOARDING_STEPS = [
  {
    title: "Launch TonConnect",
    description:
      "Authenticate inside Telegram using Wallet, Tonkeeper, DeDust, STON.fi, Tonhub, MyTonWallet, or Bitget Wallet.",
  },
  {
    title: "Verify with Supabase",
    description:
      "The link-wallet function validates Telegram identity, ensures unique addresses, and stores the public key.",
  },
  {
    title: "Unlock Dynamic Capital",
    description:
      "Staking, VIP plans, and automation triggers become available once the wallet is confirmed.",
  },
] as const;

const WITHDRAWAL_POINTS = [
  "Submit a withdrawal notice at least 7 days ahead so staked DCT can be rebalanced.",
  "Operations execute releases directly back to the linked TonConnect address.",
  "Telegram concierge can coordinate expedited withdrawals once compliance approves the ticket.",
] as const;

const AUTOMATION_EVENTS = [
  "Auto-invest subscriptions store expected wallet addresses before TON transfers are accepted.",
  "Process-subscription jobs compare incoming payments to the registered wallet before crediting staking units.",
  "Link-wallet flows reject duplicates so every investor keeps a single audited record in Supabase.",
  "Treasury monitors mirror intake and operations wallets to keep allocations accountable.",
] as const;

const HOW_IT_WORKS_PILLARS = [
  {
    title: "Treasury control loop",
    description:
      "DCT deposits flow into a programmatic treasury that hedges TON exposure, funds signal automation, and documents every rebalance.",
    highlights: [
      "Ledger reconciliations mirror TON explorer state each hour.",
      "Strategy rebalancing bot throttles withdrawals vs. open positions.",
      "Risk desk flags anomalies before investor settlements clear.",
    ],
    icon: Network,
  },
  {
    title: "Signal distribution",
    description:
      "VIP subscriptions unlock curated playbooks, DeFi rotations, and intraday alerts delivered directly inside Telegram.",
    highlights: [
      "Routing respects staking tier so premium research stays exclusive.",
      "Backtests and forward performance feeds are attached to every alert.",
      "Failed deliveries trigger auto-resend workflows with audit trails.",
    ],
    icon: Sparkles,
  },
  {
    title: "Automation safeguards",
    description:
      "Bot runners execute swaps, settlements, and compliance checks with circuit-breakers that pause flows if thresholds trip.",
    highlights: [
      "Withdrawal queues respect manual overrides from the operations desk.",
      "All automation scripts log to Supabase for investigator review.",
      "Incident playbooks escalate to human control with one tap in Telegram.",
    ],
    icon: Shield,
  },
] as const;

const INVESTOR_MILESTONES = [
  {
    title: "KYC & accreditation sync",
    description:
      "Leverage Telegram identity, submitted docs, and compliance attestations to unlock investor dashboards.",
  },
  {
    title: "Capital allocation briefing",
    description:
      "Review the treasury mix, active strategies, and projected cash flows before committing DCT.",
  },
  {
    title: "Automated reporting",
    description:
      "Monthly statements deliver NAV, strategy attribution, and risk notes straight to your Mini App inbox.",
  },
] as const;

const WHITEPAPER_RESOURCES = [
  {
    title: "Dynamic Capital TON Coin Whitepaper",
    description:
      "Comprehensive overview of DCT utility, issuance controls, and treasury automation architecture.",
    format: "PDF",
    url: "https://dynamiccapital.ai/whitepaper/dct",
  },
  {
    title: "Dynamic Capital Investor Handbook",
    description:
      "Step-by-step onboarding procedures, governance structure, and compliance playbooks for allocators.",
    format: "Guide",
    url: "https://dynamiccapital.ai/library/investor-handbook",
  },
  {
    title: "Risk & Security Disclosures",
    description:
      "Detailed review of smart contract audits, key management, and operational contingencies.",
    format: "Report",
    url: "https://dynamiccapital.ai/disclosures/security",
  },
] as const;

const MARKET_WATCHLISTS = [
  {
    title: "TON ecosystem majors",
    cadence: "24/7 streaming",
    coverage: "TON, DCT, NOT, SCALE, JETTON index",
    insights: [
      "Liquidity migration alerts when pools shift between STON.fi and DeDust.",
      "Volatility throttles feed risk management bots to resize positions.",
      "Smart money movements flagged from on-chain orderflow scanners.",
    ],
  },
  {
    title: "Cross-chain yield radar",
    cadence: "Hourly snapshots",
    coverage: "ETH L2s, Solana, BSC, Base",
    insights: [
      "Relative APY leaderboards to inform DCT collateral rotation.",
      "Stablecoin peg monitors highlight liquidity crunches early.",
      "Bridge congestion triggers to avoid trapped settlement capital.",
    ],
  },
  {
    title: "Macro & sentiment dashboard",
    cadence: "Daily briefs",
    coverage: "FX, rates, commodities, BTC/ETH regimes",
    insights: [
      "Combines AI-generated narratives with curated analyst commentary.",
      "Correlates TradFi volatility spikes with TON liquidity depth.",
      "Telegram bot summary pushes highlight actionable levels each session.",
    ],
  },
] as const;

const SECURITY_FEATURES = [
  {
    title: "Role-based policies",
    description:
      "Admin overrides and wallet updates require Supabase auth tokens tied to verified Telegram IDs.",
  },
  {
    title: "On-chain reconciliation",
    description:
      "Background jobs compare deposits with treasury movements before releasing auto-invest units or VIP credits.",
  },
  {
    title: "Session hygiene",
    description:
      "Stale handshakes rotate automatically so the desk always acts on fresh attestations.",
  },
] as const;

const DEX_OPTIONS = DCT_DEX_POOLS.map((pool) => ({
  name: pool.dex,
  description: pool.description,
  swapUrl: pool.swapUrl,
  explorerUrl: pool.poolExplorerUrl,
  jettonWalletUrl: pool.jettonWalletExplorerUrl,
})) as const;

type SectionId =
  | "overview"
  | "actions"
  | "security"
  | "automation"
  | "how-it-works"
  | "docs"
  | "market";

type Section = {
  id: SectionId;
  label: string;
  icon: LucideIcon;
};

const SECTIONS: Section[] = [
  { id: "overview", label: "Overview", icon: Sparkles },
  { id: "actions", label: "Actions", icon: Wallet },
  { id: "security", label: "Security", icon: Shield },
  { id: "automation", label: "Automation", icon: Bot },
  { id: "how-it-works", label: "How it works", icon: Network },
  { id: "docs", label: "Docs & papers", icon: BookOpen },
  { id: "market", label: "Market watch", icon: LineChart },
];

export default function Token() {
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [toast, setToast] = useState<
    {
      message: string;
      type: "success" | "warn" | "error";
    } | null
  >(null);
  const [activeAction, setActiveAction] = useState<DctActionKey>(
    ACTION_PAD.defaultActionKey,
  );

  const activeActionDefinition = useMemo<DctActionDefinition | undefined>(
    () => ACTION_PAD.actions.find((action) => action.key === activeAction),
    [activeAction],
  );

  const handleCopyField = useCallback(
    async (label: string, value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setToast({
          type: "success",
          message: `${label} copied`,
        });
      } catch (error) {
        console.error("Failed to copy action pad field", error);
        setToast({
          type: "error",
          message: "Copy not available",
        });
      }
    },
    [],
  );

  const activeSectionContent = useMemo(() => {
    switch (activeSection) {
      case "overview":
        return (
          <Card className="bg-card/50 backdrop-blur border-border/60">
            <CardHeader className="space-y-4 pb-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-primary/20 text-primary">DCT Jetton</Badge>
                <span className="text-xs text-muted-foreground">
                  Dynamic Capital Token
                </span>
              </div>
              <CardTitle className="text-xl text-foreground">
                Treasury-grade liquidity inside Telegram
              </CardTitle>
              <CardDescription className="leading-relaxed text-sm">
                Manage deposits, withdrawals, and swaps without leaving the Mini
                App. DCT powers staking, VIP plans, and omnichain automation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {HERO_HIGHLIGHTS.map((highlight) => (
                <div
                  key={highlight.title}
                  className="flex items-start gap-3 rounded-lg border border-border/40 bg-secondary/40 p-3"
                >
                  <highlight.icon className="mt-0.5 h-4 w-4 text-primary" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {highlight.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {highlight.description}
                    </p>
                  </div>
                </div>
              ))}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Supported wallets
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUPPORTED_WALLETS.map((wallet) => (
                    <Badge
                      key={wallet}
                      variant="outline"
                      className="border-primary/30 bg-primary/10 text-xs text-primary"
                    >
                      {wallet}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case "actions":
        return (
          <Card className="bg-card/50 backdrop-blur border-border/60">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">
                Deposit, withdraw, and use DCT
              </CardTitle>
              <CardDescription className="text-sm">
                A single action pad routes onboarding, treasury deposits,
                withdrawals, and liquidity links without leaving Telegram.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
              <div className="grid gap-2 sm:grid-cols-2">
                {ACTION_PAD.actions.map((action) => {
                  const IconComponent = ACTION_ICON_MAP[action.key];
                  const isActive = action.key === activeAction;
                  return (
                    <Button
                      key={action.key}
                      variant={isActive ? "default" : "outline"}
                      className="justify-start gap-2"
                      onClick={() => setActiveAction(action.key)}
                    >
                      <IconComponent className="h-4 w-4" />
                      {action.label}
                    </Button>
                  );
                })}
              </div>

              {activeActionDefinition
                ? (
                  <div className="space-y-4 rounded-lg border border-border/40 bg-secondary/40 p-3">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">
                        {activeActionDefinition.summary}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activeActionDefinition.description}
                      </p>
                    </div>
                    <ul className="space-y-2">
                      {activeActionDefinition.highlights.map((highlight) => (
                        <li
                          key={highlight}
                          className="flex items-start gap-2 text-xs text-muted-foreground"
                        >
                          <Check className="mt-0.5 h-4 w-4 text-primary" />
                          {highlight}
                        </li>
                      ))}
                    </ul>

                    {activeAction === "onboard"
                      ? (
                        <div className="space-y-3 rounded-lg border border-dashed border-border/60 bg-secondary/30 p-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <ClipboardList className="h-4 w-4 text-primary" />
                            Onboarding playbook
                          </div>
                          <ul className="space-y-2">
                            {ONBOARDING_STEPS.map((step) => (
                              <li
                                key={step.title}
                                className="text-xs text-muted-foreground"
                              >
                                <span className="font-medium text-foreground">
                                  {step.title}:
                                </span>{" "}
                                {step.description}
                              </li>
                            ))}
                          </ul>
                          <Button asChild className="gap-2">
                            <a
                              href="https://dynamiccapital.ai/wallet"
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Open wallet desk
                            </a>
                          </Button>
                        </div>
                      )
                      : null}

                    {activeAction === "deposit"
                      ? (
                        <div className="space-y-3">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Button asChild className="gap-2">
                              <a
                                href={ACTION_PAD.tonkeeperUniversalLink}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Wallet className="h-4 w-4" />
                                Open Tonkeeper link
                              </a>
                            </Button>
                            <Button asChild variant="outline" className="gap-2">
                              <a href={ACTION_PAD.tonTransferLink}>
                                <ExternalLink className="h-4 w-4" />
                                Use ton:// URI
                              </a>
                            </Button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {ACTION_PAD.copyFields.map((field) => (
                              <div key={field.key} className="space-y-1">
                                <Button
                                  variant="secondary"
                                  className="w-full justify-start gap-2"
                                  onClick={() =>
                                    handleCopyField(field.label, field.value)}
                                >
                                  <Copy className="h-4 w-4" />
                                  Copy {field.label}
                                </Button>
                                {field.helper
                                  ? (
                                    <p className="text-xs text-muted-foreground">
                                      {field.helper}
                                    </p>
                                  )
                                  : null}
                              </div>
                            ))}
                          </div>
                          {ACTION_PAD.qrLink
                            ? (
                              <div className="flex flex-col items-center gap-2">
                                <QrCode value={ACTION_PAD.qrLink} size={180} />
                                <p className="text-center text-xs text-muted-foreground">
                                  Scan to launch the {ACTION_PAD.alias}{" "}
                                  deposit link in your TonConnect wallet.
                                </p>
                              </div>
                            )
                            : null}
                        </div>
                      )
                      : null}

                    {activeAction === "withdraw"
                      ? (
                        <div className="space-y-3">
                          <div className="space-y-2 rounded-lg border border-dashed border-border/60 bg-secondary/30 p-3">
                            <p className="text-sm font-semibold text-foreground">
                              Withdrawal guidelines
                            </p>
                            <ul className="space-y-2">
                              {WITHDRAWAL_POINTS.map((point) => (
                                <li
                                  key={point}
                                  className="flex items-start gap-2 text-xs text-muted-foreground"
                                >
                                  <Check className="mt-0.5 h-4 w-4 text-primary" />
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Button asChild className="gap-2">
                              <a
                                href="https://dynamiccapital.ai/tools/dynamic-portfolio"
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ArrowUpFromLine className="h-4 w-4" />
                                Open investor desk
                              </a>
                            </Button>
                            <Button asChild variant="outline" className="gap-2">
                              <a
                                href="https://t.me/DynamicCapital_Support"
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Users className="h-4 w-4" />
                                Message concierge
                              </a>
                            </Button>
                          </div>
                        </div>
                      )
                      : null}

                    {activeAction === "utilize"
                      ? (
                        <div className="space-y-2">
                          {DEX_OPTIONS.map((dex) => (
                            <div
                              key={dex.name}
                              className="space-y-2 rounded-lg border border-border/40 bg-secondary/30 p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">
                                    {dex.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {dex.description}
                                  </p>
                                </div>
                                <Badge className="bg-primary/15 text-xs text-primary">
                                  {dex.name} DEX
                                </Badge>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-3">
                                <Button asChild className="gap-2 text-sm">
                                  <a
                                    href={dex.swapUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <RefreshCcw className="h-4 w-4" />
                                    Open swap
                                  </a>
                                </Button>
                                <Button
                                  asChild
                                  variant="outline"
                                  className="gap-2 text-sm"
                                >
                                  <a
                                    href={dex.explorerUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    Pool explorer
                                  </a>
                                </Button>
                                <Button
                                  asChild
                                  variant="outline"
                                  className="gap-2 text-sm"
                                >
                                  <a
                                    href={dex.jettonWalletUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    Jetton wallet
                                  </a>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                      : null}

                    {activeActionDefinition.links.length > 0
                      ? (
                        <div className="flex flex-wrap gap-2">
                          {activeActionDefinition.links.map((link) => (
                            <Button
                              key={link.href}
                              asChild
                              variant="outline"
                              className="gap-2 text-sm"
                            >
                              <a
                                href={link.href}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                                {link.label}
                              </a>
                            </Button>
                          ))}
                        </div>
                      )
                      : null}
                  </div>
                )
                : null}
            </CardContent>
          </Card>
        );
      case "security":
        return (
          <Card className="bg-card/50 backdrop-blur border-border/60">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">
                Security features
              </CardTitle>
              <CardDescription className="text-sm">
                Controls that keep treasury actions verifiable and safe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {SECURITY_FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-start gap-3 rounded-lg border border-border/40 bg-secondary/40 p-3"
                >
                  <Shield className="mt-0.5 h-4 w-4 text-primary" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {feature.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      case "automation":
        return (
          <Card className="bg-card/50 backdrop-blur border-border/60">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">
                Automation insights
              </CardTitle>
              <CardDescription className="text-sm">
                Understand how treasury events trigger Dynamic Capital bots.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {AUTOMATION_EVENTS.map((event) => (
                <div
                  key={event}
                  className="flex items-start gap-3 rounded-lg border border-border/40 bg-secondary/40 p-3"
                >
                  <Bot className="mt-0.5 h-4 w-4 text-primary" />
                  <p className="text-sm text-muted-foreground">{event}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      case "how-it-works":
        return (
          <Card className="bg-card/50 backdrop-blur border-border/60">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">
                How Dynamic Capital operates
              </CardTitle>
              <CardDescription className="text-sm">
                Understand the engine powering treasury management, automation,
                and signal delivery.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {HOW_IT_WORKS_PILLARS.map((pillar) => (
                <div
                  key={pillar.title}
                  className="space-y-2 rounded-lg border border-border/40 bg-secondary/40 p-4"
                >
                  <div className="flex items-start gap-3">
                    <pillar.icon className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {pillar.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pillar.description}
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-1 pl-8 text-xs text-muted-foreground">
                    {pillar.highlights.map((highlight) => (
                      <li key={highlight} className="list-disc">
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      case "docs":
        return (
          <Card className="bg-card/50 backdrop-blur border-border/60">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">
                Whitepapers & documentation
              </CardTitle>
              <CardDescription className="text-sm">
                Dive deeper into Dynamic Capital mechanics, governance, and
                security.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {WHITEPAPER_RESOURCES.map((resource) => (
                <div
                  key={resource.title}
                  className="space-y-3 rounded-lg border border-border/40 bg-secondary/40 p-4"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">
                        {resource.title}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {resource.description}
                    </p>
                    <Badge
                      variant="outline"
                      className="w-fit border-primary/30 bg-primary/10 text-[10px] uppercase tracking-wide text-primary"
                    >
                      {resource.format}
                    </Badge>
                  </div>
                  <Button asChild className="w-full gap-2 text-sm">
                    <a href={resource.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Open resource
                    </a>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      case "market":
        return (
          <Card className="bg-card/50 backdrop-blur border-border/60">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">
                Dynamic market watchlists
              </CardTitle>
              <CardDescription className="text-sm">
                Centralized dashboards track liquidity, yield, and macro context
                for DCT holders.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {MARKET_WATCHLISTS.map((watchlist) => (
                <div
                  key={watchlist.title}
                  className="space-y-3 rounded-lg border border-border/40 bg-secondary/40 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {watchlist.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Coverage: {watchlist.coverage}
                      </p>
                    </div>
                    <Badge className="bg-primary/15 text-[10px] uppercase tracking-wide text-primary">
                      {watchlist.cadence}
                    </Badge>
                  </div>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {watchlist.insights.map((insight) => (
                      <li key={insight} className="flex items-start gap-2">
                        <BarChart3 className="mt-0.5 h-3.5 w-3.5 text-primary" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  }, [activeSection]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/40 to-background">
      <TopBar title="Dynamic Capital Token" />
      <div className="container mx-auto px-4 pb-8">
        <div className="py-6">
          <div className="mb-4 space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Manage DCT without leaving Telegram
            </h1>
            <p className="text-sm text-muted-foreground">
              Switch sections with the controls below to review everything about
              deposits, withdrawals, swaps, and automation in one place.
            </p>
          </div>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === activeSection;
              return (
                <Button
                  key={section.id}
                  variant={isActive ? "default" : "secondary"}
                  size="sm"
                  className={cn(
                    "min-w-max gap-2",
                    !isActive && "bg-secondary/70 text-muted-foreground",
                  )}
                  onClick={() => setActiveSection(section.id)}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </Button>
              );
            })}
          </div>
          <div className="space-y-4">{activeSectionContent}</div>
        </div>
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
