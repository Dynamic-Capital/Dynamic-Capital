import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  Brain,
  Layers,
  MessageSquareText,
  Radar,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button as DynamicButton } from "@/components/dynamic-ui-system";
import { DynamicCommandBar } from "@/components/navigation/DynamicCommandBar";
import {
  NewTabAnnouncement,
  VisuallyHidden,
} from "@/components/ui/accessibility-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ToolWorkspaceLayout } from "@/components/workspaces/ToolWorkspaceLayout";
import { AdminGate } from "@/components/admin/AdminGate";
import { ShortcutScrollButton } from "./ShortcutScrollButton";

const DynamicChat = dynamic(
  () => import("@/components/tools/DynamicChat").then((mod) => mod.DynamicChat),
  {
    loading: () => (
      <LoadingPanel
        title="Preparing Dynamic Chat"
        description="Authenticating operators and restoring the live workspace."
      />
    ),
    ssr: false,
  },
);

const DynamicMarketReview = dynamic(
  () =>
    import("@/components/tools/DynamicMarketReview").then(
      (mod) => mod.DynamicMarketReview,
    ),
  {
    loading: () => (
      <LoadingPanel
        title="Syncing market workspace"
        description="Fetching macro notes and currency telemetry."
      />
    ),
  },
);

const SignalsWidget = dynamic(
  () =>
    import("@/components/trading/SignalsWidget").then(
      (mod) => mod.SignalsWidget,
    ),
  {
    loading: () => (
      <LoadingPanel
        title="Calibrating signal feed"
        description="Streaming desk alerts and automation health checks."
      />
    ),
  },
);

type Highlight = {
  label: string;
  metric: string;
  description: string;
  icon: LucideIcon;
};

type Shortcut = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
};

type FocusArea = {
  title: string;
  description: string;
  detail: string;
  icon: LucideIcon;
};

type SupportLink = {
  label: string;
  description: string;
  href: string;
  external?: boolean;
};

const PANEL_BASE_CLASS =
  "relative overflow-hidden rounded-[30px] border border-border/40 bg-white/70 p-6 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.65)] backdrop-blur-xl transition-transform duration-300 dark:bg-slate-950/70";
const PANEL_ACCENT_LAYER =
  "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),transparent_70%)] dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),transparent_75%)]";
const CARD_CLASS =
  "group relative overflow-hidden rounded-[22px] border border-border/40 bg-white/70 p-5 shadow-[0_24px_45px_-36px_rgba(15,23,42,0.45)] backdrop-blur-lg dark:bg-slate-950/70";

const HIGHLIGHTS: Highlight[] = [
  {
    label: "Automation copilots",
    metric: "3 live",
    description: "Trade, treasury, and compliance orchestrators stay paired.",
    icon: Sparkles,
  },
  {
    label: "Security posture",
    metric: "Multisig",
    description: "Hardware approvals and TON custody remain enforced.",
    icon: ShieldCheck,
  },
  {
    label: "Response latency",
    metric: "120 ms",
    description: "Glass-mode chat replies stream with desk-ready timing.",
    icon: Timer,
  },
];

const SHORTCUTS: Shortcut[] = [
  {
    label: "Chat workspace",
    description: "Launch transcripts, guardrails, and approval overlays.",
    href: "#live-workspace",
    icon: MessageSquareText,
  },
  {
    label: "Market review",
    description: "Open market telemetry without leaving the control tower.",
    href: "/tools/dynamic-market-review",
    icon: Radar,
    external: false,
  },
  {
    label: "Signals feed",
    description: "Follow curated TON and FX alerts in real time.",
    href: "#signal-telemetry",
    icon: Layers,
  },
  {
    label: "Investor desk",
    description: "Monitor treasury guardrails and readiness scoring.",
    href: "/tools/dynamic-portfolio",
    icon: ShieldCheck,
  },
];

const FOCUS_AREAS: FocusArea[] = [
  {
    title: "Live oversight",
    description:
      "Session markers, automation status, and tone cues stay synchronized across devices.",
    detail: "Adaptive layout echoes iOS glass surfaces with subtle depth.",
    icon: Brain,
  },
  {
    title: "Market workspace",
    description:
      "Macro dashboards, liquidity maps, and compliance notes update in place.",
    detail: "Optimized for thumb-driven navigation and quick triage.",
    icon: Radar,
  },
  {
    title: "Signals & automations",
    description:
      "FX, TON, and risk automations publish their health in a single view.",
    detail: "Minimal cards highlight only actionable telemetry.",
    icon: Layers,
  },
  {
    title: "Concierge lanes",
    description: "Access the Telegram concierge or docs within two taps.",
    detail: "Transparent surfaces keep context while modals float above.",
    icon: MessageSquareText,
  },
];

const SUPPORT_LINKS: SupportLink[] = [
  {
    label: "Telegram concierge",
    description:
      "Escalate automation issues instantly with the TON-native desk.",
    href: "https://t.me/DynamicCapitalBot",
    external: true,
  },
  {
    label: "Workspace docs",
    description:
      "Review the minimal runbook for launch criteria and governance.",
    href: "/docs/workspaces/dynamic-chat",
  },
];

function createAccessibleId(prefix: string, label: string) {
  return `${prefix}-${label}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function LoadingPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      className={`${CARD_CLASS} min-h-[180px] border-dashed border-border/50`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="space-y-2" aria-hidden>
          <Skeleton height="s" />
          <Skeleton height="s" className="w-3/4" />
          <Skeleton height="s" className="w-2/3" />
        </div>
      </div>
    </div>
  );
}

function ShortcutCard({ shortcut }: { shortcut: Shortcut }) {
  const descriptionId = createAccessibleId("shortcut", shortcut.label);
  const content = (
    <div
      className={`${CARD_CLASS} h-full transition-transform duration-300 hover:-translate-y-1`}
    >
      <div className="relative z-10 flex h-full flex-col gap-4">
        <div className="flex items-center gap-3 text-sm font-medium text-foreground">
          <shortcut.icon className="h-5 w-5 text-primary" aria-hidden />
          {shortcut.label}
        </div>
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {shortcut.description}
        </p>
        <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-primary">
          <span>Open</span>
          <ArrowRight className="h-4 w-4" aria-hidden />
        </div>
      </div>
      <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </div>
  );

  if (shortcut.href.startsWith("#")) {
    return (
      <ShortcutScrollButton
        href={shortcut.href}
        aria-describedby={descriptionId}
        className="group w-full text-left"
      >
        {content}
      </ShortcutScrollButton>
    );
  }

  return (
    <Link
      href={shortcut.href}
      prefetch={false}
      aria-describedby={descriptionId}
      className="group block"
      target={shortcut.external ? "_blank" : undefined}
      rel={shortcut.external ? "noreferrer noopener" : undefined}
    >
      {content}
      {shortcut.external ? <NewTabAnnouncement /> : null}
    </Link>
  );
}

function SupportLinkCard({ link }: { link: SupportLink }) {
  return (
    <Link
      href={link.href}
      prefetch={false}
      target={link.external ? "_blank" : undefined}
      rel={link.external ? "noreferrer noopener" : undefined}
      className="group flex flex-col gap-2 rounded-[20px] border border-border/40 bg-white/70 p-4 text-left shadow-[0_18px_40px_-36px_rgba(15,23,42,0.45)] backdrop-blur-lg transition-transform duration-300 hover:-translate-y-1 dark:bg-slate-950/70"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span>{link.label}</span>
        <ArrowRight className="h-4 w-4 text-primary" aria-hidden />
        {link.external ? <NewTabAnnouncement /> : null}
      </div>
      <p className="text-sm text-muted-foreground">{link.description}</p>
    </Link>
  );
}

function HighlightCard({ highlight }: { highlight: Highlight }) {
  const labelId = createAccessibleId("highlight", highlight.label);
  const metricId = `${labelId}-metric`;
  const descriptionId = `${labelId}-description`;

  return (
    <li
      className="flex flex-col gap-3 rounded-[22px] border border-border/40 bg-white/75 p-5 shadow-[0_24px_45px_-38px_rgba(15,23,42,0.55)] backdrop-blur-xl dark:bg-slate-950/70"
      aria-labelledby={`${labelId} ${metricId}`}
      aria-describedby={descriptionId}
    >
      <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <highlight.icon className="h-4 w-4" aria-hidden />
        </span>
        <span id={labelId}>{highlight.label}</span>
      </div>
      <p id={metricId} className="text-2xl font-semibold text-foreground">
        {highlight.metric}
      </p>
      <p id={descriptionId} className="text-sm text-muted-foreground">
        {highlight.description}
      </p>
    </li>
  );
}

function FocusAreaCard({ focus }: { focus: FocusArea }) {
  return (
    <div className={`${CARD_CLASS} h-full`}>
      <div className="relative z-10 flex h-full flex-col gap-4">
        <div className="flex items-center gap-3 text-sm font-semibold text-foreground">
          <focus.icon className="h-5 w-5 text-primary" aria-hidden />
          {focus.title}
        </div>
        <p className="text-sm text-muted-foreground">{focus.description}</p>
        <p className="text-sm text-muted-foreground/80">{focus.detail}</p>
      </div>
    </div>
  );
}

function DynamicChatLanding() {
  return (
    <ToolWorkspaceLayout
      routeId="dynamic-chat-hub"
      commandBar={<DynamicCommandBar />}
      contentClassName="pb-24"
    >
      <div className="flex flex-col gap-16">
        <section className={`${PANEL_BASE_CLASS} px-6 py-10 sm:px-10 sm:py-14`}>
          <div className={PANEL_ACCENT_LAYER} />
          <div className="relative z-10 flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-6 max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground/70">
                Dynamic chat control tower
              </p>
              <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
                Minimal glass workspace for decisive operators
              </h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                Coordinate copilots, approvals, and market telemetry in a
                refined, iOS-inspired layout that keeps focus on the actions
                that matter.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <DynamicButton
                  size="m"
                  variant="primary"
                  href="/tools/dynamic-chat"
                >
                  Launch workspace
                </DynamicButton>
                <Link
                  href="#live-workspace"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
                >
                  Preview live session
                  <ArrowRight className="h-4 w-4" aria-hidden />
                  <VisuallyHidden>
                    Jump to the live workspace section
                  </VisuallyHidden>
                </Link>
              </div>
            </div>
            <ul
              className="grid gap-4 sm:grid-cols-3 lg:max-w-sm"
              aria-label="Dynamic chat workspace highlights"
            >
              {HIGHLIGHTS.map((highlight) => (
                <HighlightCard key={highlight.label} highlight={highlight} />
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {FOCUS_AREAS.map((focus) => (
            <FocusAreaCard key={focus.title} focus={focus} />
          ))}
        </section>

        <section
          className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)]"
          id="live-workspace"
        >
          <div className={`${PANEL_BASE_CLASS} p-4 sm:p-6`}>
            <div className={PANEL_ACCENT_LAYER} />
            <div className="relative z-10 flex h-full flex-col gap-5">
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
                <span className="flex items-center gap-2 rounded-full border border-border/50 bg-white/60 px-3 py-1 text-[11px] font-medium text-foreground/80 shadow-sm backdrop-blur dark:bg-slate-950/70">
                  <span
                    className="h-2 w-2 animate-pulse rounded-full bg-primary"
                    aria-hidden
                  />
                  Live sync
                </span>
                Dynamic chat session
              </div>
              <div className="flex-1 overflow-hidden rounded-[24px] border border-border/40 bg-white/60 p-2 shadow-inner backdrop-blur dark:bg-slate-950/70">
                <AdminGate
                  fallback={
                    <LoadingPanel
                      title="Authenticate to view"
                      description="Verify admin access to open Dynamic Chat."
                    />
                  }
                >
                  <div className="overflow-hidden rounded-[20px] border border-border/30 bg-background">
                    <DynamicChat />
                  </div>
                </AdminGate>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {SHORTCUTS.slice(0, 2).map((shortcut) => (
                  <ShortcutCard key={shortcut.label} shortcut={shortcut} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <section
              id="signal-telemetry"
              className={`${PANEL_BASE_CLASS} p-6`}
              aria-labelledby="signal-telemetry-heading"
            >
              <div className={PANEL_ACCENT_LAYER} />
              <div className="relative z-10 flex flex-col gap-4">
                <div className="space-y-2">
                  <p
                    id="signal-telemetry-heading"
                    className="text-sm font-semibold uppercase tracking-[0.26em] text-muted-foreground/70"
                  >
                    Signal telemetry
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    Desk alerts, minimal noise
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Monitor curated TON and FX triggers without leaving the
                    workspace shell.
                  </p>
                </div>
                <div
                  aria-live="polite"
                  aria-atomic="false"
                  className="rounded-[20px] border border-border/30 bg-background/80 p-3 shadow-inner"
                >
                  <SignalsWidget />
                </div>
              </div>
            </section>

            <section
              className={`${PANEL_BASE_CLASS} p-0`}
              aria-labelledby="market-review-heading"
            >
              <div className={PANEL_ACCENT_LAYER} />
              <div className="relative z-10 overflow-hidden rounded-[30px]">
                <div className="flex items-center justify-between px-6 pt-6">
                  <div>
                    <p
                      id="market-review-heading"
                      className="text-sm font-semibold uppercase tracking-[0.26em] text-muted-foreground/70"
                    >
                      Market workspace
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      Minimal macro surface
                    </p>
                  </div>
                  <DynamicButton
                    size="s"
                    variant="tertiary"
                    href="/tools/dynamic-market-review"
                    suffixIcon="arrowUpRight"
                  >
                    Open
                    <NewTabAnnouncement />
                  </DynamicButton>
                </div>
                <div className="mt-4 border-t border-border/30 bg-background/90 p-3">
                  <DynamicMarketReview />
                </div>
              </div>
            </section>

            <section
              className={`${PANEL_BASE_CLASS} p-6`}
              aria-labelledby="workspace-shortcuts-heading"
            >
              <div className={PANEL_ACCENT_LAYER} />
              <div className="relative z-10 flex flex-col gap-5">
                <div>
                  <p
                    id="workspace-shortcuts-heading"
                    className="text-sm font-semibold uppercase tracking-[0.26em] text-muted-foreground/70"
                  >
                    Quick access
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    Stay in the flow
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {SHORTCUTS.slice(2).map((shortcut) => (
                    <ShortcutCard key={shortcut.label} shortcut={shortcut} />
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>

        <section
          className={`${PANEL_BASE_CLASS} p-6 sm:p-8`}
          aria-labelledby="concierge-heading"
        >
          <div className={PANEL_ACCENT_LAYER} />
          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3">
              <p
                id="concierge-heading"
                className="text-sm font-semibold uppercase tracking-[0.26em] text-muted-foreground/70"
              >
                Concierge & docs
              </p>
              <h2 className="text-2xl font-semibold text-foreground">
                High-trust support, two taps away
              </h2>
              <p className="text-sm text-muted-foreground">
                Whether you need automation triage or policy confirmation, the
                concierge keeps the same calm, minimal rhythm as the workspace
                UI.
              </p>
            </div>
            <div className="grid gap-3 sm:w-80">
              {SUPPORT_LINKS.map((link) => (
                <SupportLinkCard key={link.label} link={link} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </ToolWorkspaceLayout>
  );
}

export { DynamicChatLanding };
export default DynamicChatLanding;
