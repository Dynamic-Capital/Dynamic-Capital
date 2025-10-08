import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bot,
  Copy,
  ExternalLink,
  Layers,
  type LucideIcon,
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
import { cn } from "../lib/utils";

const DCT_TREASURY_ADDRESS = "EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq";
const DCT_TREASURY_URL = `https://tonviewer.com/${DCT_TREASURY_ADDRESS}`;
const DCT_JETTON_ADDRESS = "EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y";
const DCT_JETTON_URL = `https://tonviewer.com/jetton/${DCT_JETTON_ADDRESS}`;
const STONFI_POOL_URL = "https://app.ston.fi/swap?from=TON&to=DCT";
const STONFI_EXPLORER_URL =
  "https://tonviewer.com/EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt";
const DEDUST_POOL_URL = "https://dedust.io/swap/TON-DCT";
const DEDUST_EXPLORER_URL =
  "https://tonviewer.com/EQDTJ4lHuT6BdTYEio99UMZNC9hzlQ-TfoA9THrvyrLumEFm";
const TONKEEPER_UNIVERSAL_LINK =
  `https://app.tonkeeper.com/transfer/${DCT_TREASURY_ADDRESS}?jetton=${DCT_JETTON_ADDRESS}&text=${
    encodeURIComponent(
      "Dynamic Capital DCT deposit",
    )
  }`;
const TON_STANDARD_LINK =
  `ton://transfer/${DCT_TREASURY_ADDRESS}?jetton=${DCT_JETTON_ADDRESS}&text=${
    encodeURIComponent(
      "Dynamic Capital DCT deposit",
    )
  }`;

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
  },
  {
    name: "DeDust",
    description:
      "Tap the DCT/TON pool that backs Dynamic Capital's TON-side liquidity reserves.",
    swapUrl: DEDUST_POOL_URL,
    explorerUrl: DEDUST_EXPLORER_URL,
  },
] as const;

type SectionId =
  | "overview"
  | "onboarding"
  | "deposit"
  | "withdraw"
  | "swap"
  | "security"
  | "automation";

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
            <CardContent className="space-y-4 pt-2">
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
                Use your preferred TonConnect wallet to transfer jettons
                directly into Dynamic Capital.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="rounded-lg border border-border/40 bg-secondary/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Treasury wallet
                </p>
                <p className="mt-1 font-mono text-sm text-foreground">
                  {shortenAddress(DCT_TREASURY_ADDRESS)}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <Button
                    variant="secondary"
                    className="justify-start gap-2"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          DCT_TREASURY_ADDRESS,
                        );
                        setToast({
                          type: "success",
                          message: "Treasury address copied",
                        });
                      } catch (error) {
                        console.error("Failed to copy treasury address", error);
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
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Treasury transfers remain auditable in Tonviewer. Include your
                investor memo when prompted so reconciliation clears instantly.
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
            <CardContent className="space-y-3 pt-2">
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
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
