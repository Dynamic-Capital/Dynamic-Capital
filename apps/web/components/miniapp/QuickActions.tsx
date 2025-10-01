"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import {
  Interactive3DCard,
  MagneticCard,
  RippleCard,
  StaggeredGrid,
} from "@/components/ui/interactive-cards";
import {
  Bell,
  BookOpen,
  ExternalLink,
  Headphones,
  MessageSquare,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import { toast } from "sonner";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  isExternal?: boolean;
  priority?: "high" | "medium" | "low";
}

export function QuickActions() {
  const isInTelegram = typeof window !== "undefined" && window.Telegram?.WebApp;

  const quickActions: QuickAction[] = [
    {
      id: "contact",
      title: "Contact Support",
      description: "Get help from our team",
      icon: <MessageSquare className="h-5 w-5" />,
      action: () => {
        window.open("https://t.me/DynamicCapital_Support", "_blank");
        toast.success("Opening support chat...");
      },
      isExternal: true,
      priority: "high",
    },
    {
      id: "vip_support",
      title: "VIP Support",
      description: "Priority assistance",
      icon: <Headphones className="h-5 w-5" />,
      action: () => {
        window.open("https://t.me/DynamicCapital_Support", "_blank");
        toast.success("Opening VIP support...");
      },
      isExternal: true,
      priority: "high",
    },
    {
      id: "community",
      title: "Join Community",
      description: "Connect with traders",
      icon: <Users className="h-5 w-5" />,
      action: () => {
        window.open("https://t.me/DynamicCapital_Community", "_blank");
        toast.success("Opening community...");
      },
      isExternal: true,
      priority: "medium",
    },
    {
      id: "signals",
      title: "Signal Alerts",
      description: "Real-time notifications",
      icon: <Zap className="h-5 w-5" />,
      action: () => {
        if (isInTelegram) {
          toast.info(
            "Enable notifications in Telegram settings for instant alerts",
          );
        } else {
          toast.info("Download our Telegram bot for real-time signal alerts");
        }
      },
      priority: "high",
    },
    {
      id: "education",
      title: "Trading Academy",
      description: "Learn & improve skills",
      icon: <BookOpen className="h-5 w-5" />,
      action: () => {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", "education");
        window.history.pushState({}, "", url.toString());
        window.dispatchEvent(new PopStateEvent("popstate"));
        toast.success("Navigating to Trading Academy...");
      },
      priority: "medium",
    },
    {
      id: "performance",
      title: "Track Performance",
      description: "Monitor your progress",
      icon: <TrendingUp className="h-5 w-5" />,
      action: () => {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", "dashboard");
        window.history.pushState({}, "", url.toString());
        window.dispatchEvent(new PopStateEvent("popstate"));
        toast.success("Opening performance tracker...");
      },
      priority: "medium",
    },
    {
      id: "reviews",
      title: "Member Reviews",
      description: "See what others say",
      icon: <Star className="h-5 w-5" />,
      action: () => {
        window.open("https://t.me/DynamicCapital_Reviews", "_blank");
        toast.success("Opening member reviews...");
      },
      isExternal: true,
      priority: "low",
    },
  ];

  const getPriorityStyles = (priority: string = "medium") => {
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

  const getIconStyles = (priority: string = "medium") => {
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
            {quickActions.map((action, index) => (
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
                      {action.icon}
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
            ))}
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
