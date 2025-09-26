import React from "react";
import { motion } from "framer-motion";
import { BarChart3, CreditCard, Home, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { TouchFeedback } from "@/components/ui/mobile-gestures";

interface MobileNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "home", icon: Home, label: "Home" },
  { id: "plans", icon: CreditCard, label: "Plans" },
  { id: "analytics", icon: BarChart3, label: "Stats" },
  { id: "support", icon: MessageCircle, label: "Support" },
  { id: "profile", icon: User, label: "Profile" },
];

export const MobileNavigation: React.FC<MobileNavigationProps> = (
  { activeTab, onTabChange },
) => {
  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 safe-area-pb"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <TouchFeedback
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex-1 flex flex-col items-center py-2 px-1"
            >
              <motion.div
                className={cn(
                  "relative flex flex-col items-center transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
                whileTap={{ scale: 0.9 }}
                animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -top-1 w-8 h-0.5 bg-primary rounded-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}

                {/* Icon with glow effect for active tab */}
                <div className="relative">
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 bg-primary/20 rounded-full blur-sm"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1.5, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </div>

                {/* Label */}
                <motion.span
                  className={cn(
                    "text-xs font-medium mt-1 transition-colors duration-200",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                  animate={isActive ? { scale: 1 } : { scale: 0.9 }}
                >
                  {tab.label}
                </motion.span>
              </motion.div>
            </TouchFeedback>
          );
        })}
      </div>
    </motion.nav>
  );
};
