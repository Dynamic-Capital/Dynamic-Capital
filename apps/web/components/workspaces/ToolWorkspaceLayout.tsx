"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import {
  Column,
  Heading,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import type { TagProps } from "@/components/dynamic-ui-system/internal/components/Tag";
import { Button } from "@/components/ui/button";
import {
  getRouteById,
  getWorkspaceMeta,
  type RouteId,
  type WorkspaceAction,
  type WorkspaceMeta,
} from "@/config/route-registry";
import { cn } from "@/utils";

interface ToolWorkspaceLayoutProps {
  routeId: RouteId;
  children: ReactNode;
  commandBar?: ReactNode;
  className?: string;
  contentClassName?: string;
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

function resolveActionVariant(emphasis: WorkspaceAction["emphasis"]):
  | "default"
  | "secondary"
  | "ghost" {
  switch (emphasis) {
    case "primary":
      return "default";
    case "ghost":
      return "ghost";
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
    <Row gap="8" wrap>
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
    <Row gap="12" wrap>
      {actions.map((action) => (
        <Button
          key={action.href}
          asChild
          size="sm"
          variant={resolveActionVariant(action.emphasis)}
          className="gap-2"
        >
          <Link href={action.href}>
            {action.icon
              ? <action.icon className="h-4 w-4" aria-hidden />
              : null}
            {action.label}
          </Link>
        </Button>
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
}: ToolWorkspaceLayoutProps) {
  const route = getRouteById(routeId);
  const meta = getWorkspaceMeta(routeId);

  const heroTitle = meta?.title ?? route?.label ?? "Dynamic workspace";
  const heroDescription = meta?.description ?? route?.description ??
    "Operate your Dynamic Capital workspace.";
  const heroEyebrow = meta?.eyebrow ?? route?.hint?.title ?? "Workspace";
  const fallbackTags = route?.tags ?? [];

  return (
    <section className={cn("w-full", className)}>
      <div className="mx-auto w-full max-w-6xl px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={routeId}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <Column gap="20" paddingY="32">
              <Column gap="12" maxWidth={72}>
                <Text
                  as="span"
                  variant="label-default-s"
                  className="uppercase tracking-[0.28em] text-xs text-muted-foreground"
                >
                  {heroEyebrow}
                </Text>
                <Heading variant="display-strong-s">{heroTitle}</Heading>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  {heroDescription}
                </Text>
                {renderHeroTags(meta?.tags, fallbackTags)}
              </Column>
              {renderHeroActions(meta?.actions)}
            </Column>
          </motion.div>
        </AnimatePresence>
      </div>
      {commandBar
        ? <div className="mx-auto w-full max-w-6xl px-4 pb-6">{commandBar}</div>
        : null}
      <div
        className={cn("mx-auto w-full max-w-6xl px-4 pb-16", contentClassName)}
      >
        {children}
      </div>
    </section>
  );
}

export default ToolWorkspaceLayout;
