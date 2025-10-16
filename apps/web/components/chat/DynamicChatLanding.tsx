"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  Brain,
  GraduationCap,
  MessageSquareText,
  PieChart,
  Radar,
  ShieldCheck,
  Timer,
} from "lucide-react";

import {
  Button as DynamicButton,
  Card,
  Column,
  Heading,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import { DynamicCommandBar } from "@/components/navigation/DynamicCommandBar";
import {
  NewTabAnnouncement,
  VisuallyHidden,
} from "@/components/ui/accessibility-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ToolWorkspaceLayout } from "@/components/workspaces/ToolWorkspaceLayout";
import { AdminGate } from "@/components/admin/AdminGate";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";

const DynamicChat = dynamic(
  () => import("@/components/tools/DynamicChat").then((mod) => mod.DynamicChat),
  {
    loading: () => (
      <LoadingPanel
        title="Securing Dynamic Chat"
        description="Verifying admin credentials and preparing the live workspace."
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
        title="Loading market intelligence"
        description="Fetching the latest session review and compliance notes."
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
        title="Preparing signal telemetry"
        description="Streaming desk alerts and automation health checks."
      />
    ),
  },
);

type SessionSummary = {
  label: string;
  metric: string;
  description: string;
  icon: LucideIcon;
};

type WorkflowAction = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

type AuditStatus = "ready" | "attention" | "issue" | "loading";

type AuditItem = {
  label: string;
  summary: string;
  detail?: string;
  href?: string;
  status: AuditStatus;
  statusLabel?: string;
  actionLabel?: string;
};

type AuditGroup = {
  id: string;
  title: string;
  description: string;
  items: AuditItem[];
};

type PlatformSupportEvidenceLink = {
  href: string;
  label: string;
};

type PlatformSupportItem = {
  label: string;
  status: string;
  evidence?: PlatformSupportEvidenceLink;
};

type PlatformSupportCategory = {
  id: string;
  title: string;
  items: PlatformSupportItem[];
};

const STATUS_VARIANTS: Record<
  AuditStatus,
  { label: string; className: string; dotClass: string }
> = {
  ready: {
    label: "Live",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    dotClass: "bg-emerald-400",
  },
  attention: {
    label: "Needs attention",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    dotClass: "bg-amber-400",
  },
  issue: {
    label: "Issue",
    className: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    dotClass: "bg-rose-400",
  },
  loading: {
    label: "Loading",
    className: "border-sky-500/25 bg-sky-500/10 text-sky-400",
    dotClass: "bg-sky-400",
  },
};

const SESSION_SUMMARY: SessionSummary[] = [
  {
    label: "Automation copilots",
    metric: "3 live",
    description: "Routing trade, treasury, and compliance guardrails.",
    icon: Brain,
  },
  {
    label: "Security posture",
    metric: "Multisig enforced",
    description: "TON hardware approvals locked behind human oversight.",
    icon: ShieldCheck,
  },
  {
    label: "Response latency",
    metric: "120ms median",
    description: "Streaming inference windows tuned for desk execution.",
    icon: Timer,
  },
];

const WORKFLOW_ACTIONS: WorkflowAction[] = [
  {
    label: "Chat workspace",
    description:
      "Launch the live copilot lane with session transcripts and guardrails.",
    href: "#chat-workspace",
    icon: MessageSquareText,
  },
  {
    label: "Market review",
    description:
      "Open the market intelligence feed and replace hardcoded snapshots.",
    href: "/tools/dynamic-market-review",
    icon: Radar,
  },
  {
    label: "Investor desk",
    description:
      "Balance allocations, readiness, and approvals before trading.",
    href: "/tools/dynamic-portfolio",
    icon: PieChart,
  },
  {
    label: "Trade & learn",
    description:
      "Review playbooks, lessons, and automation recipes side-by-side.",
    href: "/tools/dynamic-trade-and-learn",
    icon: GraduationCap,
  },
];

const PRIMARY_WORKFLOW_SCROLLER_CLASSES =
  "grid auto-cols-[minmax(260px,1fr)] grid-flow-col items-stretch overflow-x-auto gap-4 px-6 pb-5 scroll-px-6 [scrollbar-width:none] [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden sm:auto-cols-[minmax(0,1fr)] sm:grid-flow-row sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-4 sm:pb-0 sm:scroll-px-4 xl:grid-cols-3 2xl:px-8 2xl:scroll-px-8";

const FALLBACK_WORKFLOW_SCROLLER_CLASSES =
  "grid auto-cols-[minmax(220px,1fr)] grid-flow-col items-stretch overflow-x-auto gap-3 px-6 pb-4 scroll-px-6 [scrollbar-width:none] [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden sm:auto-cols-[minmax(0,1fr)] sm:grid-flow-row sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-4 sm:pb-0 sm:scroll-px-4 xl:grid-cols-3 2xl:px-8 2xl:scroll-px-8";

const PLATFORM_SUPPORT: PlatformSupportCategory[] = [
  {
    id: "devices",
    title: "Devices",
    items: [
      {
        label: "Desktop & laptop",
        status: "Validated in Feb 2025 desk regression run.",
        evidence: {
          href: "/blog/device-validation-log#desktop-validation",
          label: "Regression log",
        },
      },
      {
        label: "Tablet",
        status: "Responsive layout reviewed with Retina iPad screenshots.",
        evidence: {
          href: "/blog/device-validation-log#tablet-review",
          label: "Screenshot set",
        },
      },
      {
        label: "Mobile",
        status: "Telegram mini app verified; responsive shell in guided beta.",
        evidence: {
          href: "/blog/device-validation-log#mobile-session",
          label: "Mobile walkthrough",
        },
      },
    ],
  },
  {
    id: "screens",
    title: "Screen widths",
    items: [
      {
        label: "≥1440px",
        status:
          "Primary command center baseline; includes ultrawide screenshots.",
        evidence: {
          href: "/blog/device-validation-log#wide-monitor",
          label: "Visual proof",
        },
      },
      {
        label: "1024–1439px",
        status: "Desk mode exercises recorded in QA replay.",
        evidence: {
          href: "/blog/device-validation-log#desktop-replay",
          label: "QA replay",
        },
      },
      {
        label: "≤768px",
        status: "Mini app shell monitored; awaiting automated smoke coverage.",
        evidence: {
          href: "/blog/device-validation-log#mini-app",
          label: "Mini app notes",
        },
      },
    ],
  },
  {
    id: "os",
    title: "Operating systems",
    items: [
      {
        label: "macOS & Windows",
        status: "Regression suite green on Ventura 14 & Windows 11.",
        evidence: {
          href: "/blog/device-validation-log#desktop-validation",
          label: "Test matrix",
        },
      },
      {
        label: "iOS & iPadOS",
        status: "Manual QA with Safari & Stage Manager sign-off.",
        evidence: {
          href: "/blog/device-validation-log#tablet-review",
          label: "QA summary",
        },
      },
      {
        label: "Android",
        status:
          "Pixel and Samsung manual checks; telemetry automation in flight.",
        evidence: {
          href: "/blog/device-validation-log#mobile-session",
          label: "Device log",
        },
      },
    ],
  },
];

function ChatFallback({
  onAnchorNavigate,
}: {
  onAnchorNavigate?: (hash: string) => void;
}) {
  return (
    <Card
      as="section"
      padding="32"
      radius="xl"
      gap="16"
      className="shadow-xl shadow-primary/10"
      aria-labelledby="dynamic-chat-auth-heading"
    >
      <Column gap="16">
        <Row gap="12" vertical="center">
          <Tag
            size="s"
            background="brand-alpha-weak"
            border="brand-alpha-medium"
          >
            Dynamic chat access
          </Tag>
          <Tag
            size="s"
            background="neutral-alpha-weak"
            border="neutral-alpha-medium"
          >
            TON verified
          </Tag>
        </Row>
        <Column gap="12">
          <Heading
            id="dynamic-chat-auth-heading"
            variant="heading-strong-m"
          >
            Authenticate to launch Dynamic Chat
          </Heading>
          <Text
            variant="body-default-m"
            onBackground="neutral-weak"
            id="dynamic-chat-auth-description"
          >
            Connect your TON-ready Telegram admin session to orchestrate Dynamic
            AI, AGI, and AGS copilots directly from the chat control tower. Once
            authenticated you can stream market reviews, trade signals, and
            automation routes in real time.
          </Text>
        </Column>
        <Row gap="12" wrap>
          <DynamicButton
            size="s"
            variant="secondary"
            href="https://t.me/DynamicCapitalBot/app"
            target="_blank"
            rel="noreferrer noopener"
            suffixIcon="arrowUpRight"
            aria-describedby="dynamic-chat-auth-description"
          >
            Open Dynamic Capital mini app
            <VisuallyHidden>(Opens in a new tab)</VisuallyHidden>
          </DynamicButton>
          <DynamicButton
            size="s"
            variant="tertiary"
            href="/support"
            aria-describedby="dynamic-chat-auth-description"
          >
            Contact the TON desk
          </DynamicButton>
        </Row>
        <ul
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          aria-label="Current session guardrails"
        >
          {SESSION_SUMMARY.map((item) => {
            const labelId = createAccessibleId("fallback-summary", item.label);
            const metricId = `${labelId}-metric`;
            const descriptionId = `${labelId}-description`;

            return (
              <li
                key={item.label}
                className="flex items-start gap-3 rounded-2xl border border-dashed border-primary/25 bg-background/60 p-4"
                aria-labelledby={`${labelId} ${metricId}`}
                aria-describedby={descriptionId}
              >
                <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="space-y-1">
                  <Text
                    id={labelId}
                    variant="label-default-xs"
                    className="uppercase tracking-[0.24em] text-muted-foreground"
                  >
                    {item.label}
                  </Text>
                  <Heading id={metricId} variant="heading-strong-xs">
                    {item.metric}
                  </Heading>
                  <Text
                    id={descriptionId}
                    variant="body-default-xs"
                    onBackground="neutral-weak"
                  >
                    {item.description}
                  </Text>
                </div>
              </li>
            );
          })}
        </ul>
        <nav aria-label="Workspace quick actions">
          <ul
            className={`${FALLBACK_WORKFLOW_SCROLLER_CLASSES} scroll-ml-6 scroll-mr-6 snap-x snap-mandatory snap-always [mask-image:linear-gradient(90deg,transparent,black_18%,black_82%,transparent)] sm:scroll-ml-4 sm:scroll-mr-4 sm:snap-none sm:[mask-image:none]`}
          >
            {WORKFLOW_ACTIONS.map((action) => {
              const descriptionId = createAccessibleId(
                "fallback-action",
                action.label,
              );
              const isAnchorLink = action.href.startsWith("#");

              return (
                <li
                  key={action.href}
                  className="list-none min-w-0 snap-start"
                >
                  <DynamicButton
                    size="s"
                    variant="tertiary"
                    href={isAnchorLink ? undefined : action.href}
                    onClick={isAnchorLink
                      ? () => onAnchorNavigate?.(action.href)
                      : undefined}
                    type={isAnchorLink ? "button" : undefined}
                    suffixIcon="arrowUpRight"
                    aria-describedby={descriptionId}
                    fillWidth
                  >
                    {action.label}
                    <VisuallyHidden id={descriptionId}>
                      {action.description}
                    </VisuallyHidden>
                  </DynamicButton>
                </li>
              );
            })}
          </ul>
        </nav>
        <Card
          as="section"
          padding="16"
          radius="l"
          className="border border-dashed border-primary/30 bg-primary/5"
          aria-live="polite"
        >
          <Text variant="body-default-xs" onBackground="neutral-weak">
            Need access? Ask your Dynamic Capital admin lead to provision TON
            multisig credentials or a session token. Every chat session is
            logged for compliance and automation guardrails.
          </Text>
        </Card>
      </Column>
    </Card>
  );
}

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
    <Card
      as="section"
      padding="20"
      radius="xl"
      gap="12"
      className="border border-dashed border-primary/20 bg-background/70"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Column gap="12">
        <Heading variant="heading-strong-xs">{title}</Heading>
        <Text variant="body-default-xs" onBackground="neutral-weak">
          {description}
        </Text>
        <div className="space-y-2" aria-hidden>
          <Skeleton height="s" />
          <Skeleton height="s" className="w-3/4" />
          <Skeleton height="s" className="w-2/3" />
        </div>
      </Column>
    </Card>
  );
}

function AuditStatusBadge({
  status,
  label,
}: {
  status: AuditStatus;
  label?: string;
}) {
  const variant = STATUS_VARIANTS[status];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${variant.className}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${variant.dotClass} ${
          status === "loading" ? "animate-pulse" : ""
        }`}
        aria-hidden
      />
      {label ?? variant.label}
    </span>
  );
}

function AuditItemRow({ item }: { item: AuditItem }) {
  const isExternal = item.href ? item.href.startsWith("http") : false;
  const baseId = createAccessibleId("audit-item", item.label);
  const labelId = `${baseId}-label`;
  const summaryId = `${baseId}-summary`;
  const detailId = item.detail ? `${baseId}-detail` : undefined;
  const descriptionIds = [summaryId, detailId].filter(Boolean).join(" ");
  const actionText = item.actionLabel ?? `Open ${item.label}`;

  return (
    <li
      className="list-none rounded-2xl border border-border/60 bg-background/90 p-4 shadow-sm"
      aria-labelledby={labelId}
      aria-describedby={descriptionIds}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p id={labelId} className="text-sm font-semibold text-foreground">
            {item.label}
          </p>
          <p id={summaryId} className="text-xs text-muted-foreground">
            {item.summary}
          </p>
          {item.detail
            ? (
              <p id={detailId} className="text-xs text-muted-foreground/80">
                {item.detail}
              </p>
            )
            : null}
        </div>
        <AuditStatusBadge status={item.status} label={item.statusLabel} />
      </div>
      {item.href
        ? (
          <div className="mt-3">
            <DynamicButton
              size="s"
              variant="tertiary"
              href={item.href}
              suffixIcon={isExternal ? "arrowUpRight" : undefined}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noreferrer noopener" : undefined}
              aria-describedby={descriptionIds}
            >
              {actionText}
              {isExternal ? <NewTabAnnouncement /> : null}
            </DynamicButton>
          </div>
        )
        : null}
    </li>
  );
}

function AuditGroupSection({ group }: { group: AuditGroup }) {
  return (
    <section
      key={group.id}
      aria-labelledby={`audit-${group.id}-heading`}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Heading id={`audit-${group.id}-heading`} variant="heading-strong-xs">
          {group.title}
        </Heading>
        <Text variant="body-default-xs" onBackground="neutral-weak">
          {group.description}
        </Text>
      </div>
      <ul className="space-y-3">
        {group.items.map((item) => (
          <AuditItemRow key={`${group.id}-${item.label}`} item={item} />
        ))}
      </ul>
    </section>
  );
}

function AuditOverview({ groups }: { groups: AuditGroup[] }) {
  return (
    <Card
      as="section"
      padding="24"
      radius="xl"
      gap="20"
      className="border border-border/60 bg-background/90 shadow-lg shadow-primary/10"
      aria-labelledby="workspace-audit-heading"
    >
      <Column gap="16">
        <Column gap="8">
          <Heading id="workspace-audit-heading" variant="heading-strong-s">
            Workspace audit
          </Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Track readiness signals across the workspace so live sessions stay
            clear, reliable, and well supported.
          </Text>
        </Column>
        <div className="grid gap-8 sm:gap-10 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <AuditGroupSection key={group.id} group={group} />
          ))}
        </div>
      </Column>
    </Card>
  );
}

function DeviceSupportCard() {
  return (
    <Card
      as="section"
      padding="24"
      radius="xl"
      gap="16"
      className="border border-border/60 bg-background/90 shadow-lg shadow-primary/10"
      aria-labelledby="device-support-heading"
    >
      <Column gap="16">
        <Column gap="8">
          <Heading id="device-support-heading" variant="heading-strong-s">
            Device, screen, and OS support
          </Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Operators can shift between desktop, tablet, and mobile hardware
            without losing workspace guardrails.
          </Text>
        </Column>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_SUPPORT.map((category) => (
            <div
              key={category.id}
              className="rounded-2xl border border-border/50 bg-background/80 p-4 shadow-sm"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                {category.title}
              </p>
              <ul className="mt-3 space-y-3">
                {category.items.map((item) => {
                  const isExternal = item.evidence?.href.startsWith("http");

                  return (
                    <li
                      key={item.label}
                      className="space-y-1 text-sm text-muted-foreground"
                    >
                      <p className="font-medium text-foreground">
                        {item.label}
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {item.status}
                      </p>
                      {item.evidence
                        ? (
                          <Link
                            href={item.evidence.href}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                            target={isExternal ? "_blank" : undefined}
                            rel={isExternal ? "noreferrer noopener" : undefined}
                          >
                            {item.evidence.label}
                            {isExternal
                              ? (
                                <>
                                  <ArrowUpRight
                                    className="h-3 w-3"
                                    aria-hidden
                                  />
                                  <NewTabAnnouncement />
                                </>
                              )
                              : null}
                          </Link>
                        )
                        : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Column>
    </Card>
  );
}

export function DynamicChatLanding() {
  const {
    loading: plansLoading,
    error: plansError,
    hasData: plansHasData,
  } = useSubscriptionPlans();

  const handleAnchorNavigation = useCallback((hash: string) => {
    if (typeof document === "undefined") {
      return;
    }

    const targetId = hash.startsWith("#") ? hash.slice(1) : hash;
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.hash = targetId;
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  const quickLinkAuditItems = useMemo<AuditItem[]>(() => {
    const status: AuditStatus = plansLoading
      ? "loading"
      : plansError
      ? "issue"
      : plansHasData
      ? "ready"
      : "attention";

    const vipDetail = plansError
      ? "Our pricing desk is recalibrating memberships right now. Message the concierge if you need a manual quote."
      : plansHasData
      ? "Fresh TON-denominated pricing is available for checkout."
      : "Pricing refresh is scheduled — tap support to join the priority list.";

    const vipItem: AuditItem = {
      label: "VIP plans",
      summary: plansLoading
        ? "Checking membership packages."
        : plansError
        ? "VIP pricing is temporarily offline."
        : plansHasData
        ? "Latest membership tiers are ready to review."
        : "Pricing update queued for the next refresh window.",
      detail: vipDetail,
      href: "/plans",
      status,
      statusLabel: status === "ready"
        ? "Live"
        : status === "issue"
        ? "Offline"
        : status === "loading"
        ? "Loading"
        : "Pending",
      actionLabel: "Review plans",
    };

    return [
      vipItem,
      {
        label: "Dynamic token",
        summary:
          "Tokenomics brief and staking walkthrough remain up to date for the TON community.",
        detail:
          "Governance, treasury, and staking docs publish alongside each TON update.",
        href: "/token",
        status: "ready",
        statusLabel: "Live",
        actionLabel: "Open token page",
      },
      {
        label: "Support",
        summary:
          "Concierge desk responds in under two minutes during trading hours.",
        detail:
          "Escalations route to Telegram with audit logging and human oversight.",
        href: "/support",
        status: "ready",
        statusLabel: "Live",
        actionLabel: "Contact support",
      },
    ];
  }, [plansError, plansHasData, plansLoading]);

  const auditGroups = useMemo<AuditGroup[]>(() => [
    {
      id: "workspace",
      title: "Workspace",
      description:
        "See how each lane is performing before you onboard teammates.",
      items: [
        {
          label: "Chat lane",
          summary:
            "Live transcripts, role tagging, and concierge escalation are active for trading sessions.",
          detail:
            "Messenger-style refinements land next; share preferences with the concierge to influence the rollout.",
          href: "#chat-workspace",
          status: "attention",
          statusLabel: "Enhancement scheduled",
          actionLabel: "Review chat workspace",
        },
        {
          label: "Market review",
          summary:
            "Latest published session notes are available while telemetry reconnects to live feeds.",
          detail:
            "Real-time dashboards return after the data pipeline maintenance window wraps.",
          href: "/tools/dynamic-market-review",
          status: "issue",
          statusLabel: "Under maintenance",
          actionLabel: "Open market review",
        },
        {
          label: "Investor desk",
          summary:
            "Allocation guardrails, readiness scoring, and TON treasury briefs are running smoothly.",
          detail:
            "We continue monitoring automations so approvals stay human-in-the-loop.",
          href: "/tools/dynamic-portfolio",
          status: "ready",
          statusLabel: "Live",
          actionLabel: "Open investor desk",
        },
        {
          label: "Trade & learn",
          summary:
            "Curriculum library and mentor playbooks are accessible; interactive progress tracking ships next.",
          detail:
            "Members can request early access to milestones and quizzes via the concierge.",
          href: "/tools/dynamic-trade-and-learn",
          status: "attention",
          statusLabel: "Improving",
          actionLabel: "Review trade & learn",
        },
      ],
    },
    {
      id: "quick-links",
      title: "Quick links",
      description: "Surface critical shortcuts for membership and docs.",
      items: quickLinkAuditItems,
    },
    {
      id: "connect",
      title: "Connect",
      description: "Keep concierge support one tap away.",
      items: [
        {
          label: "Telegram",
          summary:
            "Primary concierge and automation escalation lane is available around the clock.",
          detail:
            "Mini app exposes signals, VIP sync, and desk analytics for operators.",
          href: "https://t.me/DynamicCapitalBot",
          status: "ready",
          statusLabel: "Live",
          actionLabel: "Open Telegram",
        },
      ],
    },
  ], [quickLinkAuditItems]);

  return (
    <ToolWorkspaceLayout
      routeId="dynamic-chat-hub"
      commandBar={<DynamicCommandBar />}
      contentClassName="pb-24"
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] 2xl:grid-cols-[minmax(0,1.28fr)_minmax(0,0.72fr)]">
        <Column
          gap="20"
          className="rounded-[32px] border border-border/50 bg-background/85 p-4 shadow-xl shadow-primary/10 backdrop-blur sm:p-6"
        >
          <section
            id="chat-workspace"
            aria-labelledby="dynamic-chat-overview-heading"
            className="relative overflow-hidden rounded-3xl border border-primary/20 bg-background/90 p-5 sm:p-7 lg:p-8"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(110,80,255,0.18),transparent_70%)]" />
            <div className="relative z-10 space-y-5 sm:space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <p
                    id="dynamic-chat-overview-label"
                    className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground"
                  >
                    Dynamic chat control center
                  </p>
                  <h3
                    id="dynamic-chat-overview-heading"
                    className="text-2xl font-semibold sm:text-3xl"
                  >
                    Coordinate copilots, signals, and oversight
                  </h3>
                </div>
                <div
                  className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <VisuallyHidden>Status:</VisuallyHidden>
                  <span
                    className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary"
                    aria-hidden
                  />
                  <span>Live sync</span>
                </div>
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                Operate the Dynamic Capital command center without leaving the
                workspace. Automation routes, compliance guardrails, and
                human-in-the-loop approvals stay aligned with every chat
                session.
              </p>
              <ul
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                aria-label="Dynamic chat session metrics"
              >
                {SESSION_SUMMARY.map((item) => {
                  const labelId = createAccessibleId(
                    "primary-summary",
                    item.label,
                  );
                  const metricId = `${labelId}-metric`;
                  const descriptionId = `${labelId}-description`;

                  return (
                    <li
                      key={item.label}
                      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
                      aria-labelledby={`${labelId} ${metricId}`}
                      aria-describedby={descriptionId}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        style={{
                          background:
                            "radial-gradient(circle at top, rgba(110,80,255,0.14), transparent 65%)",
                        }}
                      />
                      <div className="relative z-10 flex items-start gap-3">
                        <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <item.icon className="h-5 w-5" aria-hidden />
                        </span>
                        <div className="space-y-1">
                          <p
                            id={labelId}
                            className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground/80"
                          >
                            {item.label}
                          </p>
                          <p
                            id={metricId}
                            className="text-base font-semibold text-foreground"
                          >
                            {item.metric}
                          </p>
                          <p
                            id={descriptionId}
                            className="text-xs text-muted-foreground"
                          >
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
          <div className="relative overflow-hidden rounded-[28px] border border-border/60 bg-background/90 p-1 shadow-xl shadow-primary/15">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(110,80,255,0.2),transparent_75%)]" />
            <div className="relative z-10 h-full rounded-[26px] bg-background/95 p-3 sm:p-4 lg:p-6">
              <AdminGate
                fallback={
                  <ChatFallback onAnchorNavigate={handleAnchorNavigation} />
                }
              >
                <DynamicChat />
              </AdminGate>
            </div>
          </div>
          <nav aria-label="Dynamic workflow shortcuts">
            <ul
              className={`${PRIMARY_WORKFLOW_SCROLLER_CLASSES} scroll-ml-6 scroll-mr-6 snap-x snap-mandatory snap-always [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)] sm:scroll-ml-4 sm:scroll-mr-4 sm:snap-none sm:[mask-image:none]`}
            >
              {WORKFLOW_ACTIONS.map((action) => {
                const descriptionId = createAccessibleId(
                  "primary-action",
                  action.label,
                );
                const isAnchorLink = action.href.startsWith("#");

                return (
                  <li
                    key={action.href}
                    className="list-none min-w-0 snap-start"
                  >
                    {isAnchorLink
                      ? (
                        <button
                          type="button"
                          onClick={() => handleAnchorNavigation(action.href)}
                          aria-describedby={descriptionId}
                          className="group relative flex h-full w-full flex-col gap-6 overflow-hidden rounded-2xl border border-border/60 bg-background/85 p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/8 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/70"
                        >
                          <span
                            className="pointer-events-none absolute inset-0 rounded-[22px] bg-[radial-gradient(circle_at_top,_rgba(110,80,255,0.22),transparent_68%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                            aria-hidden
                          />
                          <div className="relative z-10 flex items-start gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <action.icon className="h-5 w-5" aria-hidden />
                            </span>
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-foreground">
                                {action.label}
                              </p>
                              <p
                                id={descriptionId}
                                className="text-xs text-muted-foreground"
                              >
                                {action.description}
                              </p>
                            </div>
                          </div>
                          <div
                            className="relative z-10 flex items-center justify-between text-xs font-medium text-muted-foreground"
                            aria-hidden
                          >
                            <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-muted-foreground/80">
                              Navigate
                              <span
                                className="inline-flex h-1.5 w-1.5 rounded-full bg-primary/60"
                                aria-hidden
                              />
                            </span>
                            <ArrowUpRight
                              className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                              aria-hidden
                            />
                          </div>
                        </button>
                      )
                      : (
                        <Link
                          href={action.href}
                          prefetch={false}
                          aria-describedby={descriptionId}
                          className="group relative flex h-full flex-col gap-6 overflow-hidden rounded-2xl border border-border/60 bg-background/85 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/8 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/70"
                        >
                          <span
                            className="pointer-events-none absolute inset-0 rounded-[22px] bg-[radial-gradient(circle_at_top,_rgba(110,80,255,0.22),transparent_68%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                            aria-hidden
                          />
                          <div className="relative z-10 flex items-start gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <action.icon className="h-5 w-5" aria-hidden />
                            </span>
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-foreground">
                                {action.label}
                              </p>
                              <p
                                id={descriptionId}
                                className="text-xs text-muted-foreground"
                              >
                                {action.description}
                              </p>
                            </div>
                          </div>
                          <div
                            className="relative z-10 flex items-center justify-between text-xs font-medium text-muted-foreground"
                            aria-hidden
                          >
                            <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-muted-foreground/80">
                              Navigate
                              <span
                                className="inline-flex h-1.5 w-1.5 rounded-full bg-primary/60"
                                aria-hidden
                              />
                            </span>
                            <ArrowUpRight
                              className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                              aria-hidden
                            />
                          </div>
                        </Link>
                      )}
                  </li>
                );
              })}
            </ul>
          </nav>
          <Column gap="12">
            <AuditOverview groups={auditGroups} />
            <DeviceSupportCard />
          </Column>
        </Column>
        <Column gap="20">
          <Card
            as="section"
            padding="24"
            radius="xl"
            gap="20"
            className="border border-neutral-alpha-medium/70 shadow-lg shadow-primary/10"
            aria-labelledby="live-market-intelligence-heading"
            aria-describedby="live-market-intelligence-description"
          >
            <Column gap="16">
              <Row gap="8" vertical="center" wrap>
                <Tag
                  size="s"
                  background="accent-alpha-weak"
                  border="accent-alpha-medium"
                >
                  Market telemetry
                </Tag>
                <Tag
                  size="s"
                  background="neutral-alpha-weak"
                  border="neutral-alpha-medium"
                >
                  TON aware
                </Tag>
              </Row>
              <Column gap="12">
                <Heading
                  id="live-market-intelligence-heading"
                  variant="heading-strong-s"
                >
                  Live market intelligence
                </Heading>
                <Text
                  id="live-market-intelligence-description"
                  variant="body-default-s"
                  onBackground="neutral-weak"
                >
                  Market reviews, currency strength, and automation alerts
                  update here so you can act without leaving the chat workspace.
                </Text>
              </Column>
              <div aria-live="polite" aria-atomic="false">
                <SignalsWidget />
              </div>
            </Column>
          </Card>
          <Card
            as="section"
            gap="0"
            radius="xl"
            className="overflow-hidden border border-neutral-alpha-medium shadow-lg shadow-primary/10"
            aria-labelledby="dynamic-market-snapshot"
            id="market-review"
          >
            <DynamicMarketReview />
          </Card>
        </Column>
      </div>
    </ToolWorkspaceLayout>
  );
}

export default DynamicChatLanding;
