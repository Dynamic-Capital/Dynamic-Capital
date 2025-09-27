import React from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { InteractiveBackground } from "@/components/shared/InteractiveBackground";
import {
  FloatingActionCard,
  Interactive3DCard,
  LiquidCard,
} from "@/components/ui/interactive-cards";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Clock,
  Crown,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnimatedStatusDisplayProps {
  className?: string;
  isVip?: boolean;
  planName?: string;
  daysRemaining?: number;
  paymentStatus?: string;
  showBackground?: boolean;
}

export function AnimatedStatusDisplay({
  className = "",
  isVip = false,
  planName = "Free",
  daysRemaining,
  paymentStatus = "none",
  showBackground = true,
}: AnimatedStatusDisplayProps) {
  const controls = useAnimationControls();

  const getStatusIcon = () => {
    if (isVip) return <Crown className="h-6 w-6 text-amber-500" />;
    if (paymentStatus === "pending") {
      return <Clock className="h-6 w-6 text-orange-500" />;
    }
    return <Users className="h-6 w-6 text-muted-foreground" />;
  };

  const getStatusColor = () => {
    if (isVip) return "from-amber-500/20 to-orange-500/10";
    if (paymentStatus === "pending") {
      return "from-orange-500/20 to-yellow-500/10";
    }
    return "from-muted/20 to-background";
  };

  const getGlowColor = () => {
    if (isVip) return "hsl(45, 93%, 58%)"; // amber
    if (paymentStatus === "pending") return "hsl(25, 95%, 53%)"; // orange
    return "hsl(var(--muted))";
  };

  React.useEffect(() => {
    if (isVip) {
      controls.start({
        scale: [1, 1.02, 1],
        boxShadow: [
          "0 0 0px hsl(45, 93%, 58% / 0)",
          "0 0 20px hsl(45, 93%, 58% / 0.3)",
          "0 0 0px hsl(45, 93%, 58% / 0)",
        ],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        },
      });
    }
  }, [isVip, controls]);

  return (
    <div className={cn("relative", className)}>
      {showBackground && <InteractiveBackground />}

      <Interactive3DCard
        intensity={0.1}
        scale={1.02}
        glowEffect={isVip}
        className="relative overflow-hidden"
      >
        <motion.div
          className={`bg-gradient-to-br ${getStatusColor()} backdrop-blur-xl border border-border/50 rounded-xl p-6`}
          animate={controls}
        >
          {/* Animated background pattern */}
          <motion.div
            className="absolute inset-0 opacity-5"
            animate={{
              backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                hsl(var(--primary)) 0px,
                transparent 1px,
                transparent 10px,
                hsl(var(--primary)) 11px,
                hsl(var(--primary)) 12px
              )`,
              backgroundSize: "20px 20px",
            }}
          />

          <div className="relative z-10">
            {/* Status Header */}
            <motion.div
              className="flex items-center justify-between mb-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={isVip
                    ? {
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.1, 1],
                    }
                    : undefined}
                  transition={isVip
                    ? {
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
                    : undefined}
                >
                  {getStatusIcon()}
                </motion.div>
                <div>
                  <motion.h3
                    className="font-bold text-lg"
                    whileHover={{ scale: 1.05 }}
                  >
                    {planName}
                  </motion.h3>
                  <motion.p
                    className="text-sm text-muted-foreground"
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 1 }}
                  >
                    {isVip ? "VIP Member" : "Free User"}
                  </motion.p>
                </div>
              </div>

              <AnimatePresence>
                {isVip && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <Star className="h-3 w-3 mr-1" />
                      </motion.div>
                      VIP Active
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Status Metrics */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, staggerChildren: 0.1 }}
            >
              {/* Days Remaining */}
              {daysRemaining !== undefined && (
                <motion.div
                  className="text-center p-3 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50"
                  whileHover={{ scale: 1.05, y: -2 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <motion.div
                    className={`text-2xl font-bold ${
                      daysRemaining < 7 ? "text-orange-500" : "text-green-500"
                    }`}
                    animate={daysRemaining < 7
                      ? {
                        scale: [1, 1.1, 1],
                        color: [
                          "hsl(25, 95%, 53%)",
                          "hsl(0, 84%, 60%)",
                          "hsl(25, 95%, 53%)",
                        ],
                      }
                      : undefined}
                    transition={daysRemaining < 7
                      ? {
                        duration: 2,
                        repeat: Infinity,
                      }
                      : undefined}
                  >
                    {daysRemaining}
                  </motion.div>
                  <p className="text-xs text-muted-foreground">Days Left</p>
                </motion.div>
              )}

              {/* Payment Status */}
              <motion.div
                className="text-center p-3 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50"
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <motion.div
                  className="flex justify-center mb-1"
                  animate={paymentStatus === "pending"
                    ? {
                      rotate: [0, 360],
                    }
                    : undefined}
                  transition={paymentStatus === "pending"
                    ? {
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }
                    : undefined}
                >
                  {paymentStatus === "completed"
                    ? <CheckCircle className="h-6 w-6 text-green-500" />
                    : paymentStatus === "pending"
                    ? <Clock className="h-6 w-6 text-orange-500" />
                    : <Zap className="h-6 w-6 text-muted-foreground" />}
                </motion.div>
                <p className="text-xs text-muted-foreground capitalize">
                  {paymentStatus === "completed"
                    ? "Verified"
                    : paymentStatus === "pending"
                    ? "Pending"
                    : "Inactive"}
                </p>
              </motion.div>

              {/* Performance */}
              <motion.div
                className="text-center p-3 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50 col-span-2 md:col-span-1"
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <motion.div
                  className="flex justify-center mb-1"
                  animate={{
                    y: [-2, 2, -2],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <TrendingUp className="h-6 w-6 text-primary" />
                </motion.div>
                <p className="text-xs text-muted-foreground">Performance</p>
              </motion.div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              className="mt-4 flex gap-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              {!isVip && (
                <motion.button
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm"
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set("tab", "plan");
                    window.history.pushState({}, "", url.toString());
                    window.dispatchEvent(new PopStateEvent("popstate"));
                  }}
                >
                  Upgrade to VIP
                </motion.button>
              )}

              <motion.button
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium text-sm"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("tab", "dashboard");
                  window.history.pushState({}, "", url.toString());
                  window.dispatchEvent(new PopStateEvent("popstate"));
                }}
              >
                View Details
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </Interactive3DCard>
    </div>
  );
}
