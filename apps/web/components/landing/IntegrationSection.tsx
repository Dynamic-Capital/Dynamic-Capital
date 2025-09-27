"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MotionHoverCard,
  MotionScrollReveal,
  MotionStagger,
} from "@/components/ui/motion-components";
import {
  Activity,
  ArrowRight,
  Bot,
  CandlestickChart,
  Cpu,
  Database,
  ExternalLink,
  Globe,
  LayoutDashboard,
  MessageCircle,
  Shield,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { callEdgeFunction } from "@/config/supabase";

import { InteractiveSectionContainer } from "./InteractiveSectionContainer";

interface IntegrationSectionProps {
  onOpenTelegram?: () => void;
  onViewAccount?: () => void;
  onContactSupport?: () => void;
}

interface IntegrationCardConfig {
  title: string;
  description: string;
  icon: LucideIcon;
  link: string;
  color: string;
  primary?: boolean;
  action?: () => void;
  href?: string;
  buttonLabel?: string;
}

interface FeatureConfig {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface ExecutionOption {
  badge: string;
  title: string;
  description: string;
  highlights: string[];
  footer?: string;
}

interface FlowStep {
  title: string;
  description: string;
  icon: LucideIcon;
}

interface SupabaseTableSummary {
  name: string;
  description: string;
}

interface IntegrationContent {
  badge: string;
  title: string;
  description: string;
  integrations: IntegrationCardConfig[];
  botTitle: string;
  botDescription: string;
  botPrimaryButton: string;
  botSecondaryButton: string;
  featuresTitle: string;
  featuresDescription: string;
  features: FeatureConfig[];
  executionIntroTitle: string;
  executionIntroDescription: string;
  executionOptions: ExecutionOption[];
  flowTitle: string;
  flowDescription: string;
  flow: FlowStep[];
  supabaseTitle: string;
  supabaseDescription: string;
  supabaseTables: SupabaseTableSummary[];
}

const IntegrationSection = ({ onOpenTelegram }: IntegrationSectionProps) => {
  const buildScrollAction = useCallback((id: string) => {
    return () => {
      if (typeof window === "undefined") return;
      const element = document.getElementById(id);
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
  }, []);

  const defaultContent = useMemo<IntegrationContent>(
    () => ({
      badge: "Trading Infrastructure",
      title: "MT5 Execution + Supabase Memory",
      description:
        "The Universal Website is the face of the stack, while Supabase keeps the memory and MetaTrader 5 executes every validated move.",
      integrations: [
        {
          title: "MetaTrader 5 Executor",
          description:
            "Route TradingView alerts into MT5 through the Dynamic Fusion Algo and place trades with any connected broker.",
          icon: Cpu,
          link: "FastAPI bridge or autonomous EA",
          color: "from-[hsl(var(--telegram))] to-[hsl(var(--telegram-dark))]",
          primary: true,
          buttonLabel: "Review Execution Options",
          action: buildScrollAction("mt5-execution"),
        },
        {
          title: "Supabase Control Center",
          description:
            "Signals, trades, treasury updates, and governance logs stream into Supabase for bots, admins, and investors.",
          icon: Database,
          link: "Realtime tables + auth + storage",
          color: "from-[hsl(var(--dc-secondary))] to-[hsl(var(--accent-teal))]",
          buttonLabel: "See Data Model",
          action: buildScrollAction("supabase-memory"),
        },
        {
          title: "Universal Website APIs",
          description:
            "Public webhooks, admin controls, and the Telegram mini app sit on top of Supabase auth and REST APIs.",
          icon: Globe,
          link: "Webhook, admin, and mini app surfaces",
          color: "from-[hsl(var(--dc-accent))] to-[hsl(var(--accent-pink))]",
          buttonLabel: "Follow the Flow",
          action: buildScrollAction("universal-face"),
        },
      ],
      botTitle: "Telegram Bot + Mini App",
      botDescription:
        "Supabase-authenticated Telegram experiences deliver instant trade alerts, treasury snapshots, and governance votes to investors.",
      botPrimaryButton: "Launch Telegram Hub",
      botSecondaryButton: "Open Bot in Telegram",
      featuresTitle: "Why the Universal Website Matters",
      featuresDescription:
        "A single interface connects the AI brain, MT5 execution, and the community so every trade is traceable.",
      features: [
        {
          icon: Activity,
          title: "End-to-End Automation",
          description:
            "TradingView alerts flow into MT5 with millisecond logging while Supabase captures every state change.",
        },
        {
          icon: Shield,
          title: "Transparent Oversight",
          description:
            "Row-level security and realtime feeds give admins, investors, and auditors a shared source of truth.",
        },
        {
          icon: LayoutDashboard,
          title: "Multi-surface Experience",
          description:
            "Telegram bots, admin portals, and investor dashboards all consume the same Supabase APIs.",
        },
      ],
      executionIntroTitle: "How MetaTrader 5 Executes Orders",
      executionIntroDescription:
        "MetaTrader 5 is the hands of the operation. Choose the connector that matches your infrastructure and redundancy requirements.",
      executionOptions: [
        {
          badge: "Option A",
          title: "Python Connector + MetaTrader5 Library",
          description:
            "Run the FastAPI webhook processor on the same host as the MT5 terminal and call the official MetaTrader5 Python package.",
          highlights: [
            "TradingView → /api/tradingview/webhook → Dynamic Fusion Algo → MetaTrader5.order_send().",
            "Ideal when you want AI validation, logging, and execution in a single Python runtime.",
          ],
          footer:
            "Requires a Windows VPS (or Wine) with the MT5 terminal kept online.",
        },
        {
          badge: "Option B",
          title: "Autonomous MQL5 Expert Advisor",
          description:
            "Deploy a lightweight EA that polls Supabase REST/realtime endpoints for new signals and fires trades inside MT5 without waiting on Python services.",
          highlights: [
            "EA checks the /api/signals endpoint or Supabase subscriptions for pending orders.",
            "Best when MetaTrader 5 must keep executing even if the FastAPI server restarts.",
          ],
          footer:
            "Heartbeat updates let Supabase know the EA is healthy before releasing more trades.",
        },
      ],
      flowTitle: "Unified Trading Loop",
      flowDescription:
        "Every alert follows the same transparent journey from signal to community notification.",
      flow: [
        {
          title: "TradingView Alert Captured",
          description:
            "Webhook payloads hit /api/tradingview/webhook where they are normalized and stored in Supabase.",
          icon: CandlestickChart,
        },
        {
          title: "Dynamic Fusion Validation",
          description:
            "The AI brain scores the signal, enforces risk policies, and tags metadata for downstream services.",
          icon: ShieldCheck,
        },
        {
          title: "MetaTrader 5 Execution",
          description:
            "Python connector or MQL5 EA pushes BUY/SELL orders to your preferred broker in MetaTrader 5.",
          icon: Zap,
        },
        {
          title: "Supabase Logging & Treasury",
          description:
            "signals, trades, treasury, and governance tables capture execution results and treasury adjustments in realtime.",
          icon: Database,
        },
        {
          title: "Community Notifications",
          description:
            "Telegram bots and the mini app stream updates using Supabase auth and realtime subscriptions.",
          icon: Users,
        },
      ],
      supabaseTitle: "Supabase Memory & Transparency Layer",
      supabaseDescription:
        "Supabase keeps institutional memory for traders, investors, and governance. Bots, mini apps, and dashboards all read from the same tables.",
      supabaseTables: [
        {
          name: "users",
          description:
            "Investor profiles linked to Telegram IDs, access roles, and subscription states.",
        },
        {
          name: "signals",
          description:
            "Raw TradingView alerts plus AI-processed payloads awaiting execution.",
        },
        {
          name: "trades",
          description:
            "Executed MT5 orders with ticket IDs, fill prices, and P&L tracking.",
        },
        {
          name: "treasury",
          description:
            "Dynamic Capital Treasury burns, rewards, and balance movements for DCT.",
        },
        {
          name: "governance",
          description:
            "Community proposals, votes, and programmable policy actions.",
        },
      ],
    }),
    [buildScrollAction],
  );

  const [content, setContent] = useState<IntegrationContent>(defaultContent);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const { data, error } = await callEdgeFunction("CONTENT_BATCH", {
          method: "POST",
          body: {
            keys: [
              "integration_badge",
              "integration_title",
              "integration_description",
              "integration_card1_title",
              "integration_card1_description",
              "integration_card2_title",
              "integration_card2_description",
              "integration_card3_title",
              "integration_card3_description",
              "integration_bot_title",
              "integration_bot_description",
              "integration_bot_primary_button",
              "integration_bot_secondary_button",
              "integration_features_title",
              "integration_features_description",
              "integration_feature1_title",
              "integration_feature1_description",
              "integration_feature2_title",
              "integration_feature2_description",
              "integration_feature3_title",
              "integration_feature3_description",
            ],
          },
        });

        if (!error && data) {
          const items = (data as any).contents || [];
          const lookup: Record<string, string> = {};
          items.forEach((c: any) => {
            lookup[c.content_key] = c.content_value;
          });

          setContent({
            ...defaultContent,
            badge: lookup.integration_badge ?? defaultContent.badge,
            title: lookup.integration_title ?? defaultContent.title,
            description: lookup.integration_description ??
              defaultContent.description,
            integrations: defaultContent.integrations.map(
              (integration, index) => {
                const titleKey = lookup[`integration_card${index + 1}_title`];
                const descriptionKey =
                  lookup[`integration_card${index + 1}_description`];
                return {
                  ...integration,
                  title: titleKey ?? integration.title,
                  description: descriptionKey ?? integration.description,
                };
              },
            ),
            botTitle: lookup.integration_bot_title ?? defaultContent.botTitle,
            botDescription: lookup.integration_bot_description ??
              defaultContent.botDescription,
            botPrimaryButton: lookup.integration_bot_primary_button ??
              defaultContent.botPrimaryButton,
            botSecondaryButton: lookup.integration_bot_secondary_button ??
              defaultContent.botSecondaryButton,
            featuresTitle: lookup.integration_features_title ??
              defaultContent.featuresTitle,
            featuresDescription: lookup.integration_features_description ??
              defaultContent.featuresDescription,
            features: defaultContent.features.map((feature, index) => ({
              ...feature,
              title: lookup[`integration_feature${index + 1}_title`] ??
                feature.title,
              description:
                lookup[`integration_feature${index + 1}_description`] ??
                  feature.description,
            })),
          });
        } else if (error) {
          console.error("Failed to fetch integration content:", error.message);
        }
      } catch (err) {
        console.error("Failed to fetch integration content:", err);
      }
    };

    fetchContent();
  }, [defaultContent]);

  const handleIntegrationClick = (integration: IntegrationCardConfig) => {
    if (integration.action) {
      integration.action();
      return;
    }

    if (integration.href) {
      if (integration.href.startsWith("#")) {
        const id = integration.href.slice(1);
        const element = document.getElementById(id);
        element?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (typeof window !== "undefined") {
        window.open(integration.href, "_blank", "noopener,noreferrer");
      }
    }
  };

  return (
    <section className="py-20 bg-gradient-to-b from-background via-muted/10 to-background relative">
      <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-r from-[hsl(var(--telegram)/0.1)] to-[hsl(var(--dc-accent)/0.1)] rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-r from-[hsl(var(--primary)/0.1)] to-[hsl(var(--dc-secondary)/0.1)] rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <InteractiveSectionContainer
        className="relative"
        glowColor="rgba(42, 170, 238, 0.22)"
      >
        <MotionScrollReveal>
          <div className="text-center mb-16">
            <Badge className="mb-6 bg-[hsl(var(--telegram)/0.1)] text-[hsl(var(--telegram))] border-[hsl(var(--telegram)/0.3)] text-base sm:text-lg px-5 sm:px-6 py-2">
              <MessageCircle className="w-5 h-5 mr-2" />
              {content.badge}
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 font-poppins text-foreground">
              {content.title}
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto font-inter leading-relaxed">
              {content.description}
            </p>
          </div>
        </MotionScrollReveal>

        <MotionStagger
          staggerDelay={0.2}
          className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 mb-16"
        >
          {content.integrations.map((integration) => (
            <MotionHoverCard
              key={integration.title}
              hoverScale={integration.primary ? 1.08 : 1.05}
              hoverY={-12}
            >
              <Card
                className={`relative overflow-hidden ${
                  integration.primary ? "ring-2 ring-telegram scale-105" : ""
                } hover:shadow-2xl transition-all duration-500 cursor-pointer`}
                onClick={() => handleIntegrationClick(integration)}
              >
                {integration.primary && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-telegram to-telegram-dark text-white text-center py-2 text-sm font-bold">
                    CORE EXECUTION
                  </div>
                )}

                <CardHeader
                  className={`text-center ${
                    integration.primary ? "pt-12" : "pt-8"
                  }`}
                >
                  <div
                    className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-br ${integration.color} rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}
                  >
                    <integration.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold font-poppins">
                    {integration.title}
                  </CardTitle>
                  <p className="text-muted-foreground font-inter text-sm">
                    {integration.description}
                  </p>
                </CardHeader>

                <CardContent className="text-center">
                  <div className="mb-4">
                    <span className="text-sm font-medium text-primary">
                      {integration.link}
                    </span>
                  </div>

                  <Button
                    className={`w-full ${
                      integration.primary
                        ? "bg-telegram hover:bg-telegram/90"
                        : "bg-muted hover:bg-muted/80"
                    } font-semibold`}
                    onClick={() => handleIntegrationClick(integration)}
                  >
                    {integration.buttonLabel ?? "Explore"}
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </MotionHoverCard>
          ))}
        </MotionStagger>

        <MotionScrollReveal>
          <Card
            id="mt5-execution"
            className="bg-gradient-to-r from-telegram/10 via-background to-telegram/10 border-telegram/20 mb-16"
          >
            <CardContent className="p-6 sm:p-8 text-center">
              <div className="max-w-4xl mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-telegram to-telegram-dark rounded-full flex items-center justify-center">
                  <Cpu className="w-10 h-10 text-white" />
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold mb-4 font-poppins">
                  {content.executionIntroTitle}
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground mb-6 font-inter max-w-2xl mx-auto">
                  {content.executionIntroDescription}
                </p>

                <MotionStagger
                  staggerDelay={0.25}
                  className="grid gap-6 md:grid-cols-2 text-left"
                >
                  {content.executionOptions.map((option) => (
                    <MotionHoverCard
                      key={option.title}
                      hoverScale={1.04}
                      hoverY={-6}
                    >
                      <Card className="h-full border border-telegram/30 bg-background/80 backdrop-blur-sm">
                        <CardContent className="p-6 flex flex-col h-full">
                          <div className="flex items-center gap-2 mb-4">
                            <Badge className="bg-telegram/10 text-telegram border-telegram/30">
                              {option.badge}
                            </Badge>
                            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              MT5 HANDS
                            </span>
                          </div>
                          <h4 className="text-xl font-semibold font-poppins mb-3">
                            {option.title}
                          </h4>
                          <p className="text-sm text-muted-foreground font-inter mb-4">
                            {option.description}
                          </p>
                          <ul className="space-y-3 text-sm text-muted-foreground/90 font-inter flex-1">
                            {option.highlights.map((highlight) => (
                              <li
                                key={highlight}
                                className="flex items-start gap-2"
                              >
                                <ArrowRight className="w-4 h-4 mt-1 text-telegram" />
                                <span>{highlight}</span>
                              </li>
                            ))}
                          </ul>
                          {option.footer && (
                            <p className="mt-4 text-xs text-muted-foreground/80">
                              {option.footer}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </MotionHoverCard>
                  ))}
                </MotionStagger>
              </div>
            </CardContent>
          </Card>
        </MotionScrollReveal>

        <MotionScrollReveal>
          <div
            id="universal-face"
            className="text-center mb-12 max-w-3xl mx-auto"
          >
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">
              Unified Workflow
            </Badge>
            <h3 className="text-2xl sm:text-3xl font-bold mb-4 font-poppins text-foreground">
              {content.flowTitle}
            </h3>
            <p className="text-base sm:text-lg text-muted-foreground font-inter">
              {content.flowDescription}
            </p>
          </div>
        </MotionScrollReveal>

        <MotionStagger
          staggerDelay={0.2}
          className="grid gap-6 md:grid-cols-2 xl:grid-cols-5 mb-16"
        >
          {content.flow.map((step, index) => (
            <MotionHoverCard key={step.title} hoverScale={1.05} hoverY={-8}>
              <Card className="h-full border border-primary/20 bg-background/80 backdrop-blur-sm">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-primary">
                      Step {index + 1}
                    </span>
                  </div>
                  <h4 className="text-lg font-semibold font-poppins mb-2">
                    {step.title}
                  </h4>
                  <p className="text-sm text-muted-foreground font-inter">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            </MotionHoverCard>
          ))}
        </MotionStagger>

        <MotionScrollReveal>
          <Card
            id="supabase-memory"
            className="border border-primary/20 bg-gradient-to-r from-primary/5 via-background to-primary/5 mb-16"
          >
            <CardContent className="p-6 sm:p-8">
              <div className="text-center mb-10 max-w-3xl mx-auto">
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">
                  Supabase Memory
                </Badge>
                <h3 className="text-2xl sm:text-3xl font-bold mb-4 font-poppins text-foreground">
                  {content.supabaseTitle}
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground font-inter">
                  {content.supabaseDescription}
                </p>
              </div>

              <MotionStagger
                staggerDelay={0.2}
                className="grid gap-5 md:grid-cols-2"
              >
                {content.supabaseTables.map((table) => (
                  <MotionHoverCard
                    key={table.name}
                    hoverScale={1.03}
                    hoverY={-6}
                  >
                    <Card className="h-full border border-muted/40 bg-background/90">
                      <CardContent className="p-5 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold uppercase tracking-wider text-primary">
                            {table.name}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs uppercase"
                          >
                            Table
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-inter flex-1">
                          {table.description}
                        </p>
                      </CardContent>
                    </Card>
                  </MotionHoverCard>
                ))}
              </MotionStagger>
            </CardContent>
          </Card>
        </MotionScrollReveal>

        <MotionScrollReveal>
          <Card className="bg-gradient-to-r from-telegram/10 via-background to-telegram/10 border-telegram/20 mb-16">
            <CardContent className="p-6 sm:p-8 text-center">
              <div className="max-w-4xl mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-telegram to-telegram-dark rounded-full flex items-center justify-center">
                  <Bot className="w-10 h-10 text-white" />
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold mb-4 font-poppins">
                  {content.botTitle}
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground mb-6 font-inter max-w-2xl mx-auto">
                  {content.botDescription}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-telegram hover:bg-telegram/90 text-white font-semibold"
                    onClick={onOpenTelegram}
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    {content.botPrimaryButton}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto border-telegram text-telegram hover:bg-telegram/10"
                    onClick={() =>
                      window.open(
                        "https://t.me/DynamicCapital_Support",
                        "_blank",
                      )}
                  >
                    {content.botSecondaryButton}
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionScrollReveal>

        <MotionScrollReveal>
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold mb-4 font-poppins text-foreground">
              {content.featuresTitle}
            </h3>
            <p className="text-base sm:text-lg text-muted-foreground font-inter">
              {content.featuresDescription}
            </p>
          </div>
        </MotionScrollReveal>

        <MotionStagger
          staggerDelay={0.3}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {content.features.map((feature) => (
            <MotionHoverCard key={feature.title} hoverScale={1.05} hoverY={-8}>
              <Card className="bot-card group hover:shadow-xl transition-all duration-300 text-center">
                <CardContent className="p-5 sm:p-6">
                  <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-primary to-[hsl(var(--dc-accent))] rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold mb-3 group-hover:text-primary transition-colors font-poppins">
                    {feature.title}
                  </h4>
                  <p className="text-muted-foreground font-inter text-sm sm:text-base">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </MotionHoverCard>
          ))}
        </MotionStagger>
      </InteractiveSectionContainer>
    </section>
  );
};

export default IntegrationSection;
