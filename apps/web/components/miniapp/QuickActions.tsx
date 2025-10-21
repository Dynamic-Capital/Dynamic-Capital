"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Interactive3DCard,
  StaggeredGrid,
} from "@/components/ui/interactive-cards";
import { cn } from "@/utils";
import {
  BookOpen,
  ExternalLink,
  type LucideIcon,
  MessageSquare,
  Star,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

type QuickActionPriority = "high" | "medium" | "low";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  action: () => void;
  isExternal?: boolean;
  priority?: QuickActionPriority;
}

interface QuickActionContext {
  isInTelegram: boolean;
  openExternalLink: (
    actionId: string,
    url: string,
    message: string,
    priority?: QuickActionPriority,
  ) => void;
  navigateWithStatus: (
    actionId: string,
    path: string,
    message: string,
    priority?: QuickActionPriority,
  ) => void;
  setTabWithHistory: (
    actionId: string,
    tab: string,
    message: string,
    priority?: QuickActionPriority,
  ) => void;
  provideInlineFeedback: (
    actionId: string,
    message: string,
    priority?: QuickActionPriority,
  ) => void;
}

type QuickActionFactory = (context: QuickActionContext) => QuickAction;

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: {
      openLink?: (url: string) => void;
      openTelegramLink?: (url: string) => void;
    };
  };
};

const QUICK_ACTION_FACTORIES: QuickActionFactory[] = [
  ({ openExternalLink }) => ({
    id: "contact",
    title: "Contact Support",
    description: "Get help from our team",
    icon: MessageSquare,
    action: () =>
      openExternalLink(
        "contact",
        "https://t.me/DynamicCapital_Support",
        "Opening support chat...",
        "high",
      ),
    isExternal: true,
    priority: "high",
  }),
  ({ navigateWithStatus }) => ({
    id: "account_access",
    title: "Account & Billing",
    description: "Manage receipts and subscriptions",
    icon: Wallet,
    action: () =>
      navigateWithStatus(
        "account_access",
        "/miniapp/dynamic-access",
        "Opening account dashboard...",
        "high",
      ),
    priority: "high",
  }),
  ({ openExternalLink }) => ({
    id: "community",
    title: "Join Community",
    description: "Connect with traders",
    icon: Users,
    action: () =>
      openExternalLink(
        "community",
        "https://t.me/DynamicCapital_Community",
        "Opening community...",
        "medium",
      ),
    isExternal: true,
    priority: "medium",
  }),
  ({ isInTelegram, provideInlineFeedback }) => ({
    id: "signals",
    title: "Signal Alerts",
    description: "Real-time notifications",
    icon: Zap,
    action: () => {
      provideInlineFeedback(
        "signals",
        isInTelegram
          ? "Enable notifications in Telegram settings for instant alerts"
          : "Download our Telegram bot for real-time signal alerts",
        "high",
      );
    },
    priority: "high",
  }),
  ({ setTabWithHistory }) => ({
    id: "education",
    title: "Trading Academy",
    description: "Learn & improve skills",
    icon: BookOpen,
    action: () =>
      setTabWithHistory(
        "education",
        "education",
        "Navigating to Trading Academy...",
        "medium",
      ),
    priority: "medium",
  }),
  ({ setTabWithHistory }) => ({
    id: "performance",
    title: "Track Performance",
    description: "Monitor your progress",
    icon: TrendingUp,
    action: () =>
      setTabWithHistory(
        "performance",
        "dashboard",
        "Opening performance tracker...",
        "medium",
      ),
    priority: "medium",
  }),
  ({ openExternalLink }) => ({
    id: "reviews",
    title: "Member Reviews",
    description: "See what others say",
    icon: Star,
    action: () =>
      openExternalLink(
        "reviews",
        "https://t.me/DynamicCapital_Reviews",
        "Opening member reviews...",
        "low",
      ),
    isExternal: true,
    priority: "low",
  }),
];

export function QuickActions() {
  const router = useRouter();
  const [isInTelegram, setIsInTelegram] = useState(false);
  const [inlineStatuses, setInlineStatuses] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const detectTelegramPresence = () => {
      const webApp = (window as TelegramWindow).Telegram?.WebApp;
      setIsInTelegram(Boolean(webApp));
    };

    detectTelegramPresence();

    window.addEventListener("focus", detectTelegramPresence);

    return () => {
      window.removeEventListener("focus", detectTelegramPresence);
    };
  }, []);

  const updateInlineStatus = useCallback(
    (actionId: string, message: string, priority: QuickActionPriority) => {
      if (priority !== "high") {
        return;
      }

      setInlineStatuses((previous) => ({
        ...previous,
        [actionId]: message,
      }));
    },
    [],
  );

  const provideInlineFeedback = useCallback(
    (
      actionId: string,
      message: string,
      priority: QuickActionPriority = "medium",
    ) => {
      updateInlineStatus(actionId, message, priority);
    },
    [updateInlineStatus],
  );

  const openExternalLink = useCallback(
    (
      actionId: string,
      url: string,
      message: string,
      priority: QuickActionPriority = "medium",
    ) => {
      updateInlineStatus(actionId, message, priority);

      if (typeof window === "undefined") {
        return;
      }

      const webApp = (window as TelegramWindow).Telegram?.WebApp;
      const shouldShowToast = priority === "high" && Boolean(webApp);

      if (url.startsWith("https://t.me/") && webApp?.openTelegramLink) {
        if (shouldShowToast) {
          toast.info(message);
        }
        webApp.openTelegramLink(url);
        return;
      }

      if (webApp?.openLink) {
        if (shouldShowToast) {
          toast.info(message);
        }
        webApp.openLink(url);
        return;
      }

      window.open(url, "_blank", "noopener,noreferrer");
    },
    [updateInlineStatus],
  );

  const navigateWithStatus = useCallback(
    (
      actionId: string,
      path: string,
      message: string,
      priority: QuickActionPriority = "medium",
    ) => {
      updateInlineStatus(actionId, message, priority);
      router.push(path);
    },
    [router, updateInlineStatus],
  );

  const setTabWithHistory = useCallback(
    (
      actionId: string,
      tab: string,
      message: string,
      priority: QuickActionPriority = "medium",
    ) => {
      updateInlineStatus(actionId, message, priority);

      if (typeof window === "undefined") {
        return;
      }

      try {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", tab);

        if (typeof window.history?.pushState === "function") {
          window.history.pushState({}, "", url.toString());
          const popstateEvent = typeof window.PopStateEvent === "function"
            ? new window.PopStateEvent("popstate")
            : new Event("popstate");
          window.dispatchEvent(popstateEvent);
        } else {
          window.location.assign(url.toString());
        }
      } catch {
        window.location.href = `?tab=${tab}`;
      }
    },
    [],
  );

  const quickActionContext = useMemo<QuickActionContext>(
    () => ({
      isInTelegram,
      openExternalLink,
      navigateWithStatus,
      setTabWithHistory,
      provideInlineFeedback,
    }),
    [
      isInTelegram,
      navigateWithStatus,
      openExternalLink,
      provideInlineFeedback,
      setTabWithHistory,
    ],
  );

  const quickActions: QuickAction[] = useMemo(
    () => QUICK_ACTION_FACTORIES.map((factory) => factory(quickActionContext)),
    [quickActionContext],
  );

  const getPriorityStyles = (
    priority: QuickActionPriority = "medium",
  ) => {
    switch (priority) {
      case "high":
        return "bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30 hover:border-primary/50";
      case "medium":
        return "bg-gradient-to-br from-muted/50 to-background border-border hover:border-primary/30";
      case "low":
        return "bg-gradient-to-br from-muted/30 to-background border-border/50 hover:border-border";
      default:
        return "bg-gradient-to-br from-muted/50 to-background border-border hover:border-primary/30";
    }
  };

  const getIconStyles = (priority: QuickActionPriority = "medium") => {
    switch (priority) {
      case "high":
        return "text-primary";
      case "medium":
        return "text-foreground";
      case "low":
        return "text-muted-foreground";
      default:
        return "text-foreground";
    }
  };

  return (
    <motion.div
      className="relative isolate flex flex-col gap-6"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99] }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-primary/5 via-dc-brand-light/5 to-primary/5"
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          backgroundSize: "200% 200%",
        }}
      />

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center gap-2 text-lg font-semibold">
          <motion.div
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.5 }}
          >
            <Zap className="h-5 w-5 text-primary" />
          </motion.div>
          Quick Actions
        </div>
        <p className="text-sm text-muted-foreground">
          Access key features and get support instantly
        </p>
      </motion.div>

      <StaggeredGrid
        columns={3}
        staggerDelay={0.1}
        className="sm:grid-cols-2 xl:grid-cols-3"
        gapClassName="gap-3 sm:gap-4 lg:gap-5"
      >
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          const inlineStatusMessage = inlineStatuses[action.id];

          return (
            <Interactive3DCard
              key={action.id}
              intensity={0.08}
              scale={1.03}
              glowEffect={action.priority === "high"}
              magneticEffect={action.priority === "high"}
              onClick={action.action}
              className="h-full"
              contentClassName="relative h-full"
            >
              <div
                className={cn(
                  "relative flex h-full flex-col justify-center overflow-hidden rounded-xl border p-4 text-center transition-all duration-300 group touch-target",
                  getPriorityStyles(action.priority),
                )}
              >
                <AnimatePresence>
                  {action.isExternal && (
                    <motion.div
                      className="absolute right-2 top-2"
                      initial={{ opacity: 0, scale: 0, rotate: -180 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0, rotate: 180 }}
                      transition={{
                        delay: 0.5 + index * 0.1,
                        type: "spring",
                      }}
                    >
                      <ExternalLink className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-primary" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div
                  className={cn(
                    "mb-3 flex justify-center",
                    getIconStyles(action.priority),
                  )}
                  whileHover={{
                    scale: 1.2,
                    rotate: action.title === "Signal Alerts"
                      ? 15
                      : action.title === "Track Performance"
                      ? -15
                      : 5,
                  }}
                  transition={{
                    duration: 0.3,
                    type: "spring",
                    stiffness: 400,
                  }}
                >
                  <motion.div
                    className="rounded-full bg-background/50 p-2 transition-colors group-hover:bg-background/80"
                    whileHover={{
                      boxShadow: action.priority === "high"
                        ? "0 0 20px hsl(var(--primary) / 0.3)"
                        : "0 4px 20px rgba(0,0,0,0.1)",
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </motion.div>
                </motion.div>

                <motion.h4
                  className="mb-1 text-sm font-semibold transition-colors group-hover:text-primary"
                  initial={{ opacity: 0.8 }}
                  whileHover={{ opacity: 1, scale: 1.05 }}
                >
                  {action.title}
                </motion.h4>

                <motion.p
                  className="text-xs text-muted-foreground transition-colors group-hover:text-foreground"
                  initial={{ opacity: 0.6 }}
                  whileHover={{ opacity: 1 }}
                >
                  {action.description}
                </motion.p>

                {action.priority === "high" && inlineStatusMessage
                  ? (
                    <motion.p
                      className="mt-2 text-xs text-primary/80"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {inlineStatusMessage}
                    </motion.p>
                  )
                  : null}

                {/* Prismatic overlay effect */}
                <motion.div
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                  initial={false}
                  animate={{ x: "-100%" }}
                  whileHover={{
                    x: "100%",
                    background: action.priority === "high"
                      ? "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.2), transparent)"
                      : "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.1), transparent)",
                  }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                />
              </div>
            </Interactive3DCard>
          );
        })}
      </StaggeredGrid>

      <motion.div
        className="rounded-lg border border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        whileHover={{ scale: 1.02 }}
      >
        <motion.div
          className="mb-2 flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Star className="h-4 w-4 text-primary" />
          </motion.div>
          <span className="text-sm font-medium text-foreground">Pro Tip</span>
        </motion.div>
        <p className="text-xs text-muted-foreground">
          Join our VIP community for exclusive trading signals, market analysis,
          and 24/7 priority support.
        </p>
      </motion.div>
    </motion.div>
  );
}
