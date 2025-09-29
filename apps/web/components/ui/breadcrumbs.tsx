import Link from "next/link";

import { cn } from "@/utils";

import { Icon, type IconName } from "./icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

type BreadcrumbStatus = "default" | "current" | "completed";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: IconName;
  status?: BreadcrumbStatus;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  size?: "compact" | "expanded";
  className?: string;
}

const sizeStyles = {
  compact: {
    list: "gap-2",
    pill: "h-9 w-9",
    icon: "sm" as const,
  },
  expanded: {
    list: "gap-3",
    pill: "h-11 w-11",
    icon: "base" as const,
  },
};

const statusStyles: Record<BreadcrumbStatus, string> = {
  default: "border-white/10 bg-slate-950/40 text-muted-foreground",
  current:
    "border-primary/60 bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25",
  completed: "border-emerald-500/40 bg-emerald-500/15 text-emerald-100",
};

const basePillClasses =
  "group relative inline-flex items-center justify-center rounded-full border backdrop-blur supports-[backdrop-filter]:bg-slate-950/60 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/60 focus-visible:ring-offset-slate-950";

export function Breadcrumbs({
  items,
  size = "expanded",
  className,
}: BreadcrumbsProps) {
  const config = sizeStyles[size];

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={300}>
      <nav aria-label="Breadcrumb" className={cn("w-full", className)}>
        <ol className={cn("flex flex-wrap items-center", config.list)}>
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            const status: BreadcrumbStatus = item.status
              ? item.status
              : isLast
              ? "current"
              : "default";
            const isLink = Boolean(item.href) && status !== "current";

            const iconClasses = cn(
              status === "current"
                ? "text-primary-foreground"
                : status === "completed"
                ? "text-emerald-200"
                : "text-primary/70",
              "transition-colors",
            );

            const pillClasses = cn(
              basePillClasses,
              config.pill,
              statusStyles[status],
              isLink ? "hover:bg-slate-950/70" : "cursor-default",
            );

            const interactiveElement = isLink
              ? (
                <Link
                  href={item.href ?? "#"}
                  className={pillClasses}
                  aria-label={item.label}
                >
                  {item.icon
                    ? (
                      <Icon
                        name={item.icon}
                        size={config.icon}
                        className={iconClasses}
                      />
                    )
                    : (
                      <span
                        aria-hidden="true"
                        className="text-sm font-medium text-primary-foreground"
                      >
                        {item.label.charAt(0)}
                      </span>
                    )}
                </Link>
              )
              : (
                <span
                  className={pillClasses}
                  tabIndex={0}
                  role="link"
                  aria-label={item.label}
                  aria-current={status === "current" ? "page" : undefined}
                >
                  {item.icon
                    ? (
                      <Icon
                        name={item.icon}
                        size={config.icon}
                        className={iconClasses}
                      />
                    )
                    : (
                      <span
                        aria-hidden="true"
                        className="text-sm font-medium text-primary-foreground"
                      >
                        {item.label.charAt(0)}
                      </span>
                    )}
                </span>
              );

            return (
              <li key={`${item.label}-${index}`} className="flex items-center">
                <Tooltip>
                  <TooltipTrigger asChild>{interactiveElement}</TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="flex items-center gap-2"
                  >
                    {item.icon
                      ? (
                        <Icon
                          name={item.icon}
                          size={config.icon}
                          className="text-primary"
                        />
                      )
                      : null}
                    <span className="font-medium text-foreground">
                      {item.label}
                    </span>
                  </TooltipContent>
                </Tooltip>

                {!isLast
                  ? (
                    <Icon
                      name="ChevronRight"
                      size={config.icon}
                      className="mx-2 text-muted-foreground/60"
                      aria-hidden="true"
                    />
                  )
                  : null}
              </li>
            );
          })}
        </ol>
      </nav>
    </TooltipProvider>
  );
}
