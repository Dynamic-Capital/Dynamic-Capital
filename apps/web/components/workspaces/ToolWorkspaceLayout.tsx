"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

import {
  Column,
  Heading,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import type { TagProps } from "@/components/dynamic-ui-system/internal/components/Tag";
import { Button as DynamicButton } from "@/components/dynamic-ui-system";
import {
  getRouteById,
  getWorkspaceMeta,
  ROUTE_CATEGORY_STYLES,
  type RouteId,
  type WorkspaceAction,
  type WorkspaceMeta,
} from "@/config/route-registry";
import { cn } from "@/utils";
import { LastMoveTicker } from "@/components/navigation/LastMoveTicker";
import { dynamicBranding } from "@/resources";

interface ToolWorkspaceLayoutProps {
  routeId: RouteId;
  children: ReactNode;
  commandBar?: ReactNode;
  className?: string;
  contentClassName?: string;
  showLastMove?: boolean;
}

type WorkspaceTagTone = NonNullable<WorkspaceMeta["tags"]>[number]["tone"];

const TAG_TONE_PROPS: Record<
  NonNullable<WorkspaceTagTone>,
  { background: TagProps["background"]; border: TagProps["border"] }
> = {
  brand: {
    background: "brand-alpha-weak",
    border: "brand-alpha-medium",
  },
  accent: {
    background: "accent-alpha-weak",
    border: "accent-alpha-medium",
  },
  neutral: {
    background: "neutral-alpha-weak",
    border: "neutral-alpha-medium",
  },
  success: {
    background: "success-alpha-weak",
    border: "success-alpha-medium",
  },
  warning: {
    background: "warning-alpha-weak",
    border: "warning-alpha-medium",
  },
};

const DEFAULT_TAG_BACKGROUND = "neutral-alpha-weak" as TagProps["background"];
const DEFAULT_TAG_BORDER = "neutral-alpha-medium" as TagProps["border"];

type LayoutTag = {
  label: string;
  tone?: WorkspaceTagTone;
};

function resolveActionVariant(
  emphasis: WorkspaceAction["emphasis"],
): "primary" | "secondary" | "tertiary" {
  switch (emphasis) {
    case "primary":
      return "primary";
    case "ghost":
      return "tertiary";
    default:
      return "secondary";
  }
}

function renderHeroTags(tags: WorkspaceMeta["tags"], fallbackTags: string[]) {
  const content: LayoutTag[] = tags
    ? tags.map((tag) => ({ label: tag.label, tone: tag.tone }))
    : fallbackTags.map((label) => ({ label }));

  if (!content.length) {
    return null;
  }

  return (
    <Row gap="8" wrap horizontal="center">
      {content.map((tag) => {
        const toneProps = tag.tone ? TAG_TONE_PROPS[tag.tone] : undefined;
        return (
          <Tag
            key={tag.label}
            size="s"
            background={toneProps?.background ?? DEFAULT_TAG_BACKGROUND}
            border={toneProps?.border ?? DEFAULT_TAG_BORDER}
          >
            {tag.label}
          </Tag>
        );
      })}
    </Row>
  );
}

function renderHeroActions(actions: WorkspaceMeta["actions"]) {
  if (!actions?.length) {
    return null;
  }

  return (
    <Row gap="12" wrap horizontal="center">
      {actions.map((action) => (
        <DynamicButton
          key={action.href}
          size="s"
          variant={resolveActionVariant(action.emphasis)}
          href={action.href}
        >
          <span className="flex items-center gap-2">
            {action.icon
              ? <action.icon className="h-4 w-4" aria-hidden />
              : null}
            <span>{action.label}</span>
          </span>
        </DynamicButton>
      ))}
    </Row>
  );
}

export function ToolWorkspaceLayout({
  routeId,
  children,
  commandBar,
  className,
  contentClassName,
  showLastMove = true,
}: ToolWorkspaceLayoutProps) {
  const route = getRouteById(routeId);
  const meta = getWorkspaceMeta(routeId);
  const categoryStyle = route
    ? ROUTE_CATEGORY_STYLES[route.categoryId]
    : undefined;

  const heroGradient = categoryStyle?.heroGradient ??
    dynamicBranding.gradients.hero;
  const heroShadow = categoryStyle?.heroShadow ??
    "0 36px 120px hsl(var(--primary) / 0.18)";

  const heroTitle = meta?.title ?? route?.label ?? "Dynamic workspace";
  const heroDescription = meta?.description ?? route?.description ??
    "Operate your Dynamic Capital workspace.";
  const heroEyebrow = meta?.eyebrow ?? route?.hint?.title ?? "Workspace";
  const fallbackTags = route?.tags ?? [];

  return (
    <section
      className={cn(
        "w-full flex flex-col items-center gap-16",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={routeId}
            className="flex w-full flex-col items-center text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div
              className="relative flex w-full flex-col items-center overflow-hidden rounded-[2.5rem] border border-border/60 bg-background/85 p-10 text-center shadow-xl backdrop-blur lg:p-14"
              style={{ boxShadow: heroShadow }}
              data-route-category={route?.categoryId ?? "workspace"}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-55 mix-blend-plus-lighter"
                style={{ backgroundImage: heroGradient }}
                aria-hidden
              />
              <div className="relative z-10 flex w-full flex-col items-center gap-12">
                <Column gap="20" paddingY="32" horizontal="center">
                  <Column gap="12" maxWidth={72} horizontal="center">
                    <Text
                      as="span"
                      variant="label-default-s"
                      className="uppercase tracking-[0.28em] text-xs text-muted-foreground"
                      align="center"
                    >
                      {heroEyebrow}
                    </Text>
                    <Heading variant="display-strong-s" align="center">
                      {heroTitle}
                    </Heading>
                    <Text
                      variant="body-default-m"
                      onBackground="neutral-weak"
                      align="center"
                      wrap="balance"
                    >
                      {heroDescription}
                    </Text>
                    {renderHeroTags(meta?.tags, fallbackTags)}
                  </Column>
                  {renderHeroActions(meta?.actions)}
                </Column>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      {commandBar || showLastMove
        ? (
          <div className="mx-auto w-full max-w-6xl px-4 pb-6 text-center">
            <Column
              gap="16"
              horizontal="center"
              className="w-full text-left sm:text-center"
            >
              {commandBar ?? null}
              {showLastMove ? <LastMoveTicker /> : null}
            </Column>
          </div>
        )
        : null}
      <div
        className={cn(
          "mx-auto w-full max-w-6xl px-4 pb-16 space-y-16",
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

export default ToolWorkspaceLayout;
