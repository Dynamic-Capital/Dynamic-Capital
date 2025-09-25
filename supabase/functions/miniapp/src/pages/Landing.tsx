import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bell,
  Bot,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Gift,
  Home,
  MessageCircle,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import TopBar from "../components/TopBar";

const STEP_FLOW = [
  { label: "Connect Wallet", description: "Authenticate with TON Connect" },
  { label: "Choose Plan", description: "Pick a VIP tier in one tap" },
  { label: "Pay in TON", description: "Confirm TON or DCT payment" },
  { label: "Dashboard", description: "Unlock analytics instantly" },
] as const;

const PRICING_PLANS = [
  {
    id: "bronze",
    name: "VIP Bronze",
    ton: 240,
    dct: 4800,
    lock: "3 month lock",
    multiplier: "1.2x signal boost",
    benefits: ["Daily FX signals", "Bot automation presets"],
    accent: "from-teal-500/80 to-cyan-500/60",
    bestValue: false,
  },
  {
    id: "silver",
    name: "VIP Silver",
    ton: 420,
    dct: 8400,
    lock: "6 month lock",
    multiplier: "1.6x signal boost",
    benefits: ["Intraday strategy room", "Priority mentor review"],
    accent: "from-sky-500/80 to-blue-500/60",
    bestValue: false,
  },
  {
    id: "gold",
    name: "VIP Gold",
    ton: 680,
    dct: 13600,
    lock: "12 month lock",
    multiplier: "2.1x signal boost",
    benefits: ["Best value badge", "Desk escalation hotline"],
    accent: "from-amber-500/80 to-orange-500/60",
    bestValue: true,
  },
  {
    id: "mentorship",
    name: "Mentorship",
    ton: 950,
    dct: 19000,
    lock: "Flexible 1:1 sprint",
    multiplier: "Custom scaling",
    benefits: ["Dedicated mentor", "Weekly performance labs"],
    accent: "from-purple-500/80 to-fuchsia-500/60",
    bestValue: false,
  },
] as const;

const ROI_DATA: Array<{ month: string; roi: number; growth: number }> = [
  { month: "Jan", roi: 6.2, growth: 12 },
  { month: "Feb", roi: 7.8, growth: 15 },
  { month: "Mar", roi: 8.6, growth: 17 },
  { month: "Apr", roi: 7.2, growth: 14 },
  { month: "May", roi: 9.1, growth: 19 },
  { month: "Jun", roi: 10.4, growth: 21 },
];

const SUPPLY_SPLIT: Array<{ name: string; value: number }> = [
  { name: "User-held", value: 56 },
  { name: "Treasury", value: 28 },
  { name: "Burned", value: 16 },
];

const SUPPLY_COLORS = ["#2FD2C5", "#4F46E5", "#F97316"];

const ANNOUNCEMENTS = [
  {
    id: "1",
    title: "TON payments now live",
    body:
      "Connect once, fund instantly. Auto-receipts push to the bot as soon as approvals land.",
    time: "2h ago",
  },
  {
    id: "2",
    title: "Gold plan performance",
    body:
      "Last 30 days: +18.6% ROI with 92% signal adherence from the Gold desk.",
    time: "Yesterday",
  },
  {
    id: "3",
    title: "Mentor availability",
    body:
      "Dubai mentors covering London session this week. Book via dashboard.",
    time: "2 days ago",
  },
] as const;

const ALERT_TOASTS = [
  {
    id: "toast-payment",
    tone: "success" as const,
    title: "Payment received",
    message: "720 TON confirmed. VIP Gold unlocked.",
  },
  {
    id: "toast-expiring",
    tone: "warn" as const,
    title: "Subscription expiring soon",
    message: "Silver plan renews in 3 days.",
  },
  {
    id: "toast-reward",
    tone: "celebrate" as const,
    title: "Reward distributed",
    message: "3,250 DCT airdropped to your rewards wallet.",
  },
] as const;

const FAQ_ITEMS = [
  {
    question: "How do I connect the TON wallet?",
    answer:
      "Tap TON Connect and approve in your mobile wallet. We auto-detect wallets opened from Telegram and keep the session signed until you revoke access.",
  },
  {
    question: "Can I pay with DCT instead of TON?",
    answer:
      "Yes. Toggle pricing to DCT and we generate an address + memo that matches your Telegram ID for instant reconciliation.",
  },
  {
    question: "When are rewards unlocked?",
    answer:
      "Rewards unlock at the end of the staking lock-up. Claimable rewards show in the dashboard with a real-time countdown.",
  },
  {
    question: "How fast are receipts reviewed?",
    answer:
      "Uploads route straight to the VIP desk. Most reviews finalize in under 30 minutes with bot notifications for every status update.",
  },
] as const;

const TICKER_STATS = [
  { label: "Circulating Supply", value: "42.8M DCT" },
  { label: "Last Burn", value: "#9F8A · 950K DCT" },
  { label: "Total Stakers", value: "18,204 wallets" },
] as const;

type PricingMode = "TON" | "DCT";
type ReceiptStatus = "pending" | "approved" | "rejected";

type ToastTone = "success" | "warn" | "celebrate";

function statusBadgeTone(status: ReceiptStatus) {
  switch (status) {
    case "approved":
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40";
    case "rejected":
      return "bg-rose-500/15 text-rose-300 border border-rose-500/40";
    default:
      return "bg-amber-500/15 text-amber-200 border border-amber-500/40";
  }
}

function toastToneStyles(tone: ToastTone) {
  if (tone === "success") return "bg-emerald-500/15 border-emerald-500/40";
  if (tone === "warn") return "bg-amber-500/15 border-amber-500/40";
  return "bg-violet-500/15 border-violet-500/40";
}

export default function Landing() {
  const [pricingMode, setPricingMode] = useState<PricingMode>("TON");
  const [selectedPlan, setSelectedPlan] = useState<
    typeof PRICING_PLANS[number]["id"]
  >("gold");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [tonAddress, setTonAddress] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const uploadTimerRef = useRef<number | null>(null);
  const [receiptStatus, setReceiptStatus] = useState<ReceiptStatus>("pending");
  const [toastIndex, setToastIndex] = useState(0);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [faqOpen, setFaqOpen] = useState<string | null>(
    FAQ_ITEMS[0]?.question ?? null,
  );
  const [supportOnline] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.dataset.theme = darkMode ? "dark" : "light";
    return () => {
      root.dataset.theme = "dark";
    };
  }, [darkMode]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTickerIndex((index) => (index + 1) % TICKER_STATS.length);
    }, 4000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (receiptPreview) {
        URL.revokeObjectURL(receiptPreview);
      }
      if (uploadTimerRef.current) {
        window.clearInterval(uploadTimerRef.current);
      }
    };
  }, [receiptPreview]);

  const currentStep = useMemo(() => {
    if (!connected) return 0;
    if (!selectedPlan) return 1;
    if (receiptStatus === "approved") return 3;
    return 2;
  }, [connected, selectedPlan, receiptStatus]);

  const progressPercentage = ((currentStep + 1) / STEP_FLOW.length) * 100;

  const nextToast = () =>
    setToastIndex((index) => (index + 1) % ALERT_TOASTS.length);

  const handleWalletConnect = () => {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setConnected(true);
      setTonAddress("UQD1a...8X2Z");
    }, 1200);
  };

  const handleReceiptUpload = (file: File | null) => {
    if (!file) return;
    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview);
    }
    const url = URL.createObjectURL(file);
    setReceiptPreview(url);
    setReceiptStatus("pending");
    setIsUploading(true);
    setUploadProgress(0);
    if (uploadTimerRef.current) {
      window.clearInterval(uploadTimerRef.current);
    }
    uploadTimerRef.current = window.setInterval(() => {
      setUploadProgress((progress) => {
        if (progress >= 100) {
          if (uploadTimerRef.current) {
            window.clearInterval(uploadTimerRef.current);
          }
          setIsUploading(false);
          setTimeout(() => setReceiptStatus("approved"), 600);
          return 100;
        }
        return Math.min(100, progress + 20);
      });
    }, 320);
  };

  const removeReceipt = () => {
    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview);
    }
    if (uploadTimerRef.current) {
      window.clearInterval(uploadTimerRef.current);
    }
    setReceiptPreview(null);
    setUploadProgress(0);
    setIsUploading(false);
    setReceiptStatus("pending");
  };

  const stakingDuration = 180; // days
  const stakingElapsed = 124;
  const stakingProgress = Math.min(
    100,
    Math.round((stakingElapsed / stakingDuration) * 100),
  );

  const countdownLabel = useMemo(() => {
    const remaining = Math.max(stakingDuration - stakingElapsed, 0);
    const months = Math.floor(remaining / 30);
    const days = remaining % 30;
    return `${months}m ${days}d remaining`;
  }, [stakingDuration, stakingElapsed]);

  const activeToast = ALERT_TOASTS[toastIndex];
  const activeTicker = TICKER_STATS[tickerIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white pb-24">
      <TopBar title="Dynamic Capital" />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-16 pt-6">
        <motion.section
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-teal-500/20 via-cyan-500/10 to-indigo-500/20 blur-3xl" />
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-teal-200">
              <Sparkles className="h-4 w-4" />
              Frictionless onboarding for TON VIPs
            </div>
            <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
              Connect. Subscribe. Trade — all in one Telegram mini app.
            </h1>
            <p className="text-sm text-slate-300 md:text-base">
              One-click flow from the bot into the mini app. Secure wallet
              connect, flexible VIP plans, and analytics that show the impact of
              every TON you stake.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 rounded-full bg-teal-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg"
                onClick={handleWalletConnect}
              >
                {connected ? "Wallet Connected" : "Get Started"}
                <ArrowRight className="h-4 w-4" />
              </motion.button>
              <Link
                to="/plan"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-slate-200"
              >
                Explore plans
              </Link>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Shield className="h-4 w-4 text-emerald-300" />
                {connected
                  ? "Verified wallet session"
                  : "TON Connect keeps your keys safe"}
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Progress</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 via-sky-400 to-indigo-400"
                animate={{ width: `${progressPercentage}%` }}
                transition={{ type: "spring", stiffness: 140, damping: 20 }}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {STEP_FLOW.map((step, index) => {
                const complete = index < currentStep;
                const active = index === currentStep;
                return (
                  <div
                    key={step.label}
                    className={`rounded-2xl border p-3 text-xs transition ${
                      complete
                        ? "border-teal-400/40 bg-teal-500/10 text-teal-100"
                        : active
                        ? "border-white/40 bg-white/10 text-white"
                        : "border-white/10 bg-black/20 text-slate-300"
                    }`}
                  >
                    <div className="font-semibold">{step.label}</div>
                    <div className="mt-1 text-[11px] leading-relaxed text-slate-300">
                      {step.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>

        <motion.section
          className="grid gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-lg md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="flex flex-col justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-teal-500/20 p-3">
                <Wallet className="h-6 w-6 text-teal-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Wallet Connect</h2>
                <p className="text-xs text-slate-300">
                  Pair Telegram with TON in under five seconds. We remember
                  trusted devices.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Status</span>
                  <span className="font-medium text-teal-200">
                    {connected
                      ? "Connected"
                      : connecting
                      ? "Awaiting approval"
                      : "Not connected"}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleWalletConnect}
                  disabled={connecting}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-400 via-sky-400 to-indigo-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {connecting
                    ? "Waiting for TON"
                    : connected
                    ? "Reconnect"
                    : "TON Connect"}
                </motion.button>
                <AnimatePresence>
                  {connecting && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
                    >
                      <Clock className="h-4 w-4" />{" "}
                      Waiting for wallet confirmation…
                    </motion.div>
                  )}
                </AnimatePresence>
                {connected && tonAddress && (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    <span>{tonAddress}</span>
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-400">
              UX tip: keep it one-click from bot → mini app → wallet connect.
            </p>
          </div>
          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/80 p-4">
            <h3 className="text-sm font-semibold text-slate-100">
              Step overview
            </h3>
            <div className="space-y-3 text-xs text-slate-300">
              <p>
                We surface required actions as soon as you land inside the mini
                app:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                  Connect wallet via TON Connect with optional biometrics.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                  Choose a plan and confirm the lock period that fits your desk.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                  Pay in TON or DCT, then jump straight to portfolio analytics.
                </li>
              </ul>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-lg"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Subscription plans</h2>
              <p className="text-sm text-slate-300">
                Pick a tier, lock it in, and amplify your signal multiplier.
                Gold stays highlighted as the best value option.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-xs">
              <button
                type="button"
                onClick={() => setPricingMode("TON")}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  pricingMode === "TON"
                    ? "bg-teal-500 text-slate-950"
                    : "text-slate-300"
                }`}
              >
                TON
              </button>
              <button
                type="button"
                onClick={() => setPricingMode("DCT")}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  pricingMode === "DCT"
                    ? "bg-teal-500 text-slate-950"
                    : "text-slate-300"
                }`}
              >
                DCT
              </button>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {PRICING_PLANS.map((plan) => {
              const price = pricingMode === "TON" ? plan.ton : plan.dct;
              const suffix = pricingMode === "TON" ? "TON" : "DCT";
              const active = selectedPlan === plan.id;
              return (
                <motion.div
                  key={plan.id}
                  whileHover={{ y: -6, rotateX: 1.2 }}
                  className={`relative overflow-hidden rounded-3xl border bg-slate-900/70 p-5 shadow-lg transition ${
                    active ? "border-teal-400/70" : "border-white/10"
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <div
                    className={`absolute inset-0 -z-10 bg-gradient-to-br ${plan.accent} opacity-60 blur-3xl`}
                  />
                  {plan.bestValue && (
                    <div className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-200">
                      <Star className="h-3.5 w-3.5" /> Best Value
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      <p className="text-xs text-slate-300">{plan.lock}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-semibold">
                        {price.toLocaleString()}
                      </span>
                      <span className="ml-1 text-xs text-slate-300">
                        {suffix}
                      </span>
                      <div className="text-[11px] text-teal-200">
                        {plan.multiplier}
                      </div>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-2 text-xs text-slate-200">
                    {plan.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex-1 rounded-xl bg-teal-500 px-3 py-2 font-semibold text-slate-950"
                    >
                      Subscribe
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex-1 rounded-xl border border-white/20 px-3 py-2 font-medium text-slate-100"
                    >
                      Renew
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-medium text-slate-100"
                    >
                      Upgrade
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          className="grid gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-lg md:grid-cols-2"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-500/20 p-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Payment confirmation</h3>
                <p className="text-xs text-slate-300">
                  Preview the bot-ready receipt we send once TON settles
                  on-chain.
                </p>
              </div>
            </div>
            <div className="space-y-3 text-xs text-slate-200">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <span>Plan</span>
                <span className="font-medium">
                  {PRICING_PLANS.find((p) => p.id === selectedPlan)?.name}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <span>Paid</span>
                <span className="font-medium">
                  {pricingMode === "TON" ? "720 TON" : "14,400 DCT"}
                </span>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">
                  Transaction hash
                </div>
                <div className="mt-1 font-mono text-xs text-slate-100">
                  9F27A3CF…BC90
                </div>
              </div>
              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${
                  statusBadgeTone(receiptStatus)
                }`}
              >
                {receiptStatus === "approved"
                  ? "Approved"
                  : receiptStatus === "rejected"
                  ? "Rejected"
                  : "Pending review"}
              </div>
              <p className="text-[11px] text-slate-300">
                UX tip: your Telegram bot pings the moment the receipt flips to
                approved.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-teal-500/40 bg-teal-500/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Receipt upload</h3>
                <p className="text-xs text-slate-200">
                  Drag & drop, track progress, and manage approval states.
                </p>
              </div>
              <CreditCard className="h-6 w-6 text-teal-300" />
            </div>
            <label
              htmlFor="receipt-upload"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files?.[0];
                if (file) handleReceiptUpload(file);
              }}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/20 bg-white/10 p-6 text-center text-xs text-slate-200"
            >
              {receiptPreview
                ? (
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="h-32 w-full rounded-lg object-cover"
                  />
                )
                : (
                  <>
                    <Wallet className="h-6 w-6 text-teal-300" />
                    <span>Drag & drop receipt image or tap to browse</span>
                  </>
                )}
              <input
                id="receipt-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) =>
                  handleReceiptUpload(event.target.files?.[0] ?? null)}
              />
            </label>
            <AnimatePresence>
              {isUploading && (
                <motion.div
                  key="upload-progress"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Uploading receipt…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-teal-400 via-sky-400 to-indigo-400"
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ ease: "easeInOut" }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {receiptPreview && (
              <button
                type="button"
                onClick={removeReceipt}
                className="self-start text-xs text-slate-300 underline"
              >
                Remove receipt
              </button>
            )}
          </div>
        </motion.section>

        <motion.section
          className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-lg"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-sky-500/20 p-3">
                  <Activity className="h-6 w-6 text-sky-300" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Portfolio overview</h3>
                  <p className="text-xs text-slate-300">
                    At-a-glance insight into plan, expiry, balances, and status.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-xs text-slate-200 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
                  <div className="text-[11px] uppercase text-slate-400">
                    Current plan
                  </div>
                  <div className="mt-1 font-semibold">VIP Gold</div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" />{" "}
                    Active — renews 12 Aug
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
                  <div className="text-[11px] uppercase text-slate-400">
                    DCT balance
                  </div>
                  <div className="mt-1 font-semibold">12,840 DCT</div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-300">
                    <Coins className="h-3.5 w-3.5 text-amber-300" />{" "}
                    8,400 staked · 4,440 rewards
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
                  <div className="text-[11px] uppercase text-slate-400">
                    Subscription status
                  </div>
                  <div className="mt-1 font-semibold text-emerald-200">
                    In good standing
                  </div>
                  <div className="mt-2 text-[11px] text-slate-300">
                    Auto-renew toggled on
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
                  <div className="text-[11px] uppercase text-slate-400">
                    Mentor cadence
                  </div>
                  <div className="mt-1 font-semibold">
                    Weekly 1:1 (Dubai desk)
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-300">
                    <Users className="h-3.5 w-3.5 text-sky-300" />{" "}
                    Next review Tuesday
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Staking progress</h4>
                  <span className="text-[11px] text-slate-300">
                    Lock duration: 6 months
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400"
                    animate={{ width: `${stakingProgress}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 22 }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300">
                  <span>{stakingProgress}% complete</span>
                  <span>{countdownLabel}</span>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-500/20 to-fuchsia-500/20 p-4 text-xs text-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">Unclaimed rewards</h4>
                    <div className="mt-1 text-lg font-semibold text-white">
                      3,250 DCT
                    </div>
                    <p className="mt-1 text-[11px] text-slate-200">
                      Claim weekly or auto-compound into your staking balance.
                    </p>
                  </div>
                  <Gift className="h-8 w-8 text-amber-200" />
                </div>
                <motion.button
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 0 20px rgba(45, 212, 191, 0.45)",
                  }}
                  whileTap={{ scale: 0.96 }}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900"
                >
                  Claim rewards
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="grid gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-lg md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-500/20 p-3">
                <TrendingUp className="h-6 w-6 text-indigo-200" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  Fund performance & analytics
                </h3>
                <p className="text-xs text-slate-300">
                  Charts build trust. Show ROI, fund growth, and supply
                  transparency at a glance.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 text-xs text-slate-200 md:grid-cols-2">
              <div className="h-52 rounded-xl border border-white/10 bg-slate-900/80 p-3">
                <div className="mb-2 flex items-center justify-between text-[11px] text-slate-300">
                  <span>Monthly ROI</span>
                  <span>Rolling 6 months</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ROI_DATA}>
                    <defs>
                      <linearGradient
                        id="roiGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#2FD2C5"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#2FD2C5"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      stroke="#94a3b8"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15,23,42,0.9)",
                        borderRadius: 12,
                        border: "1px solid rgba(148,163,184,0.4)",
                        color: "#e2e8f0",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="roi"
                      stroke="#2FD2C5"
                      strokeWidth={2}
                      fill="url(#roiGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="h-52 rounded-xl border border-white/10 bg-slate-900/80 p-3">
                <div className="mb-2 flex items-center justify-between text-[11px] text-slate-300">
                  <span>Fund growth</span>
                  <span>TVL in TON</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ROI_DATA}>
                    <XAxis
                      dataKey="month"
                      stroke="#94a3b8"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15,23,42,0.9)",
                        borderRadius: 12,
                        border: "1px solid rgba(148,163,184,0.4)",
                        color: "#e2e8f0",
                      }}
                    />
                    <Bar dataKey="growth" radius={8} fill="#38bdf8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-500/20 p-3">
                  <Activity className="h-5 w-5 text-amber-200" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Supply transparency</h4>
                  <p className="text-[11px] text-slate-300">
                    Show the split between circulating, treasury, and burns.
                  </p>
                </div>
              </div>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      dataKey="value"
                      data={SUPPLY_SPLIT}
                      innerRadius={40}
                      outerRadius={68}
                      paddingAngle={6}
                    >
                      {SUPPLY_SPLIT.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={SUPPLY_COLORS[index]}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      formatter={(value) => (
                        <span style={{ color: "#e2e8f0", fontSize: "12px" }}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900/80 to-slate-800/60 p-4 text-xs text-slate-100">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                <Bell className="h-4 w-4" /> Live stats ticker
              </div>
              <div className="mt-3 h-12 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTicker.label}
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -16, opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex h-full flex-col justify-center gap-1"
                  >
                    <div className="text-[11px] text-slate-300">
                      {activeTicker.label}
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {activeTicker.value}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="grid gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-lg md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-violet-500/20 p-3">
                <Bot className="h-6 w-6 text-violet-200" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  Announcements from the bot
                </h3>
                <p className="text-xs text-slate-300">
                  Syncs the latest broadcast messages. Tap through to open the
                  full history.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-xs text-slate-200">
              {ANNOUNCEMENTS.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-slate-900/70 p-3"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{item.time}</span>
                    <span className="inline-flex items-center gap-1 text-sky-300">
                      <Bell className="h-3.5 w-3.5" /> Bot alert
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    {item.title}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                    {item.body}
                  </p>
                </div>
              ))}
              <Link
                to="/status"
                className="inline-flex items-center gap-1 text-[11px] text-slate-300 underline"
              >
                View full history
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900/80 to-slate-800/60 p-4">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                <AlertCircle className="h-4 w-4 text-amber-200" /> Alert toasts
              </div>
              <div className="mt-3 h-28">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeToast.id}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -12, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex h-full flex-col justify-center gap-1 rounded-2xl border px-4 py-3 text-xs ${
                      toastToneStyles(activeToast.tone)
                    }`}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-200">
                      {activeToast.title}
                    </div>
                    <div className="text-sm text-white">
                      {activeToast.message}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
              <button
                type="button"
                onClick={nextToast}
                className="mt-3 text-[11px] text-slate-300 underline"
              >
                Cycle alerts
              </button>
              <p className="mt-2 text-[11px] text-slate-400">
                UX tip: keep bot notifications in lockstep with mini app toasts
                so traders never miss a status change.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-200">
              <div className="flex items-center gap-3">
                <div
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${
                    supportOnline
                      ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                      : "border border-slate-600 text-slate-300"
                  }`}
                >
                  <MessageCircle className="h-4 w-4" />
                  {supportOnline ? "Support online" : "Support offline"}
                </div>
                <button className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-[11px]">
                  Contact support
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {FAQ_ITEMS.map((item) => {
                  const open = faqOpen === item.question;
                  return (
                    <div
                      key={item.question}
                      className="rounded-xl border border-white/10 bg-slate-900/80"
                    >
                      <button
                        type="button"
                        onClick={() => setFaqOpen(open ? null : item.question)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] font-semibold text-slate-200"
                      >
                        {item.question}
                        <span>{open ? "−" : "+"}</span>
                      </button>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="px-3 pb-3 text-[11px] text-slate-300"
                          >
                            {item.answer}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="grid gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-lg md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-200">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-teal-500/20 p-3">
                <Home className="h-6 w-6 text-teal-200" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Navigation & layout</h3>
                <p className="text-[11px] text-slate-300">
                  Sticky bottom nav keeps core flows one tap away.
                </p>
              </div>
            </div>
            <nav className="mt-4 grid grid-cols-5 gap-2 text-[11px]">
              {[
                { label: "Home", icon: Home },
                { label: "Plans", icon: Star },
                { label: "Dashboard", icon: TrendingUp },
                { label: "Rewards", icon: Gift },
                { label: "Support", icon: MessageCircle },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-slate-900/70 p-3"
                >
                  <item.icon className="h-4 w-4 text-slate-100" />
                  <span>{item.label}</span>
                </div>
              ))}
            </nav>
            <div className="mt-4 flex items-center justify-between">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-4 py-2 text-sm font-semibold text-slate-950"
              >
                <Star className="h-4 w-4" /> Subscribe now
              </motion.button>
              <motion.button
                whileHover={{ rotate: 12 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDarkMode((mode) => !mode)}
                className="rounded-full border border-white/20 px-3 py-1 text-[11px]"
              >
                {darkMode ? "Dark mode" : "Light mode"}
              </motion.button>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              UX tip: keep navigation to 4–5 items to maintain clarity inside
              Telegram.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-200">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-500/20 p-3">
                <ShieldCheck className="h-6 w-6 text-emerald-200" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Trust & security</h3>
                <p className="text-[11px] text-slate-300">
                  Reassure users that funds and tokens are safe.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
                <div>
                  <div className="text-[11px] uppercase text-emerald-200">
                    Verified wallet
                  </div>
                  <div className="font-mono text-sm">UQD1a…8X2Z</div>
                </div>
                <Shield className="h-6 w-6 text-emerald-200" />
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3">
                <div className="text-[11px] uppercase text-slate-400">
                  Audit & transparency
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  Latest burn tx: #A91B3F
                </div>
                <a
                  href="https://tonscan.org/tx/A91B3F"
                  className="mt-1 inline-flex items-center gap-1 text-[11px] text-sky-300 underline"
                >
                  View on TONscan
                </a>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3">
                <div className="text-[11px] uppercase text-slate-400">
                  Safety checks
                </div>
                <p className="mt-1 text-[11px] text-slate-300">
                  Confirmation dialogs fire before unstake or withdrawal actions
                  so nothing moves without explicit approval.
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              UX tip: micro-interactions like glowing buttons and card tilts add
              delight without sacrificing clarity.
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
