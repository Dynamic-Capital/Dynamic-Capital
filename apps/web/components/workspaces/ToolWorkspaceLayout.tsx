"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import {
  Column,
  Heading,
  Line,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import type { TagProps } from "@/components/dynamic-ui-system/internal/components/Tag";
import { Button as DynamicButton } from "@/components/dynamic-ui-system";
import {
  getRouteById,
  getWorkspaceMeta,
  ROUTE_CATEGORY_STYLES,
  type RouteCategoryId,
  type RouteId,
  type WorkspaceAction,
  type WorkspaceMeta,
} from "@/config/route-registry";
import { cn } from "@/utils";
import { LastMoveTicker } from "@/components/navigation/LastMoveTicker";
import { dynamicBranding } from "@/resources";
import { SkipLink, VisuallyHidden } from "@/components/ui/accessibility-utils";
import { type BreadcrumbItem, Breadcrumbs } from "@/components/ui/breadcrumbs";
import type { IconName } from "@/components/ui/icon";

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

const CATEGORY_ICON_MAP: Record<RouteCategoryId, IconName> = {
  foundations: "Layers",
  products: "ShoppingBag",
  insights: "ChartBar",
  operations: "Cog",
  community: "Users",
};

const TOOLS_ICON: IconName = "LayoutGrid";

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

function toTitleCase(value: string) {
  return value
    .split(/[-_]/)
    .map((segment) =>
      segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
    )
    .join(" ");
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
      className="flex flex-wrap items-center gap-2 md:justify-start"
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
    <nav aria-label={ariaLabel} className="w-full">
      <ul className="flex flex-col gap-3">
        {actions.map((action) => (
          <li key={action.href} className="flex">
            <DynamicButton
              size="s"
              variant={resolveActionVariant(action.emphasis)}
              href={action.href}
              className="w-full justify-between"
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

function renderHeroMetadata(
  route: ReturnType<typeof getRouteById>,
  labelId: string,
) {
  if (!route) {
    return null;
  }

  type HeroMetaCard = {
    key: string;
    label: string;
    value: string;
    items?: string[];
  };

  const surfaces = route.surfaces ?? [];
  const tonSignals = route.tonSignals ?? [];

  const cards: HeroMetaCard[] = [];

  if (route.owner) {
    cards.push({
      key: "owner",
      label: "Owner",
      value: route.owner,
    });
  }

  if (surfaces.length) {
    cards.push({
      key: "surfaces",
      label: "Surfaces",
      value: `${surfaces.length} surface${surfaces.length === 1 ? "" : "s"}`,
      items: surfaces,
    });
  }

  if (tonSignals.length) {
    cards.push({
      key: "signals",
      label: "TON signals",
      value: `${tonSignals.length} signal${tonSignals.length === 1 ? "" : "s"}`,
      items: tonSignals,
    });
  }

  if (!cards.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-5" aria-labelledby={labelId}>
      <Text
        as="span"
        id={labelId}
        variant="label-default-s"
        className="uppercase tracking-[0.28em] text-xs text-muted-foreground"
      >
        Workspace context
      </Text>
      <Line background="neutral-alpha-weak" />
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.key}
            className="rounded-2xl border border-white/10 bg-background/75 p-4 shadow-inner shadow-primary/5 backdrop-blur"
          >
            <Text
              as="dt"
              variant="label-default-xs"
              className="uppercase tracking-[0.28em] text-xs text-muted-foreground"
            >
              {card.label}
            </Text>
            <Heading
              as="dd"
              variant="heading-strong-xs"
              className="mt-3 text-foreground"
            >
              {card.value}
            </Heading>
            {card.items?.length
              ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {card.items.map((item) => (
                    <li key={item}>
                      <Tag
                        size="s"
                        background="neutral-alpha-weak"
                        border="neutral-alpha-medium"
                      >
                        {item}
                      </Tag>
                    </li>
                  ))}
                </ul>
              )
              : null}
          </div>
        ))}
      </dl>
    </div>
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
  const heroContextLabelId = `${routeId}-workspace-context`;
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
  const heroBreadcrumbItems: BreadcrumbItem[] = [
    {
      label: "Dynamic tools",
      href: "/tools",
      icon: TOOLS_ICON,
      status: "completed",
    },
  ];

  if (route?.categoryId) {
    heroBreadcrumbItems.push({
      label: categoryStyle?.label ?? toTitleCase(route.categoryId),
      icon: CATEGORY_ICON_MAP[route.categoryId],
      status: "completed",
    });
  }

  heroBreadcrumbItems.push({
    label: heroTitle,
    status: "current",
  });

  const heroIcon = route?.icon
    ? (
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-background/70 shadow-inner shadow-primary/10"
        aria-hidden
      >
        <route.icon className="h-4 w-4 text-primary" aria-hidden />
      </span>
    )
    : null;
  const heroTagsContent = renderHeroTags(
    meta?.tags,
    fallbackTags,
    heroTagsLabel,
  );
  const heroActionsContent = renderHeroActions(meta?.actions, heroActionsLabel);
  const heroHintTitle = route?.hint?.title ?? "Workspace primer";
  const heroHintDescription = route?.hint?.description;
  const heroHintContent = heroHintDescription
    ? (
      <div className="max-w-xl rounded-2xl border border-white/10 bg-background/70 p-4 shadow-inner shadow-primary/5 backdrop-blur">
        <Text
          variant="label-default-s"
          className="mb-2 uppercase tracking-[0.28em] text-xs text-muted-foreground"
        >
          {heroHintTitle}
        </Text>
        <Text
          as="p"
          variant="body-default-s"
          onBackground="neutral-weak"
          align="start"
        >
          {heroHintDescription}
        </Text>
      </div>
    )
    : null;
  const heroMetadataContent = renderHeroMetadata(route, heroContextLabelId);
  const commandMeta = route?.commandBar;
  const commandGroupLabel = commandMeta
    ? toTitleCase(commandMeta.group)
    : undefined;
  const commandMetaIcon = commandMeta?.icon
    ? <commandMeta.icon className="h-4 w-4 text-primary" aria-hidden />
    : null;

  const heroContent = (
    <div
      className="relative w-full overflow-hidden rounded-[2.75rem] border border-border/60 bg-background/90 shadow-xl shadow-primary/15 backdrop-blur"
      style={{ boxShadow: heroShadow }}
      data-route-category={route?.categoryId ?? "workspace"}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-60"
          style={{ backgroundImage: heroGradient }}
          aria-hidden
        />
        <div
          className="absolute -inset-32 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.35),transparent_60%)] opacity-40"
          aria-hidden
        />
      </div>
      {categoryStyle
        ? (
          <span
            className={cn(
              "pointer-events-none absolute right-8 top-8 h-3 w-3 rounded-full shadow-[0_0_0_4px_rgba(15,23,42,0.45)]",
              categoryStyle.indicatorClass,
            )}
            aria-hidden
          />
        )
        : null}
      <header
        id={heroSectionId}
        aria-labelledby={heroHeadingId}
        aria-describedby={heroDescriptionId}
        className="relative z-10 flex flex-col gap-8 p-6 text-left sm:gap-10 sm:p-10 lg:p-14"
      >
        <div className="flex flex-col gap-6 sm:gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-5 sm:space-y-6 lg:max-w-3xl">
            <Breadcrumbs
              items={heroBreadcrumbItems}
              size="compact"
              className="max-w-full text-left"
            />
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.28em] text-muted-foreground">
              {heroIcon}
              <span className="rounded-full border border-white/20 bg-background/70 px-3 py-1">
                {heroEyebrow}
              </span>
              {categoryStyle
                ? (
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.28em]",
                      categoryStyle.badgeClass,
                    )}
                  >
                    {categoryStyle.label}
                  </span>
                )
                : null}
            </div>
            <div className="space-y-4">
              <Heading
                as="h1"
                id={heroHeadingId}
                variant="display-strong-s"
                align="start"
              >
                {heroTitle}
              </Heading>
              <Text
                as="p"
                id={heroDescriptionId}
                variant="body-default-m"
                onBackground="neutral-weak"
                align="start"
                wrap="balance"
              >
                {heroDescription}
              </Text>
            </div>
            {heroTagsContent}
            {heroHintContent}
          </div>
          {heroActionsContent
            ? (
              <div className="w-full max-w-md flex-shrink-0 sm:max-w-xs">
                <div className="rounded-3xl border border-white/10 bg-background/70 p-5 shadow-lg shadow-primary/10 backdrop-blur">
                  <Text
                    variant="label-default-s"
                    className="mb-2 uppercase tracking-[0.28em] text-xs text-muted-foreground"
                  >
                    Quick actions
                  </Text>
                  {heroActionsContent}
                </div>
              </div>
            )
            : null}
        </div>
        {heroMetadataContent}
      </header>
    </div>
  );

  const showCommandRail = Boolean(commandBar) || showLastMove;

  return (
    <section
      aria-labelledby={heroHeadingId}
      aria-describedby={heroDescriptionId}
      className={cn(
        "w-full flex flex-col items-center gap-12 sm:gap-16 lg:gap-20",
        className,
      )}
    >
      <SkipLink href={`#${mainRegionId}`}>{skipLinkLabel}</SkipLink>
      <div
        className={cn(
          workspaceShellClassName,
          "flex flex-col items-center",
        )}
      >
        {reduceMotion
          ? (
            <div className="flex w-full flex-col items-center">
              {heroContent}
            </div>
          )
          : (
            <AnimatePresence mode="wait">
              <motion.div
                key={routeId}
                className="flex w-full flex-col items-center"
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
            className={cn(workspaceShellClassName, "pb-6")}
            aria-labelledby={utilitiesLabelId}
          >
            <VisuallyHidden id={utilitiesLabelId}>
              {utilitiesLabel}
            </VisuallyHidden>
            <div className="relative overflow-hidden rounded-[2.25rem] border border-border/60 bg-background/80 p-4 shadow-xl shadow-primary/10 backdrop-blur sm:p-6">
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-primary/10 opacity-60"
                aria-hidden
              />
              <Column
                gap="16"
                className="relative z-10 w-full text-left"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Text
                    variant="label-default-s"
                    className="uppercase tracking-[0.28em] text-xs text-muted-foreground"
                  >
                    {utilitiesLabel}
                  </Text>
                  <div className="flex flex-wrap items-center gap-2">
                    {commandGroupLabel
                      ? (
                        <Tag
                          size="s"
                          background="neutral-alpha-weak"
                          border="neutral-alpha-medium"
                        >
                          {commandGroupLabel}
                        </Tag>
                      )
                      : null}
                    {route?.surfaces?.length
                      ? (
                        <Tag
                          size="s"
                          background="neutral-alpha-weak"
                          border="neutral-alpha-medium"
                        >
                          {route.surfaces.length} surfaces
                        </Tag>
                      )
                      : null}
                  </div>
                </div>
                {commandBar
                  ? (
                    <div className="rounded-2xl border border-white/10 bg-background/70 p-4 shadow-inner shadow-primary/5">
                      <div className="mb-3 flex items-center gap-2 text-left">
                        {commandMetaIcon}
                        <Text
                          as="span"
                          variant="body-default-xs"
                          onBackground="neutral-weak"
                          className="font-medium"
                        >
                          {commandMeta?.ctaLabel ?? "Workspace commands"}
                        </Text>
                      </div>
                      {commandBar}
                    </div>
                  )
                  : null}
                {showLastMove ? <LastMoveTicker className="w-full" /> : null}
              </Column>
            </div>
          </aside>
        )
        : null}
      <main
        id={mainRegionId}
        aria-labelledby={heroHeadingId}
        className={cn(
          workspaceShellClassName,
          "pb-12 space-y-12 sm:pb-16 sm:space-y-16 lg:space-y-20",
          contentClassName,
        )}
      >
        {children}
      </main>
    </section>
  );
}

export default ToolWorkspaceLayout;
