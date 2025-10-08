"use client";

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
      contentClassName="pb-20"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Column
          gap="16"
          className="min-h-[480px] rounded-3xl border border-border/40 bg-background/80 p-4 shadow-lg shadow-primary/10 backdrop-blur"
        >
          <AdminGate fallback={CHAT_FALLBACK}>
            <DynamicChat />
          </AdminGate>
        </Column>
        <Column gap="16">
          <Card
            padding="24"
            radius="xl"
            gap="16"
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
