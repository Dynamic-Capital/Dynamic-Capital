"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  Brain,
  LifeBuoy,
  NotebookPen,
  Route,
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
import { DynamicMarketReview } from "@/components/tools/DynamicMarketReview";
import { DynamicChat } from "@/components/tools/DynamicChat";
import { DynamicCommandBar } from "@/components/navigation/DynamicCommandBar";
import { ToolWorkspaceLayout } from "@/components/workspaces/ToolWorkspaceLayout";
import { AdminGate } from "@/components/admin/AdminGate";
import { SignalsWidget } from "@/components/trading/SignalsWidget";

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
    label: "Open automation routes",
    description: "Dispatch copilots or pause flows across desk accounts.",
    href: "/tools/dynamic-portfolio",
    icon: Route,
  },
  {
    label: "Sync desk handbook",
    description: "Keep operations and compliance guardrails aligned.",
    href: "/work",
    icon: NotebookPen,
  },
  {
    label: "Escalate to TON desk",
    description: "Engage human oversight for sensitive automation moves.",
    href: "/support",
    icon: LifeBuoy,
  },
];

const CHAT_FALLBACK = (
  <Card
    padding="32"
    radius="xl"
    gap="16"
    className="shadow-xl shadow-primary/10"
  >
    <Column gap="16">
      <Row gap="12" vertical="center">
        <Tag size="s" background="brand-alpha-weak" border="brand-alpha-medium">
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
        <Heading variant="heading-strong-m">
          Authenticate to launch Dynamic Chat
        </Heading>
        <Text variant="body-default-m" onBackground="neutral-weak">
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
          rel="noreferrer"
          suffixIcon="arrowUpRight"
        >
          Open Dynamic Capital mini app
        </DynamicButton>
        <DynamicButton size="s" variant="tertiary" href="/support">
          Contact the TON desk
        </DynamicButton>
      </Row>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {SESSION_SUMMARY.map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-3 rounded-2xl border border-dashed border-primary/25 bg-background/60 p-4"
          >
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <item.icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="space-y-1">
              <Text
                variant="label-default-xs"
                className="uppercase tracking-[0.24em] text-muted-foreground"
              >
                {item.label}
              </Text>
              <Heading variant="heading-strong-xs">{item.metric}</Heading>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {item.description}
              </Text>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {WORKFLOW_ACTIONS.map((action) => (
          <DynamicButton
            key={action.href}
            size="s"
            variant="tertiary"
            href={action.href}
            suffixIcon="arrowUpRight"
          >
            {action.label}
          </DynamicButton>
        ))}
      </div>
      <Card
        padding="16"
        radius="l"
        className="border border-dashed border-primary/30 bg-primary/5"
      >
        <Text variant="body-default-xs" onBackground="neutral-weak">
          Need access? Ask your Dynamic Capital admin lead to provision TON
          multisig credentials or a session token. Every chat session is logged
          for compliance and automation guardrails.
        </Text>
      </Card>
    </Column>
  </Card>
);

export function DynamicChatLanding() {
  return (
    <ToolWorkspaceLayout
      routeId="dynamic-chat-hub"
      commandBar={<DynamicCommandBar />}
      contentClassName="pb-24"
    >
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Column
          gap="20"
          className="rounded-[32px] border border-border/50 bg-background/85 p-4 shadow-xl shadow-primary/10 backdrop-blur"
        >
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-background/90 p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(110,80,255,0.18),transparent_70%)]" />
            <div className="relative z-10 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    Dynamic chat control center
                  </p>
                  <h3 className="text-2xl font-semibold sm:text-3xl">
                    Coordinate copilots, signals, and oversight
                  </h3>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <span
                    className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary"
                    aria-hidden
                  />
                  Live sync
                </div>
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                Operate the Dynamic Capital command center without leaving the
                workspace. Automation routes, compliance guardrails, and
                human-in-the-loop approvals stay aligned with every chat
                session.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {SESSION_SUMMARY.map((item) => (
                  <div
                    key={item.label}
                    className="group relative overflow-hidden rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
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
                        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground/80">
                          {item.label}
                        </p>
                        <p className="text-base font-semibold text-foreground">
                          {item.metric}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[28px] border border-border/60 bg-background/90 p-1 shadow-xl shadow-primary/15">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(110,80,255,0.2),transparent_75%)]" />
            <div className="relative z-10 h-full rounded-[26px] bg-background/95 p-3 sm:p-4 lg:p-6">
              <AdminGate fallback={CHAT_FALLBACK}>
                <DynamicChat />
              </AdminGate>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {WORKFLOW_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group relative flex items-start justify-between gap-4 rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <action.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {action.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </div>
                <ArrowUpRight
                  className="mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        </Column>
        <Column gap="20">
          <Card
            padding="24"
            radius="xl"
            gap="20"
            className="border border-neutral-alpha-medium/70 shadow-lg shadow-primary/10"
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
                <Heading variant="heading-strong-s">
                  Live market intelligence
                </Heading>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Market reviews, currency strength, and automation alerts
                  update here so you can act without leaving the chat workspace.
                </Text>
              </Column>
              <SignalsWidget />
            </Column>
          </Card>
          <Card
            gap="0"
            radius="xl"
            className="overflow-hidden border border-neutral-alpha-medium shadow-lg shadow-primary/10"
          >
            <DynamicMarketReview />
          </Card>
        </Column>
      </div>
    </ToolWorkspaceLayout>
  );
}

export default DynamicChatLanding;
