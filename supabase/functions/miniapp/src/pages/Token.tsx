import { useMemo, useState } from "react";
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
  TON_MAINNET_DCT_TREASURY_ALIAS,
  TON_MAINNET_DCT_TREASURY_MEMO,
  TON_MAINNET_DCT_TREASURY_TON_TRANSFER_LINK,
  TON_MAINNET_DCT_TREASURY_TONKEEPER_LINK,
  TON_MAINNET_DCT_TREASURY_TONVIEWER_URL,
  TON_MAINNET_DCT_TREASURY_WALLET,
  TON_MAINNET_DEDUST_DCT_JETTON_WALLET,
  TON_MAINNET_JETTON_MASTER,
  TON_MAINNET_STONFI_DCT_JETTON_WALLET,
} from "../../../../../shared/ton/mainnet-addresses";

const DCT_TREASURY_ALIAS = TON_MAINNET_DCT_TREASURY_ALIAS;
const DCT_TREASURY_ADDRESS = TON_MAINNET_DCT_TREASURY_WALLET;
const DCT_TREASURY_URL = TON_MAINNET_DCT_TREASURY_TONVIEWER_URL;
const DCT_JETTON_ADDRESS = TON_MAINNET_JETTON_MASTER;
const DCT_JETTON_URL = `https://tonviewer.com/jetton/${DCT_JETTON_ADDRESS}`;
const DCT_TONSCAN_URL = `https://tonscan.org/jetton/${DCT_JETTON_ADDRESS}`;
const STONFI_POOL_URL = "https://app.ston.fi/swap?from=TON&to=DCT";
const STONFI_EXPLORER_URL =
  "https://tonviewer.com/EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt";
const STONFI_JETTON_WALLET_URL =
  `https://tonviewer.com/${TON_MAINNET_STONFI_DCT_JETTON_WALLET}`;
const DEDUST_POOL_URL = "https://dedust.io/swap/TON-DCT";
const DEDUST_EXPLORER_URL =
  "https://tonviewer.com/EQAxh2vD3UMfNrF29pKl6WsOzxrt6_p2SXrNLzZh1vus0_MI";
const DEDUST_JETTON_WALLET_URL =
  `https://tonviewer.com/${TON_MAINNET_DEDUST_DCT_JETTON_WALLET}`;
const OPERATIONS_TREASURY_ADDRESS =
  "EQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOPDD";
const OPERATIONS_TREASURY_URL =
  `https://tonviewer.com/${OPERATIONS_TREASURY_ADDRESS}`;
const TONKEEPER_UNIVERSAL_LINK = TON_MAINNET_DCT_TREASURY_TONKEEPER_LINK;
const TON_STANDARD_LINK = TON_MAINNET_DCT_TREASURY_TON_TRANSFER_LINK;
const DCT_TREASURY_MEMO = TON_MAINNET_DCT_TREASURY_MEMO;

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

const DEX_OPTIONS = [
  {
    name: "STON.fi",
    description:
      "Route TON ↔︎ DCT swaps through the primary liquidity router used for treasury burns.",
    swapUrl: STONFI_POOL_URL,
    explorerUrl: STONFI_EXPLORER_URL,
    jettonWalletUrl: STONFI_JETTON_WALLET_URL,
  },
  {
    name: "DeDust",
    description:
      "Tap the DCT/TON pool that backs Dynamic Capital's TON-side liquidity reserves.",
    swapUrl: DEDUST_POOL_URL,
    explorerUrl: DEDUST_EXPLORER_URL,
    jettonWalletUrl: DEDUST_JETTON_WALLET_URL,
  },
] as const;

type SectionId =
  | "overview"
  | "onboarding"
  | "deposit"
  | "withdraw"
  | "swap"
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
  { id: "onboarding", label: "Onboarding", icon: Users },
  { id: "deposit", label: "Deposit", icon: ArrowDownToLine },
  { id: "withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { id: "swap", label: "Swap", icon: RefreshCcw },
  { id: "security", label: "Security", icon: Shield },
  { id: "automation", label: "Automation", icon: Bot },
  { id: "how-it-works", label: "How it works", icon: Network },
  { id: "docs", label: "Docs & papers", icon: BookOpen },
  { id: "market", label: "Market watch", icon: LineChart },
];

function shortenAddress(value: string, visible = 6) {
  if (value.length <= visible * 2) {
    return value;
  }
  return `${value.slice(0, visible)}…${value.slice(-visible)}`;
}

export default function Token() {
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [toast, setToast] = useState<
    {
      message: string;
      type: "success" | "warn" | "error";
    } | null
  >(null);

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
      case "onboarding":
        return (
          <Card className="bg-card/50 backdrop-blur border-border/60">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">
                Link your TonConnect wallet
              </CardTitle>
              <CardDescription className="text-sm">
                Three quick steps and you're ready to move DCT in Dynamic
                Capital.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
              {ONBOARDING_STEPS.map((step, index) => (
                <div
                  key={step.title}
                  className="flex items-start gap-3 rounded-lg border border-border/40 bg-secondary/40 p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
              <div className="space-y-3 rounded-lg border border-dashed border-border/60 bg-secondary/30 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Investor milestones
                </div>
                <ul className="space-y-2">
                  {INVESTOR_MILESTONES.map((milestone) => (
                    <li
                      key={milestone.title}
                      className="text-xs text-muted-foreground"
                    >
                      <span className="font-medium text-foreground">
                        {milestone.title}:
                      </span>{" "}
                      {milestone.description}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        );
      case "deposit":
        return (
          <Card className="bg-card/50 backdrop-blur border-border/60">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">
                Deposit DCT into the treasury
              </CardTitle>
              <CardDescription className="text-sm">
                Use the {DCT_TREASURY_ALIAS}{" "}
                TON DNS alias with your preferred TonConnect wallet to transfer
                jettons directly into Dynamic Capital.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="rounded-lg border border-border/40 bg-secondary/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Treasury wallet
                </p>
                <p className="mt-1 font-mono text-sm text-foreground">
                  {DCT_TREASURY_ALIAS}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Resolves to {shortenAddress(DCT_TREASURY_ADDRESS)}{" "}
                  for explorer verification.
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <Button
                    variant="secondary"
                    className="justify-start gap-2"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(DCT_TREASURY_ALIAS);
                        setToast({
                          type: "success",
                          message: "TON alias copied",
                        });
                      } catch (error) {
                        console.error(
                          "Failed to copy treasury TON alias",
                          error,
                        );
                        setToast({
                          type: "error",
                          message: "Copy not available",
                        });
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy {DCT_TREASURY_ALIAS}
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start gap-2"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          DCT_TREASURY_ADDRESS,
                        );
                        setToast({
                          type: "success",
                          message: "Raw address copied",
                        });
                      } catch (error) {
                        console.error(
                          "Failed to copy treasury address",
                          error,
                        );
                        setToast({
                          type: "error",
                          message: "Copy not available",
                        });
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy raw address
                  </Button>
                  <Button asChild className="gap-2">
                    <a
                      href={TONKEEPER_UNIVERSAL_LINK}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Wallet className="h-4 w-4" />
                      Open in Tonkeeper
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="gap-2">
                    <a href={TON_STANDARD_LINK} rel="noreferrer">
                      <Repeat className="h-4 w-4" />
                      Use ton:// link
                    </a>
                  </Button>
                </div>
                <QrCode
                  value={TON_STANDARD_LINK}
                  caption={`Scan to launch the ${DCT_TREASURY_ALIAS} deposit link in your TonConnect wallet.`}
                  className="mt-4"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button
                  asChild
                  variant="outline"
                  className="gap-2 text-sm"
                >
                  <a href={DCT_TREASURY_URL} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    View treasury on TON Explorer
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="gap-2 text-sm"
                >
                  <a href={DCT_JETTON_URL} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    View jetton master
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="gap-2 text-sm"
                >
                  <a href={DCT_TONSCAN_URL} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    View on Tonscan
                  </a>
                </Button>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                TonConnect pre-fills "{DCT_TREASURY_MEMO}" as the memo. Append
                your investor reference when prompted so reconciliation clears
                instantly.
              </p>
            </CardContent>
          </Card>
        );
      case "withdraw":
        return (
          <Card className="bg-card/50 backdrop-blur border-border/60">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">
                Schedule a withdrawal
              </CardTitle>
              <CardDescription className="text-sm">
                Keep operations smooth by submitting requests ahead of time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="rounded-lg border border-border/40 bg-secondary/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Operations release wallet
                </p>
                <p className="mt-1 font-mono text-sm text-foreground">
                  {shortenAddress(OPERATIONS_TREASURY_ADDRESS)}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    variant="secondary"
                    className="justify-start gap-2"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          OPERATIONS_TREASURY_ADDRESS,
                        );
                        setToast({
                          type: "success",
                          message: "Operations wallet copied",
                        });
                      } catch (error) {
                        console.error(
                          "Failed to copy operations wallet address",
                          error,
                        );
                        setToast({
                          type: "error",
                          message: "Copy not available",
                        });
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy address
                  </Button>
                  <Button asChild variant="outline" className="gap-2 text-sm">
                    <a
                      href={OPERATIONS_TREASURY_URL}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on TON Explorer
                    </a>
                  </Button>
                </div>
                <QrCode
                  value={OPERATIONS_TREASURY_URL}
                  caption="Scan to verify the operations wallet in Tonviewer."
                  className="mt-4"
                />
              </div>
              {WITHDRAWAL_POINTS.map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-3 rounded-lg border border-border/40 bg-secondary/40 p-3"
                >
                  <ArrowUpFromLine className="mt-0.5 h-4 w-4 text-primary" />
                  <p className="text-sm text-muted-foreground">{point}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      case "swap":
        return (
          <Card className="bg-card/50 backdrop-blur border-border/60">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">
                Swap DCT on leading DEXs
              </CardTitle>
              <CardDescription className="text-sm">
                Preferred liquidity routes for balancing TON and DCT positions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {DEX_OPTIONS.map((dex) => (
                <div
                  key={dex.name}
                  className="space-y-3 rounded-lg border border-border/40 bg-secondary/40 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-base font-semibold text-foreground">
                      {dex.name}
                    </p>
                    <Badge className="bg-primary/15 text-primary">DEX</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {dex.description}
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button asChild className="gap-2 text-sm">
                      <a href={dex.swapUrl} target="_blank" rel="noreferrer">
                        <RefreshCcw className="h-4 w-4" />
                        Open swap
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="gap-2 text-sm">
                      <a
                        href={dex.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View on Tonviewer
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
