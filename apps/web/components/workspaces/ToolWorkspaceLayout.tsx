"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Column, Heading, Tag, Text } from "@/components/dynamic-ui-system";
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
import { SkipLink, VisuallyHidden } from "@/components/ui/accessibility-utils";

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

function renderHeroTags(
  tags: WorkspaceMeta["tags"],
  fallbackTags: string[],
  ariaLabel: string,
) {
  const content: LayoutTag[] = tags
    ? tags.map((tag) => ({ label: tag.label, tone: tag.tone }))
    : fallbackTags.map((label) => ({ label }));

  if (!content.length) {
    return null;
  }

  return (
    <ul
      className="flex flex-wrap items-center justify-center gap-2"
      aria-label={ariaLabel}
    >
      {content.map((tag) => {
        const toneProps = tag.tone ? TAG_TONE_PROPS[tag.tone] : undefined;
        return (
          <li key={tag.label} className="inline-flex">
            <Tag
              size="s"
              background={toneProps?.background ?? DEFAULT_TAG_BACKGROUND}
              border={toneProps?.border ?? DEFAULT_TAG_BORDER}
            >
              {tag.label}
            </Tag>
          </li>
        );
      })}
    </ul>
  );
}

function renderHeroActions(
  actions: WorkspaceMeta["actions"],
  ariaLabel: string,
) {
  if (!actions?.length) {
    return null;
  }

  return (
    <nav aria-label={ariaLabel} className="flex justify-center">
      <ul className="flex flex-wrap items-center justify-center gap-3">
        {actions.map((action) => (
          <li key={action.href} className="flex">
            <DynamicButton
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
          </li>
        ))}
      </ul>
    </nav>
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

  const reduceMotion = useReducedMotion();

  const workspaceShellClassName =
    "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";
  const heroHeadingId = `${routeId}-workspace-heading`;
  const heroDescriptionId = `${routeId}-workspace-description`;
  const heroSectionId = `${routeId}-workspace-hero`;
  const mainRegionId = `${routeId}-workspace-main`;
  const utilitiesLabelId = `${routeId}-workspace-utilities`;
  const heroTagsLabel = "Workspace focus areas";
  const heroActionsLabel = "Workspace quick actions";
  const skipLinkLabel = "Skip to workspace content";
  const utilitiesLabel = "Workspace utilities";

  const heroGradient = categoryStyle?.heroGradient ??
    dynamicBranding.gradients.hero;
  const heroShadow = categoryStyle?.heroShadow ??
    "0 36px 120px hsl(var(--primary) / 0.18)";

  const heroTitle = meta?.title ?? route?.label ?? "Dynamic workspace";
  const heroDescription = meta?.description ?? route?.description ??
    "Operate your Dynamic Capital workspace.";
  const heroEyebrow = meta?.eyebrow ?? route?.hint?.title ?? "Workspace";
  const fallbackTags = route?.tags ?? [];

  const heroContent = (
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
        <Column
          as="header"
          id={heroSectionId}
          gap="20"
          paddingY="32"
          horizontal="center"
          aria-labelledby={heroHeadingId}
          aria-describedby={heroDescriptionId}
        >
          <Column gap="12" maxWidth={72} horizontal="center">
            <Text
              as="span"
              variant="label-default-s"
              className="uppercase tracking-[0.28em] text-xs text-muted-foreground"
              align="center"
            >
              {heroEyebrow}
            </Text>
            <Heading
              as="h1"
              id={heroHeadingId}
              variant="display-strong-s"
              align="center"
            >
              {heroTitle}
            </Heading>
            <Text
              as="p"
              id={heroDescriptionId}
              variant="body-default-m"
              onBackground="neutral-weak"
              align="center"
              wrap="balance"
            >
              {heroDescription}
            </Text>
            {renderHeroTags(meta?.tags, fallbackTags, heroTagsLabel)}
          </Column>
          {renderHeroActions(meta?.actions, heroActionsLabel)}
        </Column>
      </div>
    </div>
  );

  const showCommandRail = Boolean(commandBar) || showLastMove;

  return (
    <section
      aria-labelledby={heroHeadingId}
      aria-describedby={heroDescriptionId}
      className={cn(
        "w-full flex flex-col items-center gap-16",
        className,
      )}
    >
      <SkipLink href={`#${mainRegionId}`}>{skipLinkLabel}</SkipLink>
      <div
        className={cn(
          workspaceShellClassName,
          "flex flex-col items-center text-center",
        )}
      >
        {reduceMotion
          ? (
            <div className="flex w-full flex-col items-center text-center">
              {heroContent}
            </div>
          )
          : (
            <AnimatePresence mode="wait">
              <motion.div
                key={routeId}
                className="flex w-full flex-col items-center text-center"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                {heroContent}
              </motion.div>
            </AnimatePresence>
          )}
      </div>
      {showCommandRail
        ? (
          <aside
            className={cn(workspaceShellClassName, "pb-6 text-center")}
            aria-labelledby={utilitiesLabelId}
          >
            <VisuallyHidden id={utilitiesLabelId}>
              {utilitiesLabel}
            </VisuallyHidden>
            <Column
              gap="16"
              horizontal="center"
              className="w-full text-left sm:text-center"
            >
              {commandBar ?? null}
              {showLastMove ? <LastMoveTicker /> : null}
            </Column>
          </aside>
        )
        : null}
      <main
        id={mainRegionId}
        aria-labelledby={heroHeadingId}
        className={cn(
          workspaceShellClassName,
          "pb-16 space-y-16",
          contentClassName,
        )}
      >
        {children}
      </main>
    </section>
  );
}

export default ToolWorkspaceLayout;
