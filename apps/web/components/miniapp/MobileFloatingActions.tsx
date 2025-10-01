import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Plus, TrendingUp, X, Zap } from "lucide-react";
import { TouchFeedback } from "@/components/ui/mobile-gestures";
import { cn } from "@/lib/utils";
import logger from "@/utils/logger";

interface FloatingAction {
  id: string;
  icon: React.ElementType;
  label: string;
  color: string;
  action: () => void;
}

interface MobileFloatingActionsProps {
  actions?: FloatingAction[];
}

const defaultActions: FloatingAction[] = [
  {
    id: "chat",
    icon: MessageCircle,
    label: "Quick Support",
    color: "bg-blue-500",
    action: () => logger.log("Support chat"),
  },
  {
    id: "boost",
    icon: Zap,
    label: "Boost Plan",
    color: "bg-yellow-500",
    action: () => logger.log("Boost plan"),
  },
  {
    id: "analytics",
    icon: TrendingUp,
    label: "View Stats",
    color: "bg-green-500",
    action: () => logger.log("View analytics"),
  },
];

export const MobileFloatingActions: React.FC<MobileFloatingActionsProps> = ({
  actions = defaultActions,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 z-40">
      {/* Secondary actions */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col space-y-3 mb-4"
          >
            {actions.map((action, index) => {
              const Icon = action.icon as React.ComponentType<
                { size?: number; className?: string }
              >;
              return (
                <motion.div
                  key={action.id}
                  initial={{ scale: 0, y: 50 }}
                  animate={{
                    scale: 1,
                    y: 0,
                    transition: {
                      delay: index * 0.1,
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                    },
                  }}
                  exit={{
                    scale: 0,
                    y: 50,
                    transition: { delay: (actions.length - index - 1) * 0.05 },
                  }}
                >
                  <TouchFeedback
                    onClick={() => {
                      action.action();
                      setIsOpen(false);
                    }}
                  >
                    <motion.div
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-full shadow-lg",
                        action.color,
                        "text-white",
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Icon size={20} />
                      <span className="text-sm font-medium pr-2">
                        {action.label}
                      </span>
                    </motion.div>
                  </TouchFeedback>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <TouchFeedback onClick={() => setIsOpen(!isOpen)}>
        <motion.div
          className="w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {isOpen
              ? <X size={24} className="text-primary-foreground" />
              : <Plus size={24} className="text-primary-foreground" />}
          </motion.div>
        </motion.div>
      </TouchFeedback>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 -z-10"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
