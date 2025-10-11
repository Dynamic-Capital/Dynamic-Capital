"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Interactive3DCard,
  StaggeredGrid,
} from "@/components/ui/interactive-cards";
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
  openExternalLink: (url: string, message: string) => void;
  navigateWithToast: (path: string, message: string) => void;
  setTabWithHistory: (tab: string, message: string) => void;
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
        "https://t.me/DynamicCapital_Support",
        "Opening support chat...",
      ),
    isExternal: true,
    priority: "high",
  }),
  ({ navigateWithToast }) => ({
    id: "account_access",
    title: "Account & Billing",
    description: "Manage receipts and subscriptions",
    icon: Wallet,
    action: () =>
      navigateWithToast(
        "/miniapp/dynamic-access",
        "Opening account dashboard...",
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
        "https://t.me/DynamicCapital_Community",
        "Opening community...",
      ),
    isExternal: true,
    priority: "medium",
  }),
  ({ isInTelegram }) => ({
    id: "signals",
    title: "Signal Alerts",
    description: "Real-time notifications",
    icon: Zap,
    action: () => {
      toast.info(
        isInTelegram
          ? "Enable notifications in Telegram settings for instant alerts"
          : "Download our Telegram bot for real-time signal alerts",
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
      setTabWithHistory("education", "Navigating to Trading Academy..."),
    priority: "medium",
  }),
  ({ setTabWithHistory }) => ({
    id: "performance",
    title: "Track Performance",
    description: "Monitor your progress",
    icon: TrendingUp,
    action: () =>
      setTabWithHistory("dashboard", "Opening performance tracker..."),
    priority: "medium",
  }),
  ({ openExternalLink }) => ({
    id: "reviews",
    title: "Member Reviews",
    description: "See what others say",
    icon: Star,
    action: () =>
      openExternalLink(
        "https://t.me/DynamicCapital_Reviews",
        "Opening member reviews...",
      ),
    isExternal: true,
    priority: "low",
  }),
];

export function QuickActions() {
  const router = useRouter();
  const [isInTelegram, setIsInTelegram] = useState(false);

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

  const openExternalLink = useCallback((url: string, message: string) => {
    toast.success(message);

    if (typeof window === "undefined") {
      return;
    }

    const webApp = (window as TelegramWindow).Telegram?.WebApp;

    if (url.startsWith("https://t.me/") && webApp?.openTelegramLink) {
      webApp.openTelegramLink(url);
      return;
    }

    if (webApp?.openLink) {
      webApp.openLink(url);
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const navigateWithToast = useCallback(
    (path: string, message: string) => {
      toast.success(message);
      router.push(path);
    },
    [router],
  );

  const setTabWithHistory = useCallback((tab: string, message: string) => {
    toast.success(message);

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
  }, []);

  const quickActionContext = useMemo<QuickActionContext>(
    () => ({
      isInTelegram,
      openExternalLink,
      navigateWithToast,
      setTabWithHistory,
    }),
    [
      isInTelegram,
      navigateWithToast,
      openExternalLink,
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
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99] }}
    >
      <Card className="bg-gradient-to-br from-card/50 to-background border-border/50 relative overflow-hidden">
        {/* Animated background gradient */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/5 via-dc-brand-light/5 to-primary/5"
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

        <CardHeader className="pb-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <CardTitle className="flex items-center gap-2 text-lg">
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.5 }}
              >
                <Zap className="h-5 w-5 text-primary" />
              </motion.div>
              Quick Actions
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Access key features and get support instantly
            </CardDescription>
          </motion.div>
        </CardHeader>

        <CardContent className="relative z-10">
          <StaggeredGrid
            columns={3}
            staggerDelay={0.1}
            className="grid-cols-2 md:grid-cols-3"
          >
            {quickActions.map((action, index) => {
              const Icon = action.icon;

              return (
                <Interactive3DCard
                  key={action.id}
                  intensity={0.08}
                  scale={1.03}
                  glowEffect={action.priority === "high"}
                  magneticEffect={action.priority === "high"}
                  onClick={action.action}
                  className="h-full"
                >
                  <div
                    className={`
                  p-4 text-center relative transition-all duration-300
                  ${getPriorityStyles(action.priority)}
                  rounded-xl border group overflow-hidden h-full flex flex-col justify-center
                `}
                  >
                    <AnimatePresence>
                      {action.isExternal && (
                        <motion.div
                          className="absolute top-2 right-2"
                          initial={{ opacity: 0, scale: 0, rotate: -180 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          exit={{ opacity: 0, scale: 0, rotate: 180 }}
                          transition={{
                            delay: 0.5 + index * 0.1,
                            type: "spring",
                          }}
                        >
                          <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.div
                      className={`mb-3 flex justify-center ${
                        getIconStyles(action.priority)
                      }`}
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
                        className="p-2 rounded-full bg-background/50 group-hover:bg-background/80 transition-colors"
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
                      className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors"
                      initial={{ opacity: 0.8 }}
                      whileHover={{ opacity: 1, scale: 1.05 }}
                    >
                      {action.title}
                    </motion.h4>

                    <motion.p
                      className="text-xs text-muted-foreground group-hover:text-foreground transition-colors"
                      initial={{ opacity: 0.6 }}
                      whileHover={{ opacity: 1 }}
                    >
                      {action.description}
                    </motion.p>

                    {/* Prismatic overlay effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent opacity-0 group-hover:opacity-100"
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
            className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            whileHover={{ scale: 1.02 }}
          >
            <motion.div
              className="flex items-center gap-2 mb-2"
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
              <span className="text-sm font-medium text-foreground">
                Pro Tip
              </span>
            </motion.div>
            <p className="text-xs text-muted-foreground">
              Join our VIP community for exclusive trading signals, market
              analysis, and 24/7 priority support.
            </p>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
