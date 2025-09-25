import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Bot, FileText, Shield, Users } from "@/lib/lucide";
import { motion } from "framer-motion";
import { dynamicMotionVariants } from "@/lib/motion-variants";

interface QuickActionsProps {
  onRefreshStats?: () => void;
  onCheckStatus?: () => void;
}

export const QuickActions = (
  { onRefreshStats, onCheckStatus }: QuickActionsProps,
) => {
  const actions = [
    {
      icon: FileText,
      label: "Admin Panel",
      action: () => window.open("/admin", "_blank"),
      variant: "outline" as const,
    },
    {
      icon: Shield,
      label: "Check Status",
      action: onCheckStatus,
      variant: "outline" as const,
    },
    {
      icon: Activity,
      label: "Refresh Stats",
      action: onRefreshStats,
      variant: "outline" as const,
    },
    {
      icon: Bot,
      label: "Bot Controls",
      action: () => window.open("/bot-controls", "_blank"),
      variant: "outline" as const,
    },
    {
      icon: Users,
      label: "User Management",
      action: () => {},
      variant: "outline" as const,
    },
  ];

  return (
    <motion.div
      variants={dynamicMotionVariants.stack}
      initial="hidden"
      animate="visible"
    >
      <Card className="p-6 bg-gradient-card border-0 shadow-telegram">
        <motion.h3
          className="text-lg font-semibold mb-4 flex items-center gap-2"
          variants={dynamicMotionVariants.stackItem}
        >
          <Activity className="w-5 h-5 text-telegram" />
          Quick Actions
        </motion.h3>
        <motion.div
          className="flex flex-wrap gap-3"
          variants={dynamicMotionVariants.stack}
        >
          {actions.map((action, index) => (
            <motion.div key={index} variants={dynamicMotionVariants.stackItem}>
              <motion.div
                variants={dynamicMotionVariants.button}
                whileHover="hover"
                whileTap="tap"
              >
                <Button
                  variant={action.variant}
                  size="sm"
                  className="gap-2"
                  onClick={action.action}
                >
                  <action.icon className="w-4 h-4" />
                  {action.label}
                </Button>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </Card>
    </motion.div>
  );
};
